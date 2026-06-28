import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreatePoDto } from './dto/create-po.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PaySupplierDto } from './dto/pay-supplier.dto';

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class PoService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // PO banao (DRAFT)
  async create(dto: CreatePoDto, user: CurrentUser) {
    // Supplier maujood hai?
    const supplier = await this.tenantPrisma.client.supplier.findFirst({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier nahi mila');
    }

    // Branch maujood hai?
    const branch = await this.tenantPrisma.client.branch.findFirst({
      where: { id: dto.destinationBranchId },
    });
    if (!branch) {
      throw new NotFoundException('Destination branch nahi mila');
    }

    // Saare products maujood hain?
    const productIds = dto.lines.map((l) => l.productId);
    const products = await this.tenantPrisma.client.product.findMany({
      where: { id: { in: productIds } },
    });
    for (const line of dto.lines) {
      if (!products.find((p) => p.id === line.productId)) {
        throw new NotFoundException(`Product ${line.productId} catalog mein nahi mila`);
      }
    }

    // Total cost nikaalo
    let totalCost = 0;
    for (const line of dto.lines) {
      totalCost += line.costPrice * line.quantity;
    }

    // TRANSACTION: PO number + PO + lines
    return this.tenantPrisma.client.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const counter = await tx.counter.upsert({
        where: { tenantId_name: { tenantId: user.tenantId, name: 'po' } } as any,
        update: { value: { increment: 1 } },
        create: { tenantId: user.tenantId, name: 'po', value: 1 } as any,
      });
      const poNumber = `PO-${year}-${String(counter.value).padStart(4, '0')}`;

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: dto.supplierId,
          destinationBranchId: dto.destinationBranchId,
          status: 'DRAFT',
          totalCost,
          amountPaid: 0,
          paymentStatus: 'UNPAID',
          createdById: user.userId,
          note: dto.note ?? null,
        } as any,
      });

      for (const line of dto.lines) {
        await tx.pOLine.create({
          data: {
            poId: po.id,
            productId: line.productId,
            quantity: line.quantity,
            receivedQty: 0,
            costPrice: line.costPrice,
          } as any,
        });
      }

      return this.findOneInTx(tx, po.id);
    });
  }

  // Goods receipt — PO ke against maal receive, stock add (cost ke saath), status update
  async receiveGoods(dto: ReceiveGoodsDto, user: CurrentUser) {
    // 1. PO laao (lines ke saath)
    const po = await this.tenantPrisma.client.purchaseOrder.findFirst({
      where: { id: dto.poId },
      include: { lines: true },
    });
    if (!po) {
      throw new NotFoundException('PO nahi mila');
    }

    // 2. PO SENT ya PARTIALLY_RECEIVED hona chahiye (DRAFT ka maal receive nahi)
    if (po.status !== 'SENT' && po.status !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException(`PO ${po.status} hai, receive nahi ho sakta. Pehle SENT karein.`);
    }

    // 3. Har receive line validate karo
    for (const recvLine of dto.lines) {
      const poLine = po.lines.find((l) => l.id === recvLine.poLineId);
      if (!poLine) {
        throw new BadRequestException(`PO line ${recvLine.poLineId} is PO ka hissa nahi`);
      }

      // Kitne receive ho rahe (serials ki count ya quantity)
      const receivingNow = recvLine.serials?.length ?? recvLine.quantity ?? 0;
      if (receivingNow <= 0) {
        throw new BadRequestException('Har line mein kuch to receive karein (serials ya quantity)');
      }

      // Order se zyada receive nahi (10 order, 12 nahi aa sakte)
      const alreadyReceived = poLine.receivedQty;
      if (alreadyReceived + receivingNow > poLine.quantity) {
        throw new BadRequestException(
          `Order se zyada receive nahi ho sakta. Ordered: ${poLine.quantity}, ` +
          `pehle aaye: ${alreadyReceived}, ab: ${receivingNow}`,
        );
      }

      // Serials duplicate to nahi (idempotency — jaise bulk intake)
      if (recvLine.serials && recvLine.serials.length > 0) {
        const existing = await this.tenantPrisma.client.stockItem.findMany({
          where: { serialNumber: { in: recvLine.serials } },
          select: { serialNumber: true },
        });
        if (existing.length > 0) {
          throw new BadRequestException(
            `Ye serials pehle se stock mein hain: ${existing.map((e) => e.serialNumber).join(', ')}`,
          );
        }
      }
    }

    // 4. TRANSACTION: stock add (cost ke saath) + PO line receivedQty + PO status + audit
    return this.tenantPrisma.client.$transaction(async (tx) => {
      for (const recvLine of dto.lines) {
        const poLine = po.lines.find((l) => l.id === recvLine.poLineId)!;

        if (recvLine.serials && recvLine.serials.length > 0) {
          // Serial wale (laptops) — har serial ka alag stock item
          for (const serial of recvLine.serials) {
            const stockItem = await tx.stockItem.create({
              data: {
                branchId: po.destinationBranchId,
                productId: poLine.productId,
                serialNumber: serial,
                quantity: 1,
                costPrice: poLine.costPrice, // ← cost PO se aaya (finance ke liye)
                status: 'IN_STOCK',
              } as any,
            });
            await tx.stockMovement.create({
              data: {
                branchId: po.destinationBranchId,
                userId: user.userId,
                type: 'INTAKE',
                reason: `Goods receipt PO ${po.poNumber}`,
                stockItemId: stockItem.id,
              } as any,
            });
          }
        } else {
          // Accessory — ek stock item with quantity
          const qty = recvLine.quantity ?? 0;
          const stockItem = await tx.stockItem.create({
            data: {
              branchId: po.destinationBranchId,
              productId: poLine.productId,
              serialNumber: null,
              quantity: qty,
              costPrice: poLine.costPrice,
              status: 'IN_STOCK',
            } as any,
          });
          await tx.stockMovement.create({
            data: {
              branchId: po.destinationBranchId,
              userId: user.userId,
              type: 'INTAKE',
              reason: `Goods receipt PO ${po.poNumber}`,
              stockItemId: stockItem.id,
            } as any,
          });
        }

        // PO line ka receivedQty badhao
        const receivedNow = recvLine.serials?.length ?? recvLine.quantity ?? 0;
        await tx.pOLine.update({
          where: { id: poLine.id },
          data: { receivedQty: poLine.receivedQty + receivedNow } as any,
        });
      }

      // PO status: sab lines poori receive ho gayi = RECEIVED, warna PARTIALLY_RECEIVED
      const updatedLines = await tx.pOLine.findMany({ where: { poId: po.id } });
      const allReceived = updatedLines.every((l) => l.receivedQty >= l.quantity);
      const newStatus = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: newStatus } as any,
      });

      return this.findOneInTx(tx, po.id);
    });
  }

  // Supplier ko payment — PO pe amountPaid badhao, status update
  async paySupplier(dto: PaySupplierDto, user: CurrentUser) {
    const po = await this.tenantPrisma.client.purchaseOrder.findFirst({
      where: { id: dto.poId },
    });
    if (!po) {
      throw new NotFoundException('PO nahi mila');
    }

    const totalCost = Number(po.totalCost);
    const currentPaid = Number(po.amountPaid);
    const currentDue = totalCost - currentPaid;

    if (currentDue <= 0) {
      throw new BadRequestException('Is PO ka poora payment ho chuka hai, kuch baqi nahi');
    }
    if (dto.amount > currentDue + 0.01) {
      throw new BadRequestException(
        `Payment (${dto.amount}) baqi balance (${currentDue}) se zyada nahi ho sakta`,
      );
    }

    const newAmountPaid = currentPaid + dto.amount;
    const newDue = totalCost - newAmountPaid;
    const newPaymentStatus = newDue <= 0.01 ? 'PAID' : 'PARTIAL';

    await this.tenantPrisma.client.purchaseOrder.update({
      where: { id: po.id },
      data: {
        amountPaid: newAmountPaid,
        paymentStatus: newPaymentStatus,
      } as any,
    });

    // Audit (supplier payment ko stock movement mein record — ya alag log)
    await this.tenantPrisma.client.stockMovement.create({
      data: {
        branchId: po.destinationBranchId,
        userId: user.userId,
        type: 'ADJUSTMENT', // payment event (koi stock change nahi)
        reason: `Supplier payment for PO ${po.poNumber}: ${dto.amount} (${dto.method})`,
      } as any,
    });

    return this.findOne(po.id);
  }

  // Ek supplier ke payables — kitna total dena hai
  async supplierPayables(supplierId: string) {
    const supplier = await this.tenantPrisma.client.supplier.findFirst({
      where: { id: supplierId },
      select: { id: true, name: true, contact: true },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier nahi mila');
    }

    // Is supplier ke saare POs (DRAFT chhod kar — wo abhi order nahi hua)
    const pos = await this.tenantPrisma.client.purchaseOrder.findMany({
      where: {
        supplierId,
        status: { in: ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalOrdered = 0;
    let totalPaid = 0;
    let totalDue = 0;

    const orders = pos.map((po) => {
      const cost = Number(po.totalCost);
      const paid = Number(po.amountPaid);
      const due = cost - paid;

      totalOrdered += cost;
      totalPaid += paid;
      totalDue += due;

      return {
        poId: po.id,
        poNumber: po.poNumber,
        date: po.createdAt,
        totalCost: cost,
        paid,
        due,
        paymentStatus: po.paymentStatus,
        status: po.status,
      };
    });

    return {
      supplier,
      summary: {
        totalOrdered,  // kitne ka maal liya
        totalPaid,     // kitna pay kiya
        totalDue,      // kitna dena baqi (payables) ← sabse important
        posCount: pos.length,
      },
      orders,
    };
  }

  // PO ko SENT karo (DRAFT → SENT)
  async send(id: string) {
    const po = await this.getPoOrThrow(id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException(`PO ${po.status} hai, sirf DRAFT ko SENT kar sakte hain`);
    }
    await this.tenantPrisma.client.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' } as any,
    });
    return this.findOne(id);
  }

  // List
  findAll() {
    return this.tenantPrisma.client.purchaseOrder.findMany({
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Ek PO (lines + supplier ke saath)
  async findOne(id: string) {
    const po = await this.tenantPrisma.client.purchaseOrder.findFirst({
      where: { id },
      include: {
        lines: { include: { product: { select: { brand: true, model: true, sku: true } } } },
        supplier: { select: { name: true, contact: true } },
      },
    });
    if (!po) {
      throw new NotFoundException('PO nahi mila');
    }
    return po;
  }

  // Helpers
  private async getPoOrThrow(id: string) {
    const po = await this.tenantPrisma.client.purchaseOrder.findFirst({
      where: { id },
      include: { lines: true },
    });
    if (!po) {
      throw new NotFoundException('PO nahi mila');
    }
    return po;
  }

  private async findOneInTx(tx: any, id: string) {
    return tx.purchaseOrder.findFirst({
      where: { id },
      include: { lines: true },
    });
  }
}