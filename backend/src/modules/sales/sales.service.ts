import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { DISCOUNT_LIMITS } from './discount-limits';
import { ReturnSaleDto } from './dto/return-sale.dto';
import { DEFAULT_WARRANTY_MONTHS } from './warranty-config';
import { AddPaymentDto } from './dto/add-payment.dto';

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
    // Customer validation  ← NAYA
    // Agar customerId diya hai, to wo asli customer hona chahiye
    if (dto.customerId) {
      const customer = await this.tenantPrisma.client.customer.findFirst({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer nahi mila');
      }
    }

    // Udhaar (PARTIAL/UNPAID) ke liye customer zaroori  ← NAYA
    if (paymentStatus !== 'PAID' && !dto.customerId) {
      throw new BadRequestException(
        'Udhaar sale ke liye customer zaroori hai. Pehle customer select/banayein.',
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

          // Warranty auto-create — sirf serial wale item + customer ho to  ← NAYA
          if (dto.customerId) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + DEFAULT_WARRANTY_MONTHS);

            await tx.warranty.create({
              data: {
                customerId: dto.customerId,
                stockItemId: item.id,
                serial: item.serialNumber,
                startDate,
                endDate,
                status: 'ACTIVE',
              } as any,
            });
          }
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

  // Ek customer ki saari warranties
  async customerWarranties(customerId: string) {
    const customer = await this.tenantPrisma.client.customer.findFirst({
      where: { id: customerId },
      select: { id: true, name: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer nahi mila');
    }

    const warranties = await this.tenantPrisma.client.warranty.findMany({
      where: { customerId },
      include: {
        stockItem: {
          include: { product: { select: { brand: true, model: true } } },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    const now = new Date();
    return {
      customer,
      warranties: warranties.map((w) => {
        const daysLeft = Math.ceil(
          (new Date(w.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          id: w.id,
          serial: w.serial,
          product: w.stockItem?.product
            ? `${w.stockItem.product.brand} ${w.stockItem.product.model}`
            : 'Item',
          startDate: w.startDate,
          endDate: w.endDate,
          status: w.status,
          daysLeft, // negative = expire ho chuki
          isExpired: daysLeft < 0,
        };
      }),
    };
  }

  // Expiring warranties — agle X dino mein khatam ho rahi (follow-up ke liye)
  async expiringWarranties(branchId: string, withinDays: number = 30) {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    // Is branch ke stock items ki warranties jo cutoff se pehle khatam ho rahi
    const warranties = await this.tenantPrisma.client.warranty.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: now, lte: cutoff },
        stockItem: { branchId },
      },
      include: {
        customer: { select: { name: true, contact: true } },
        stockItem: {
          include: { product: { select: { brand: true, model: true } } },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return warranties.map((w) => ({
      id: w.id,
      serial: w.serial,
      product: w.stockItem?.product
        ? `${w.stockItem.product.brand} ${w.stockItem.product.model}`
        : 'Item',
      customer: w.customer ? { name: w.customer.name, contact: w.customer.contact } : null,
      endDate: w.endDate,
    }));
  }

  // Customer ki purchase history + receivables (kitna baqi)
  async customerHistory(customerId: string) {
    // Customer maujood hai?
    const customer = await this.tenantPrisma.client.customer.findFirst({
      where: { id: customerId },
      select: { id: true, name: true, contact: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer nahi mila');
    }

    // Is customer ki saari sales (lines + payments ke saath)
    const sales = await this.tenantPrisma.client.sale.findMany({
      where: { customerId },
      include: {
        lines: {
          include: {
            stockItem: {
              include: { product: { select: { brand: true, model: true } } },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Receivables nikaalo — har sale ka balance jodo
    let totalPurchased = 0;
    let totalPaid = 0;
    let totalDue = 0;

    const history = sales.map((sale) => {
      const total = Number(sale.total);
      const paid = Number(sale.amountPaid);
      const due = total - paid;

      totalPurchased += total;
      totalPaid += paid;
      totalDue += due;

      return {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        date: sale.createdAt,
        items: sale.lines.map((l) =>
          l.stockItem?.product
            ? `${l.stockItem.product.brand} ${l.stockItem.product.model}`
            : 'Item',
        ),
        total,
        paid,
        due,
        paymentStatus: sale.paymentStatus,
        saleStatus: sale.status,
      };
    });

    return {
      customer,
      summary: {
        totalPurchased,   // kitne ka total maal liya
        totalPaid,        // kitna pay kiya
        totalDue,         // kitna baqi hai (receivables) ← sabse important
        salesCount: sales.length,
      },
      history,
    };
  }

  // Udhaar collect karna — existing sale pe naya payment add karo
  async addPayment(dto: AddPaymentDto, user: CurrentUser) {
    // 1. Sale laao
    const sale = await this.tenantPrisma.client.sale.findFirst({
      where: { id: dto.saleId },
    });
    if (!sale) {
      throw new NotFoundException('Sale nahi mili');
    }

    // 2. Branch scope: Manager/Salesman sirf apni branch ki sale
    if (user.role !== 'SUPER_ADMIN' && sale.branchId !== user.branchId) {
      throw new BadRequestException('Aap sirf apni branch ki sale pe payment le sakte hain');
    }

    // 3. Sale pehle se poori paid to nahi?
    const currentPaid = Number(sale.amountPaid);
    const total = Number(sale.total);
    const currentDue = total - currentPaid;

    if (currentDue <= 0) {
      throw new BadRequestException('Is sale ka poora payment ho chuka hai, koi balance baqi nahi');
    }

    // 4. Naya payment balance se zyada to nahi?
    if (dto.amount > currentDue + 0.01) {
      throw new BadRequestException(
        `Payment (${dto.amount}) baqi balance (${currentDue}) se zyada nahi ho sakta`,
      );
    }

    // 5. Naya amountPaid aur status nikaalo
    const newAmountPaid = currentPaid + dto.amount;
    const newDue = total - newAmountPaid;
    const newPaymentStatus = newDue <= 0.01 ? 'PAID' : 'PARTIAL';

    // 6. TRANSACTION: payment record + sale update
    await this.tenantPrisma.client.$transaction(async (tx) => {
      // (a) Payment row banao
      await tx.payment.create({
        data: {
          saleId: sale.id,
          method: dto.method,
          amount: dto.amount,
        } as any,
      });

      // (b) Sale ka amountPaid aur status update
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
        } as any,
      });
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

