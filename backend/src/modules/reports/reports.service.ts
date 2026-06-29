import { Injectable, BadRequestException, ForbiddenException  } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

// Date range helper — sirf valid dates use karta hai
  private dateFilter(from?: string, to?: string) {
    const filter: any = {};

    if (from) {
      const fromDate = new Date(from);
      // Sirf tab use karo jab valid date ho
      if (!isNaN(fromDate.getTime())) {
        filter.gte = fromDate;
      }
    }

    if (to) {
      const toDate = new Date(to + 'T23:59:59');
      if (!isNaN(toDate.getTime())) {
        filter.lte = toDate;
      }
    }

    // Agar koi valid date nahi mili, to khaali filter (saara data)
    if (Object.keys(filter).length === 0) {
      return {};
    }
    return { createdAt: filter };
  }

  // Best-selling products — kya bik raha (role-scoped)
  async bestSellingProducts(user: CurrentUser, from?: string, to?: string, branchId?: string) {
    const dateWhere = this.dateFilter(from, to);
    const saleWhere: any = { ...dateWhere, status: { not: 'RETURNED' } };

    // Role scoping (sales pe)
    if (user.role === 'SALESMAN') {
      saleWhere.salesmanId = user.userId;
    } else if (user.role === 'BRANCH_MANAGER') {
      saleWhere.branchId = user.branchId;
    } else if (user.role === 'SUPER_ADMIN') {
      if (branchId) saleWhere.branchId = branchId;
    }

    // Saari sales lines + product info (stock item ke through)
    const sales = await this.tenantPrisma.client.sale.findMany({
      where: saleWhere,
      include: {
        lines: {
          include: {
            stockItem: {
              include: { product: { select: { id: true, brand: true, model: true, sku: true } } },
            },
          },
        },
      },
    });

    // Product ke hisaab se group
    const byProduct: Record<string, any> = {};

    for (const sale of sales) {
      for (const line of sale.lines) {
        const product = line.stockItem?.product;
        if (!product) continue; // product info nahi to skip

        const pid = product.id;
        if (!byProduct[pid]) {
          byProduct[pid] = {
            productId: pid,
            name: `${product.brand} ${product.model}`,
            sku: product.sku,
            unitsSold: 0,
            revenue: 0,
          };
        }
        byProduct[pid].unitsSold++;
        byProduct[pid].revenue += Number(line.price) - Number(line.discount);
      }
    }

    // Sort — sabse zyada bikne wala upar
    const products = Object.values(byProduct).sort(
      (a: any, b: any) => b.unitsSold - a.unitsSold,
    );

    return {
      period: { from: from ?? 'all', to: to ?? 'all' },
      scope: user.role,
      products,
    };
  }

  // Salesman performance — kaun ne kitna becha (role-scoped)
  async salesmanPerformance(user: CurrentUser, from?: string, to?: string, branchId?: string) {
    const dateWhere = this.dateFilter(from, to);
    const where: any = { ...dateWhere };

    // ─── ROLE SCOPING (document ka core) ───
    if (user.role === 'SALESMAN') {
      // Salesman sirf apni performance
      where.salesmanId = user.userId;
    } else if (user.role === 'BRANCH_MANAGER') {
      // Manager sirf apni branch
      where.branchId = user.branchId;
    } else if (user.role === 'SUPER_ADMIN') {
      // Super Admin sab — agar branchId diya to us branch ka
      if (branchId) where.branchId = branchId;
    }

    // RETURNED sales ko chhod kar (wo bika hi nahi)
    where.status = { not: 'RETURNED' };

    // Saari sales (salesman ke saath)
    const sales = await this.tenantPrisma.client.sale.findMany({
      where,
      include: {
        salesman: { select: { id: true, name: true, email: true } },
      },
    });

    // Salesman ke hisaab se group karo
    const bySalesman: Record<string, any> = {};

    for (const sale of sales) {
      const sid = sale.salesmanId;
      if (!bySalesman[sid]) {
        bySalesman[sid] = {
          salesmanId: sid,
          name: sale.salesman?.name ?? 'Unknown',
          email: sale.salesman?.email ?? '',
          salesCount: 0,
          totalSold: 0,
        };
      }
      bySalesman[sid].salesCount++;
      bySalesman[sid].totalSold += Number(sale.total);
    }

    // Array banao + average nikaalo + sort (zyada bechne wala upar)
    const performance = Object.values(bySalesman)
      .map((s: any) => ({
        ...s,
        averageSale: s.salesCount > 0 ? Math.round(s.totalSold / s.salesCount) : 0,
      }))
      .sort((a: any, b: any) => b.totalSold - a.totalSold);

    return {
      period: { from: from ?? 'all', to: to ?? 'all' },
      scope: user.role,
      salesmen: performance,
    };
  }

  // Stock valuation — kitna stock pada hai aur uski cost value (role-scoped)
  async stockValuation(user: CurrentUser, branchId?: string) {
    const where: any = { status: 'IN_STOCK' };

    // Role scoping
    if (user.role === 'BRANCH_MANAGER') {
      // Agar manager ne kisi aur branch ka branchId bheja — saaf mana karo
      if (branchId && branchId !== user.branchId) {
        throw new ForbiddenException('Aap sirf apni branch ka data dekh sakte hain');
      }
      where.branchId = user.branchId;
    } else if (user.role === 'SUPER_ADMIN') {
      if (branchId) where.branchId = branchId;
    }

    // Saara IN_STOCK maal + product info
    const items = await this.tenantPrisma.client.stockItem.findMany({
      where,
      include: {
        product: { select: { id: true, brand: true, model: true, sku: true } },
      },
    });

    let totalUnits = 0;
    let totalValue = 0;
    let itemsWithoutCost = 0;

    // Product ke hisaab se group (aur branch ke hisaab se total)
    const byProduct: Record<string, any> = {};
    const byBranch: Record<string, any> = {};

    for (const item of items) {
      const qty = item.quantity;
      const cost = item.costPrice;
      const itemValue = cost !== null && cost !== undefined ? Number(cost) * qty : 0;

      if (cost === null || cost === undefined) {
        itemsWithoutCost += qty;
      }

      totalUnits += qty;
      totalValue += itemValue;

      // Product-wise
      const product = item.product;
      if (product) {
        const pid = product.id;
        if (!byProduct[pid]) {
          byProduct[pid] = {
            productId: pid,
            name: `${product.brand} ${product.model}`,
            sku: product.sku,
            units: 0,
            value: 0,
          };
        }
        byProduct[pid].units += qty;
        byProduct[pid].value += itemValue;
      }

      // Branch-wise
      const bid = item.branchId;
      if (!byBranch[bid]) {
        byBranch[bid] = { branchId: bid, units: 0, value: 0 };
      }
      byBranch[bid].units += qty;
      byBranch[bid].value += itemValue;
    }

    return {
      scope: user.role,
      summary: {
        totalUnits,              // kitne units stock mein
        totalValue,              // total cost value (paisa jo phasa hai)
        itemsWithoutCost,        // jin ka cost nahi pata (value mein nahi gine)
      },
      byProduct: Object.values(byProduct).sort((a: any, b: any) => b.value - a.value),
      byBranch: Object.values(byBranch),
    };
  }
}