'use client';

import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useFinanceDashboard, useSalesSummary } from '@/hooks/useFinance';
import {
  useSalesmanPerformance,
  useStockValuation,
  useBestSellingProducts,
} from '@/hooks/useReports';
import { useLowStockCount, useAllBranchesLowStockCount } from '@/hooks/useStock';
import { formatMoney } from '@/lib/format';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();

  const fromMonth = firstOfMonth();
  const toToday = today();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isManagerOrSalesman =
    user?.role === 'BRANCH_MANAGER' || user?.role === 'SALESMAN';

  // Sirf Super Admin ke liye branch-filter
  const [selectedBranch, setSelectedBranch] = useState<string>(''); // '' = All Branches

  const { data: dashboard } = useFinanceDashboard(fromMonth, toToday);
  const { data: perf } = useSalesmanPerformance(
    isManagerOrSalesman ? user?.branchId ?? null : null,
    toToday,
    toToday
  );
  const { data: valuation } = useStockValuation(
    user?.role === 'BRANCH_MANAGER' ? user?.branchId ?? null : null
  );

  // Total Items Sold — filter ke hisaab se
  const { data: bestSelling } = useBestSellingProducts(
    isSuperAdmin ? selectedBranch || null : null,
    fromMonth,
    toToday
  );
  const totalItemsSold =
    bestSelling?.products.reduce((sum, p) => sum + p.unitsSold, 0) ?? 0;

  // Amount Collected — specific branch ke liye alag call
  const { data: branchSalesSummary } = useSalesSummary(
    isSuperAdmin && selectedBranch ? selectedBranch : null,
    fromMonth,
    toToday
  );

  // Low Stock — specific branch, ya sab branches sum
  const { data: singleBranchLowStock } = useLowStockCount(
    isSuperAdmin && selectedBranch ? selectedBranch : null
  );
  const { data: allBranchesLowStock } = useAllBranchesLowStockCount(
    isSuperAdmin && !selectedBranch ? branches?.map((b) => b.id) ?? [] : []
  );

  if (!user) return null;

  const myPerf = perf?.salesmen.find((s) => s.salesmanId === user.id);

  // Amount collected: All-branches view -> dashboard.overall; specific branch -> sales-summary
  const amountCollected =
    isSuperAdmin && selectedBranch
      ? branchSalesSummary?.summary.totalCollected
      : dashboard?.overall.collected;

  const lowStockValue =
    isSuperAdmin && selectedBranch ? singleBranchLowStock : allBranchesLowStock;

  // Revenue-by-branch chart — filter ke hisaab se
  const branchRevenueData = (
    selectedBranch
      ? dashboard?.perBranch.filter((b) => b.branchId === selectedBranch)
      : dashboard?.perBranch
  )?.map((b) => ({ name: b.branchName, Revenue: b.revenue })) ?? [];

  const cashBreakdownData = dashboard
    ? [
        { name: 'Collected', value: dashboard.overall.collected },
        { name: 'Receivable', value: dashboard.overall.receivable },
        { name: 'Payable', value: dashboard.overall.payable },
      ].filter((d) => d.value > 0)
    : [];

  const CASH_COLORS: Record<string, string> = {
    Collected: '#2563eb',
    Receivable: '#d97706',
    Payable: '#dc2626',
  };

  const cards = buildCards(user.role, {
    todaysSales: myPerf ? formatMoney(myPerf.totalSold) : '—',
    myTransactions: myPerf ? String(myPerf.salesCount) : '—',
    branchStockValue: valuation ? formatMoney(valuation.summary.totalValue) : '—',
    totalSalesAllBranches: selectedBranch
      ? formatMoney(
          dashboard?.perBranch.find((b) => b.branchId === selectedBranch)
            ?.revenue ?? 0
        )
      : dashboard
        ? formatMoney(dashboard.overall.revenue)
        : '—',
    amountCollected: amountCollected != null ? formatMoney(amountCollected) : '—',
    activeBranches: branches ? String(branches.length) : '—',
    pendingPayables: dashboard ? formatMoney(dashboard.overall.payable) : '—',
    expensesThisMonth: dashboard ? formatMoney(dashboard.overall.expenses) : '—',
    totalItemsSold: String(totalItemsSold),
    lowStockItems: lowStockValue != null ? String(lowStockValue) : '—',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back, {(user.name ?? user.email).split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening in your workspace.
          </p>
        </div>

        {isSuperAdmin && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Sab Branches</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-lg border p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{c.title}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      {isSuperAdmin && dashboard && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-center text-sm font-medium text-muted-foreground">
              Revenue by Branch (This Month)
            </h3>
            {branchRevenueData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Is mahine koi sales data nahi hai.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={branchRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                  <Bar dataKey="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-center text-sm font-medium text-muted-foreground">
              Cash Position Breakdown
            </h3>
            {(() => {
              // Branch-specific: sirf Collected+Receivable (Payable per-branch nahi hai)
              const branchEntry = selectedBranch
                ? dashboard?.perBranch.find((b) => b.branchId === selectedBranch)
                : null;

              const data = selectedBranch
                ? [
                    { name: 'Collected', value: branchEntry?.collected ?? 0 },
                    { name: 'Receivable', value: branchEntry?.receivable ?? 0 },
                  ].filter((d) => d.value > 0)
                : cashBreakdownData;

              const centerLabel = selectedBranch ? 'Net Profit' : 'Net Position';
              const centerValue = selectedBranch
                ? branchEntry?.netProfit ?? 0
                : dashboard?.overall.netCashPosition ?? 0;

              if (data.length === 0) {
                return (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Is mahine koi cash-position data nahi hai.
                  </p>
                );
              }

              return (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
                  <div className="relative h-[220px] w-[220px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {data.map((entry, i) => (
                            <Cell key={i} fill={CASH_COLORS[entry.name] ?? '#a1a1aa'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">{centerLabel}</span>
                      <span className="text-lg font-semibold">
                        {formatMoney(centerValue)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full space-y-2 sm:w-auto sm:min-w-[180px]">
                    {data.map((entry) => {
                      const total = data.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                      return (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: CASH_COLORS[entry.name] ?? '#a1a1aa',
                              }}
                            />
                            <span className="text-muted-foreground">{entry.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatMoney(entry.value)}</div>
                            <div className="text-xs text-muted-foreground">{pct}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

interface CardValues {
  todaysSales: string;
  myTransactions: string;
  branchStockValue: string;
  totalSalesAllBranches: string;
  amountCollected: string;
  activeBranches: string;
  pendingPayables: string;
  expensesThisMonth: string;
  totalItemsSold: string;
  lowStockItems: string;
}

function buildCards(role: string, v: CardValues) {
  const salesman = [
    { title: "Today's Sales", value: v.todaysSales },
    { title: 'My Transactions', value: v.myTransactions },
  ];
  const manager = [
    ...salesman,
    { title: 'Branch Stock Value', value: v.branchStockValue },
    { title: 'Low Stock Items', value: v.lowStockItems },
  ];
  const admin = [
    { title: 'Total Sales', value: v.totalSalesAllBranches },
    { title: 'Amount Collected', value: v.amountCollected },
    { title: 'Active Branches', value: v.activeBranches },
    { title: 'Low Stock Items', value: v.lowStockItems },
    { title: 'Total Items Sold', value: v.totalItemsSold },
  ];
  const accountant = [
    { title: 'Amount Collected', value: v.amountCollected },
    { title: 'Pending Payables', value: v.pendingPayables },
    { title: 'Expenses (This Month)', value: v.expensesThisMonth },
  ];

  switch (role) {
    case 'SUPER_ADMIN':
      return admin;
    case 'BRANCH_MANAGER':
      return manager;
    case 'ACCOUNTANT':
      return accountant;
    default:
      return salesman;
  }
}