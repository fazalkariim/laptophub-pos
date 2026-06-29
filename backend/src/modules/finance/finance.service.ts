import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

// Date range helper — from/to ko Prisma where mein badlo (sirf valid dates)
  private dateFilter(from?: string, to?: string) {
    const filter: any = {};

    if (from && from.trim() !== '') {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        filter.gte = fromDate;
      }
    }

    if (to && to.trim() !== '') {
      const toDate = new Date(to + 'T23:59:59');
      if (!isNaN(toDate.getTime())) {
        filter.lte = toDate;
      }
    }

    // Agar koi valid date nahi mili, to khaali (saari sales)
    if (Object.keys(filter).length === 0) {
      return {};
    }
    return { createdAt: filter };
  }


  // Sales summary — ek branch (date range optional)
  async salesSummary(branchId: string, from?: string, to?: string) {
    const dateWhere = this.dateFilter(from, to);

    // Saari sales (lines + payments ke saath)
    const sales = await this.tenantPrisma.client.sale.findMany({
      where: { branchId, ...dateWhere },
      include: { payments: true },
    });

    // Returned sales ko alag rakho (count ke liye), lekin revenue mein na gino
    let totalSalesCount = 0;
    let returnedCount = 0;
    let grossRevenue = 0;       // COMPLETED/PARTIALLY_RETURNED sales ka total
    let totalCollected = 0;     // actual paise jo aaye (amountPaid)
    let totalReceivable = 0;    // jo abhi baqi hai (udhaar)

    // Payment method breakdown
    const byMethod: Record<string, number> = {};

    for (const sale of sales) {
      totalSalesCount++;

      // Fully returned sale — revenue mein nahi
      if (sale.status === 'RETURNED') {
        returnedCount++;
        continue;
      }

      const total = Number(sale.total);
      const paid = Number(sale.amountPaid);

      grossRevenue += total;
      totalCollected += paid;
      totalReceivable += total - paid;

      // Payment method ke hisaab se jodo
      for (const payment of sale.payments) {
        const method = payment.method.toLowerCase();
        byMethod[method] = (byMethod[method] ?? 0) + Number(payment.amount);
      }
    }

    return {
      branchId,
      period: { from: from ?? 'all', to: to ?? 'all' },
      summary: {
        totalSalesCount,        // kitni sales (returned samet)
        returnedCount,          // kitni return hui
        activeSalesCount: totalSalesCount - returnedCount,
        grossRevenue,           // kul bikri (returns ke bina)
        totalCollected,         // actual paise aaye
        totalReceivable,        // udhaar baqi
      },
      paymentBreakdown: byMethod, // { cash: X, card: Y, transfer: Z }
    };
  }

  // COGS + Gross Margin (profit) — ek branch (date range optional)
  async profitReport(branchId: string, from?: string, to?: string) {
    const dateWhere = this.dateFilter(from, to);

    // Saari sales — lines + har line ka stock item (cost ke liye)
    const sales = await this.tenantPrisma.client.sale.findMany({
      where: { branchId, ...dateWhere },
      include: {
        lines: {
          include: {
            stockItem: {
              select: { costPrice: true, serialNumber: true },
            },
          },
        },
      },
    });

    let totalRevenue = 0;     // bika kitne ka (sale price - discount)
    let totalCOGS = 0;        // bika maal ki cost
    let itemsSold = 0;
    let itemsWithoutCost = 0; // jin ka cost pata nahi (warning)

    for (const sale of sales) {
      // Returned sale — profit mein nahi
      if (sale.status === 'RETURNED') continue;

      for (const line of sale.lines) {
        const linePrice = Number(line.price) - Number(line.discount);
        totalRevenue += linePrice;
        itemsSold++;

        // Is item ka cost price (stock item se)
        const cost = line.stockItem?.costPrice;
        if (cost !== null && cost !== undefined) {
          totalCOGS += Number(cost);
        } else {
          // Cost pata nahi (jaise manually add kiya bina cost ke)
          itemsWithoutCost++;
        }
      }
    }

    const grossMargin = totalRevenue - totalCOGS;
    const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    return {
      branchId,
      period: { from: from ?? 'all', to: to ?? 'all' },
      revenue: totalRevenue,
      cogs: totalCOGS,
      grossMargin,                          // ← profit
      marginPercent: Math.round(marginPercent * 100) / 100, // 2 decimal
      itemsSold,
      itemsWithoutCost,                     // agar > 0, to kuch items ka cost missing (profit thoda zyada dikhega)
    };
  }

  // Consolidated dashboard — saari branches ki poori tasveer (Super Admin)
  async dashboard(from?: string, to?: string) {
    const dateWhere = this.dateFilter(from, to);

    // Saari branches
    const branches = await this.tenantPrisma.client.branch.findMany({
      select: { id: true, name: true },
    });

    // Har branch ke liye numbers nikaalo
    const perBranch: any[] = [];
    let overallRevenue = 0;
    let overallCOGS = 0;
    let overallCollected = 0;
    let overallReceivable = 0;
    let overallExpenses = 0;

    for (const branch of branches) {
      // Sales (lines + cost ke liye stock item)
      const sales = await this.tenantPrisma.client.sale.findMany({
        where: { branchId: branch.id, ...dateWhere },
        include: {
          lines: { include: { stockItem: { select: { costPrice: true } } } },
        },
      });

      let revenue = 0;
      let cogs = 0;
      let collected = 0;
      let receivable = 0;

      for (const sale of sales) {
        if (sale.status === 'RETURNED') continue;

        collected += Number(sale.amountPaid);
        receivable += Number(sale.total) - Number(sale.amountPaid);

        for (const line of sale.lines) {
          revenue += Number(line.price) - Number(line.discount);
          const cost = line.stockItem?.costPrice;
          if (cost !== null && cost !== undefined) {
            cogs += Number(cost);
          }
        }
      }

      // Expenses (date range)
      const expenseWhere: any = { branchId: branch.id };
      if (from || to) {
        expenseWhere.date = {};
        if (from) expenseWhere.date.gte = new Date(from);
        if (to) expenseWhere.date.lte = new Date(to + 'T23:59:59');
      }
      const expenses = await this.tenantPrisma.client.expense.findMany({
        where: expenseWhere,
      });
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

      const grossMargin = revenue - cogs;
      const netProfit = grossMargin - totalExpenses; // gross profit - kharch

      perBranch.push({
        branchId: branch.id,
        branchName: branch.name,
        revenue,
        cogs,
        grossMargin,
        expenses: totalExpenses,
        netProfit,
        collected,
        receivable,
        salesCount: sales.filter((s) => s.status !== 'RETURNED').length,
      });

      overallRevenue += revenue;
      overallCOGS += cogs;
      overallCollected += collected;
      overallReceivable += receivable;
      overallExpenses += totalExpenses;
    }

    // Payables — saare suppliers ka total due (tenant-wide)
    const pos = await this.tenantPrisma.client.purchaseOrder.findMany({
      where: { status: { in: ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'] } },
      select: { totalCost: true, amountPaid: true },
    });
    const totalPayable = pos.reduce(
      (s, po) => s + (Number(po.totalCost) - Number(po.amountPaid)),
      0,
    );

    const overallGrossMargin = overallRevenue - overallCOGS;
    const overallNetProfit = overallGrossMargin - overallExpenses;

    return {
      period: { from: from ?? 'all', to: to ?? 'all' },
      overall: {
        revenue: overallRevenue,
        cogs: overallCOGS,
        grossMargin: overallGrossMargin,
        expenses: overallExpenses,
        netProfit: overallNetProfit,         // ← asal kamai (sab kharch ke baad)
        collected: overallCollected,         // paise jo aaye
        receivable: overallReceivable,       // customers pe baqi
        payable: totalPayable,               // suppliers ko dena
        netCashPosition: overallCollected + overallReceivable - totalPayable, // net
      },
      perBranch,
    };
  }
  
}