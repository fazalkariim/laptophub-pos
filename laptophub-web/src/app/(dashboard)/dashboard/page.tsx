'use client';

import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useFinanceDashboard } from '@/hooks/useFinance';
import { useSalesmanPerformance, useStockValuation } from '@/hooks/useReports';
import { formatMoney } from '@/lib/format';


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

  // Har role ko sirf apne relevant hooks chalane hain — baaki disabled rahenge
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
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
    { title: 'Low Stock Items', value: '—' }, // TODO: /inventory/branch/{id}/low-stock hook
  ];
  const admin = [
    { title: 'Total Sales (All Branches)', value: v.totalSalesAllBranches },
    { title: 'Net Cash Position', value: v.netCashPosition },
    { title: 'Active Branches', value: v.activeBranches },
    { title: 'Low Stock Items', value: '—' }, // TODO
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