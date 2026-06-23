import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      throw new BadRequestException('Aap sirf apni branch ki sale return kar sakte hain');
    }

    // 3. Sale already poori return to nahi?
    if (sale.status === 'RETURNED') {
      throw new BadRequestException('Ye sale pehle se poori return ho chuki hai');
    }

    // 4. Validate: jo items return ho rahe hain wo is sale mein the?
    const saleStockItemIds = sale.lines
      .map((l) => l.stockItemId)
      .filter((id): id is string => id !== null);

    for (const itemId of dto.stockItemIds) {
      if (!saleStockItemIds.includes(itemId)) {
        throw new BadRequestException(`Item ${itemId} is sale ka hissa nahi tha`);
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

  async createSale(dto: CreateSaleDto, user: CurrentUser) {
    // Branch scope: Manager/Salesman sirf apni branch
    if (user.role !== 'SUPER_ADMIN' && dto.branchId !== user.branchId) {
      throw new BadRequestException('Aap sirf apni branch mein sale kar sakte hain');
    }

    // 1. Saare stock items laao jo bik rahe hain
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
      // Item isi branch ka ho
      if (item.branchId !== dto.branchId) {
        throw new BadRequestException('Stock item is branch ka nahi hai');
      }
      // Serial wale item ka status IN_STOCK hona chahiye
      if (item.serialNumber && item.status !== 'IN_STOCK') {
        throw new BadRequestException(`Item ${item.serialNumber} available nahi (status: ${item.status})`);
      }
      // Accessory: quantity kaafi honi chahiye
      if (!item.serialNumber) {
        const wantQty = line.quantity ?? 1;
        if (item.quantity < wantQty) {
          throw new BadRequestException(`Stock kaafi nahi (available: ${item.quantity})`);
        }
      }
    }
    // 2b. Discount limit check — role ke hisaab se
    const maxDiscountPercent = DISCOUNT_LIMITS[user.role];
    // null = unlimited, to sirf tab check karo jab limit set ho
    if (maxDiscountPercent !== null && maxDiscountPercent !== undefined) {
      for (const line of dto.lines) {
        const discount = line.discount ?? 0;
        if (discount > 0) {
          // Is line par discount kitne % hai?
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

    // 3. Total nikaalo
    let total = 0;
    for (const line of dto.lines) {
      total += line.price - (line.discount ?? 0);
    }

    // 4. Payment total match karta hai?
    const paidTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paidTotal - total) > 0.01) {
      throw new BadRequestException(`Payment (${paidTotal}) sale total (${total}) se match nahi karta`);
    }

    // 5. TRANSACTION: sab kuch ek saath
    const sale = await this.tenantPrisma.client.$transaction(async (tx) => {
      // (a) Sale record
      const newSale = await tx.sale.create({
        data: {
          branchId: dto.branchId,
          salesmanId: user.userId,
          customerId: dto.customerId ?? null,
          total,
          status: 'COMPLETED',
        } as any,
      });

      // (b) Har line + stock update
      for (const line of dto.lines) {
        const item = stockItems.find((s) => s.id === line.stockItemId)!;

        // Sale line banao
        await tx.saleLine.create({
          data: {
            saleId: newSale.id,
            stockItemId: line.stockItemId,
            price: line.price,
            discount: line.discount ?? 0,
          } as any,
        });

        // Stock decrement
        if (item.serialNumber) {
          // Serial wala — SOLD mark karo
          await tx.stockItem.update({
            where: { id: item.id },
            data: { status: 'SOLD' } as any,
          });
        } else {
          // Accessory — quantity kam karo
          await tx.stockItem.update({
            where: { id: item.id },
            data: { quantity: item.quantity - (line.quantity ?? 1) } as any,
          });
        }
      }

      // (c) Payments record
      for (const payment of dto.payments) {
        await tx.payment.create({
          data: {
            saleId: newSale.id,
            method: payment.method,
            amount: payment.amount,
          } as any,
        });
      }

      // (d) Audit
      await tx.stockMovement.create({
        data: {
          branchId: dto.branchId,
          userId: user.userId,
          type: 'SALE',
          reason: `Sale ${newSale.id}`,
        } as any,
      });

      return newSale;
    });

    // Poori sale details wapas karo
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