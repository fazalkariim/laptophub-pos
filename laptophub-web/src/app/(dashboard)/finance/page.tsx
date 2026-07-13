'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import {
  useBranchProfit,
  useSalesSummary,
  useExpenses,
  useDeleteExpense,
  useFinanceDashboard,
} from '@/hooks/useFinance';
import { PageHeader } from '@/components/shared/PageHeader';
import { DateRangePicker } from '@/components/finance/DateRangePicker';
import { ExpenseDialog } from '@/components/finance/ExpenseDialog';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { Eye, EyeOff } from 'lucide-react';

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function FinancePage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    isSuperAdmin ? null : user?.branchId ?? null
  );
  const branchId = isSuperAdmin ? selectedBranch : user?.branchId ?? null;

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [tab, setTab] = useState<'overview' | 'expenses' | 'consolidated'>(
    'overview'
  );
  const [showAmounts, setShowAmounts] = useState(false);

  const {
    data: profit,
    isLoading: profitLoading,
    isError: profitError,
  } = useBranchProfit(branchId, from, to);
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useSalesSummary(branchId, from, to);
  const {
    data: expensesData,
    isLoading: expensesLoading,
    isError: expensesError,
  } = useExpenses(branchId, from, to);
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
  } = useFinanceDashboard(from, to);
  const deleteExpense = useDeleteExpense();

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Sales, expenses aur profit dekhein."
        action={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <select
                value={selectedBranch ?? ''}
                onChange={(e) => setSelectedBranch(e.target.value || null)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Branch chunein…</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          </div>
        }
      />

      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'overview' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('expenses')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'expenses' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          Expenses
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setTab('consolidated')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'consolidated' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
            }`}
          >
            Consolidated (All Branches)
          </button>
        )}
      </div>

      {tab === 'overview' && (
        <>
          {!branchId ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Dekhne ke liye branch chunein.
            </div>
          ) : profitLoading || summaryLoading ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Load ho raha…
            </div>
          ) : profitError || summaryError ? (
            <div className="rounded-lg border p-8 text-center text-sm text-red-500">
              Data load nahi ho paya. Dobara try karein ya permission check karein.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Revenue"
                  value={formatMoney(profit?.revenue ?? 0)}
                  masked={!showAmounts}
                  onToggleMask={() => setShowAmounts((v) => !v)}
                />
                <StatCard
                  label="COGS"
                  value={formatMoney(profit?.cogs ?? 0)}
                  masked={!showAmounts}
                />
                <StatCard
                  label="Gross Margin"
                  value={formatMoney(profit?.grossMargin ?? 0)}
                  sub={profit ? `${profit.marginPercent}%` : undefined}
                  masked={!showAmounts}
                />
                <StatCard
                  label="Items Sold"
                  value={String(profit?.itemsSold ?? 0)}
                />
              </div>

              {summary && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold">Sales Summary</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <StatCard label="Total Sales" value={String(summary.summary.totalSalesCount)} />
                    <StatCard label="Collected" value={formatMoney(summary.summary.totalCollected)} />
                    <StatCard
                      label="Receivable"
                      value={formatMoney(summary.summary.totalReceivable)}
                      warn={summary.summary.totalReceivable > 0}
                    />
                  </div>
                  <h4 className="mb-2 mt-4 text-sm font-medium">Payment Breakdown</h4>
                  {Object.keys(summary.paymentBreakdown).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Is period mein koi payment nahi hui.
                    </p>
                  ) : (
                    <div className="flex gap-4">
                      {Object.entries(summary.paymentBreakdown).map(([method, amt]) => (
                        <div key={method} className="rounded-md bg-muted px-3 py-2 text-sm capitalize">
                          {method}: {formatMoney(amt)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'expenses' && (
        <>
          {!branchId ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Dekhne ke liye branch chunein.
            </div>
          ) : expensesLoading ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Load ho raha…
            </div>
          ) : expensesError ? (
            <div className="rounded-lg border p-8 text-center text-sm text-red-500">
              Expenses load nahi ho paye. Dobara try karein.
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total: {formatMoney(expensesData?.total ?? 0)} ({expensesData?.count ?? 0} entries)
                </p>
                <ExpenseDialog branchId={branchId} />
              </div>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesData?.expenses.map((exp) => (
                      <tr key={exp.id} className="border-t">
                        <td className="px-4 py-3">{exp.category}</td>
                        <td className="px-4 py-3">{formatMoney(exp.amount)}</td>
                        <td className="px-4 py-3">
                          {new Date(exp.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              deleteExpense.mutate(exp.id, {
                                onSuccess: () => {},
                              })
                            }
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expensesData?.expenses.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Is period mein koi expense nahi hai.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'consolidated' && isSuperAdmin && (
        <>
          {dashboardLoading ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Load ho raha…
            </div>
          ) : dashboardError ? (
            <div className="rounded-lg border p-8 text-center text-sm text-red-500">
              Dashboard load nahi ho paya. Dobara try karein.
            </div>
          ) : !dashboard ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Koi data nahi mila.
            </div>
          ) : (
             <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Total Revenue"
                  value={formatMoney(dashboard.overall.revenue)}
                  masked={!showAmounts}
                  onToggleMask={() => setShowAmounts((v) => !v)}
                />
                <StatCard
                  label="Net Profit"
                  value={formatMoney(dashboard.overall.netProfit)}
                  masked={!showAmounts}
                />
                <StatCard
                  label="Net Cash Position"
                  value={formatMoney(dashboard.overall.netCashPosition)}
                  masked={!showAmounts}
                />
                <StatCard
                  label="Payable"
                  value={formatMoney(dashboard.overall.payable)}
                  warn={dashboard.overall.payable > 0}
                  masked={!showAmounts}
                />
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revenue</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Net Profit</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receivable</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.perBranch.map((b) => (
                      <tr key={b.branchId} className="border-t">
                        <td className="px-4 py-3 font-medium">{b.branchName}</td>
                        <td className="px-4 py-3">{formatMoney(b.revenue)}</td>
                        <td className="px-4 py-3">{formatMoney(b.netProfit)}</td>
                        <td className="px-4 py-3">{formatMoney(b.receivable)}</td>
                        <td className="px-4 py-3">{b.salesCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  warn,
  masked,
  onToggleMask,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  masked?: boolean;
  onToggleMask?: () => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {onToggleMask && (
          <button
            onClick={onToggleMask}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            aria-label={masked ? 'Amounts dikhaayein' : 'Amounts chhupaayein'}
          >
            {masked ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span className="text-[10px]">Show</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span className="text-[10px]">Hide</span>
              </>
            )}
          </button>
        )}
      </div>
      <p className={`text-lg font-semibold ${warn ? 'text-amber-600' : ''}`}>
        {masked ? '••••••••' : value}
      </p>
      {sub && !masked && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}