import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { DISCOUNT_LIMITS } from './discount-limits';
import { ReturnSaleDto } from './dto/return-sale.dto';

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class SalesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // Return — original sale immutable, naya return effect: stock RETURNED + sale status update
  async returnSale(dto: ReturnSaleDto, user: CurrentUser) {
    // 1. Original sale laao (lines ke saath)
    const sale = await this.tenantPrisma.client.sale.findFirst({
      where: { id: dto.saleId },
      include: { lines: true },
    });
    if (!sale) {
      throw new NotFoundException('Sale nahi mili');
    }

    // 2. Branch scope: Manager sirf apni branch ki sale return kar sake
    if (user.role !== 'SUPER_ADMIN' && sale.branchId !== user.branchId) {
      throw new BadRequestException(
        'Aap sirf apni branch ki sale return kar sakte hain',
      );
    }

    // 3. Sale already poori return to nahi?
    if (sale.status === 'RETURNED') {
      throw new BadRequestException(
        'Ye sale pehle se poori return ho chuki hai',
      );
    }

    // 4. Validate: jo items return ho rahe hain wo is sale mein the?
    const saleStockItemIds = sale.lines
      .map((l) => l.stockItemId)
      .filter((id): id is string => id !== null);

    for (const itemId of dto.stockItemIds) {
      if (!saleStockItemIds.includes(itemId)) {
        throw new BadRequestException(
          `Item ${itemId} is sale ka hissa nahi tha`,
        );
      }
    }

    // 5. TRANSACTION: stock RETURNED + sale status update + audit
    await this.tenantPrisma.client.$transaction(async (tx) => {
      // (a) Har returned item ka stock RETURNED karo
      for (const itemId of dto.stockItemIds) {
        await tx.stockItem.update({
          where: { id: itemId },
          data: { status: 'RETURNED' } as any,
        });
      }

      // (b) Sale status: poora return hua ya partial?
      // Saare sale items return ho gaye = RETURNED, warna PARTIALLY_RETURNED
      const allReturned = saleStockItemIds.every((id) =>
        dto.stockItemIds.includes(id),
      );
      const newStatus = allReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: newStatus } as any,
      });

      // (c) Audit
      await tx.stockMovement.create({
        data: {
          branchId: sale.branchId,
          userId: user.userId,
          type: 'RETURN',
          reason: `Return for sale ${sale.id}: ${dto.reason}`,
        } as any,
      });
    });

    // Updated sale wapas karo
    return this.findOne(sale.id);
  }

  // Receipt data — sale ki saari details ek taiyaar shape mein (printing frontend pe)
  async getReceipt(id: string) {
    const sale = await this.tenantPrisma.client.sale.findFirst({
      where: { id },
      include: {
        lines: {
          include: {
            stockItem: {
              include: {
                product: {
                  select: { brand: true, model: true, sku: true },
                },
              },
            },
          },
        },
        payments: true,
        branch: { select: { name: true, address: true } },
        salesman: { select: { name: true } },
        customer: { select: { name: true, contact: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale nahi mili');
    }

    // Receipt-friendly shape banao
    return {
      invoiceNumber: sale.invoiceNumber,
      date: sale.createdAt,
      branch: {
        name: sale.branch?.name,
        address: sale.branch?.address,
      },
      salesman: sale.salesman?.name ?? 'N/A',
      customer: sale.customer
        ? { name: sale.customer.name, contact: sale.customer.contact }
        : null,
      items: sale.lines.map((line) => ({
        description: line.stockItem?.product
          ? `${line.stockItem.product.brand} ${line.stockItem.product.model}`
          : 'Item',
        serialNumber: line.stockItem?.serialNumber ?? null,
        price: Number(line.price),
        discount: Number(line.discount),
        lineTotal: Number(line.price) - Number(line.discount),
      })),

      payments: sale.payments.map((p) => ({
        method: p.method,
        amount: Number(p.amount),
      })),

      totalDiscount: Number(sale.totalDiscount),
      total: Number(sale.total),
      amountPaid: Number(sale.amountPaid),
      balanceDue: Number(sale.total) - Number(sale.amountPaid),
      paymentStatus: sale.paymentStatus,

      status: sale.status,
    };
  }

  async createSale(dto: CreateSaleDto, user: CurrentUser) {
    // Branch scope
    if (user.role !== 'SUPER_ADMIN' && dto.branchId !== user.branchId) {
      throw new BadRequestException(
        'Aap sirf apni branch mein sale kar sakte hain',
      );
    }
    const payments = dto.payments ?? [];

    // 1. Stock items laao
    const stockItemIds = dto.lines.map((l) => l.stockItemId);
    const stockItems = await this.tenantPrisma.client.stockItem.findMany({
      where: { id: { in: stockItemIds } },
    });

    // 2. Validate har line
    for (const line of dto.lines) {
      const item = stockItems.find((s) => s.id === line.stockItemId);
      if (!item) {
        throw new NotFoundException(`Stock item ${line.stockItemId} nahi mila`);
      }
      if (item.branchId !== dto.branchId) {
        throw new BadRequestException('Stock item is branch ka nahi hai');
      }
      if (item.serialNumber && item.status !== 'IN_STOCK') {
        throw new BadRequestException(
          `Item ${item.serialNumber} available nahi (status: ${item.status})`,
        );
      }
      if (!item.serialNumber) {
        const wantQty = line.quantity ?? 1;
        if (item.quantity < wantQty) {
          throw new BadRequestException(
            `Stock kaafi nahi (available: ${item.quantity})`,
          );
        }
      }
    }

    // 2b. Discount limit check (role ke hisaab se)
    const maxDiscountPercent = DISCOUNT_LIMITS[user.role];
    if (maxDiscountPercent !== null && maxDiscountPercent !== undefined) {
      for (const line of dto.lines) {
        const discount = line.discount ?? 0;
        if (discount > 0) {
          const discountPercent = (discount / line.price) * 100;
          if (discountPercent > maxDiscountPercent) {
            throw new BadRequestException(
              `Aapki discount limit ${maxDiscountPercent}% hai. ` +
                `Is item par ${discountPercent.toFixed(1)}% discount diya gaya — manager approval chahiye.`,
            );
          }
        }
      }
    }

    // 3. Breakdown nikaalo — subtotal, totalDiscount, total  ← NAYA
    let subtotal = 0;
    let totalDiscount = 0;
    for (const line of dto.lines) {
      const qty = line.quantity ?? 1;
      subtotal += line.price * qty;
      totalDiscount += (line.discount ?? 0) * qty;
    }
    const total = subtotal - totalDiscount;

    // 4. Payment total nikaalo
    const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);

    // 4b. Partial payment logic  ← NAYA
    // paidTotal > total nahi ho sakta (zyada paisa nahi le sakte)
    if (paidTotal > total + 0.01) {
      throw new BadRequestException(
        `Payment (${paidTotal}) total (${total}) se zyada nahi ho sakta`,
      );
    }

    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
    if (Math.abs(paidTotal - total) <= 0.01) {
      paymentStatus = 'PAID';
    } else if (paidTotal > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'UNPAID';
    }

    // Agar poora payment nahi hua (udhaar), to sirf Manager/Admin allow  ← NAYA
    if (paymentStatus !== 'PAID' && user.role === 'SALESMAN') {
      throw new BadRequestException(
        'Udhaar / partial payment sirf Manager ya Admin approve kar sakta hai. Poora payment lें.',
      );
    }

    // 5. Invoice number generate karo + sab kuch transaction mein  ← NAYA (counter)
    const sale = await this.tenantPrisma.client.$transaction(async (tx) => {
      // (a) Invoice counter ko atomically badhao
      const year = new Date().getFullYear();
      const counter = await tx.counter.upsert({
        where: {
          tenantId_name: { tenantId: user.tenantId, name: 'invoice' },
        } as any,
        update: { value: { increment: 1 } },
        create: { tenantId: user.tenantId, name: 'invoice', value: 1 } as any,
      });
      const invoiceNumber = `INV-${year}-${String(counter.value).padStart(4, '0')}`;

      // (b) Sale record
      const newSale = await tx.sale.create({
        data: {
          branchId: dto.branchId,
          invoiceNumber,
          salesmanId: user.userId,
          customerId: dto.customerId ?? null,
          subtotal,
          totalDiscount,
          total,
          amountPaid: paidTotal,
          paymentStatus,
          status: 'COMPLETED',
        } as any,
      });

      // (c) Lines + stock decrement
      for (const line of dto.lines) {
        const item = stockItems.find((s) => s.id === line.stockItemId)!;
        await tx.saleLine.create({
          data: {
            saleId: newSale.id,
            stockItemId: line.stockItemId,
            price: line.price,
            discount: line.discount ?? 0,
          } as any,
        });
        if (item.serialNumber) {
          await tx.stockItem.update({
            where: { id: item.id },
            data: { status: 'SOLD' } as any,
          });
        } else {
          await tx.stockItem.update({
            where: { id: item.id },
            data: { quantity: item.quantity - (line.quantity ?? 1) } as any,
          });
        }
      }

      // (d) Payments (sirf jo actually aaye)
      for (const payment of payments) {
        if (payment.amount > 0) {
          await tx.payment.create({
            data: {
              saleId: newSale.id,
              method: payment.method,
              amount: payment.amount,
            } as any,
          });
        }
      }

      // (e) Audit
      await tx.stockMovement.create({
        data: {
          branchId: dto.branchId,
          userId: user.userId,
          type: 'SALE',
          reason: `Sale ${invoiceNumber}`,
        } as any,
      });

      return newSale;
    });

    return this.findOne(sale.id);
  }

  // Ek sale dekho (lines + payments ke saath)
  async findOne(id: string) {
    const sale = await this.tenantPrisma.client.sale.findFirst({
      where: { id },
      include: {
        lines: true,
        payments: true,
      },
    });
    if (!sale) {
      throw new NotFoundException('Sale nahi mili');
    }
    return sale;
  }

  // Ek branch ki sales
  findByBranch(branchId: string) {
    return this.tenantPrisma.client.sale.findMany({
      where: { branchId },
      include: { lines: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
