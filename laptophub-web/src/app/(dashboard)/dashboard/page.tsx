'use client';

import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useFinanceDashboard } from '@/hooks/useFinance';
import { useSalesmanPerformance, useStockValuation } from '@/hooks/useReports';
import { formatMoney } from '@/lib/format';
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

  const { data: dashboard } = useFinanceDashboard(fromMonth, toToday);
  const { data: perf } = useSalesmanPerformance(
    isManagerOrSalesman ? user?.branchId ?? null : null,
    toToday,
    toToday
  );
  const { data: valuation } = useStockValuation(
    user?.role === 'BRANCH_MANAGER' ? user?.branchId ?? null : null
  );

  if (!user) return null;

  const myPerf = perf?.salesmen.find((s) => s.salesmanId === user.id);

  const cards = buildCards(user.role, {
    todaysSales: myPerf ? formatMoney(myPerf.totalSold) : '—',
    myTransactions: myPerf ? String(myPerf.salesCount) : '—',
    branchStockValue: valuation ? formatMoney(valuation.summary.totalValue) : '—',
    totalSalesAllBranches: dashboard ? formatMoney(dashboard.overall.revenue) : '—',
    netCashPosition: dashboard ? formatMoney(dashboard.overall.netCashPosition) : '—',
    activeBranches: branches ? String(branches.length) : '—',
    pendingPayables: dashboard ? formatMoney(dashboard.overall.payable) : '—',
    expensesThisMonth: dashboard ? formatMoney(dashboard.overall.expenses) : '—',
  });

  // Revenue-by-branch chart data (sirf Super Admin)
  const branchRevenueData =
    dashboard?.perBranch.map((b) => ({
      name: b.branchName,
      Revenue: b.revenue,
    })) ?? [];

  // Cash-position breakdown (sirf Super Admin)
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


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {(user.name ?? user.email).split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's what's happening in your workspace.
        </p>
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
          {/* Revenue by Branch */}
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

         {/* Cash Position Breakdown */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-center text-sm font-medium text-muted-foreground">
              Cash Position Breakdown
            </h3>
            {cashBreakdownData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Is mahine koi cash-position data nahi hai.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
                {/* Donut chart with center total */}
                <div className="relative h-[220px] w-[220px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cashBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {cashBreakdownData.map((entry, i) => (
                          <Cell key={i} fill={CASH_COLORS[entry.name] ?? '#a1a1aa'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMoney(Number(value ?? 0))}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e4e4e7',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label overlay */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-muted-foreground">Net Position</span>
                    <span className="text-lg font-semibold">
                      {formatMoney(dashboard?.overall.netCashPosition ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Custom legend */}
                <div className="w-full space-y-2 sm:w-auto sm:min-w-[180px]">
                  {cashBreakdownData.map((entry) => {
                    const total = cashBreakdownData.reduce((s, d) => s + d.value, 0);
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
            )}
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
  netCashPosition: string;
  activeBranches: string;
  pendingPayables: string;
  expensesThisMonth: string;
}

function buildCards(role: string, v: CardValues) {
  const salesman = [
    { title: "Today's Sales", value: v.todaysSales },
    { title: 'My Transactions', value: v.myTransactions },
  ];
  const manager = [
    ...salesman,
    { title: 'Branch Stock Value', value: v.branchStockValue },
    { title: 'Low Stock Items', value: '—' },
  ];
  const admin = [
    { title: 'Total Sales (All Branches)', value: v.totalSalesAllBranches },
    { title: 'Net Cash Position', value: v.netCashPosition },
    { title: 'Active Branches', value: v.activeBranches },
    { title: 'Low Stock Items', value: '—' },
  ];
  const accountant = [
    { title: 'Net Cash Position', value: v.netCashPosition },
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