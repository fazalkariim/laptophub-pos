'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import {
  useSalesmanPerformance,
  useBestSellingProducts,
  useStockValuation,
} from '@/hooks/useReports';
import { PageHeader } from '@/components/shared/PageHeader';
import { DateRangePicker } from '@/components/finance/DateRangePicker';
import { formatMoney } from '@/lib/format';

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

type Tab = 'salesman' | 'products' | 'valuation';

export default function ReportsPage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    isSuperAdmin ? null : user?.branchId ?? null
  );
  const branchId = isSuperAdmin ? selectedBranch : user?.branchId ?? null;

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [tab, setTab] = useState<Tab>('salesman');

  const { data: salesman, isLoading: salesmanLoading } = useSalesmanPerformance(
    branchId,
    from,
    to
  );
  const { data: products, isLoading: productsLoading } = useBestSellingProducts(
    branchId,
    from,
    to
  );
  const { data: valuation, isLoading: valuationLoading } =
    useStockValuation(branchId);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Performance, best-sellers aur stock valuation dekhein."
        action={
          isSuperAdmin ? (
            <select
              value={selectedBranch ?? ''}
              onChange={(e) => setSelectedBranch(e.target.value || null)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Sab Branches</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      <div className="mb-4 flex gap-2 border-b">
        <button
          onClick={() => setTab('salesman')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'salesman' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          Salesman Performance
        </button>
        <button
          onClick={() => setTab('products')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'products' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          Best-Selling Products
        </button>
        <button
          onClick={() => setTab('valuation')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'valuation' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          Stock Valuation
        </button>
      </div>

      {(tab === 'salesman' || tab === 'products') && (
        <div className="mb-4">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>
      )}

      {tab === 'salesman' && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Salesman</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sales Count</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Sold</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avg Sale</th>
              </tr>
            </thead>
            <tbody>
              {salesmanLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Load ho raha…</td></tr>
              ) : salesman?.salesmen.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Koi data nahi.</td></tr>
              ) : (
                salesman?.salesmen
                  .slice()
                  .sort((a, b) => b.totalSold - a.totalSold)
                  .map((s) => (
                    <tr key={s.salesmanId} className="border-t">
                      <td className="px-4 py-3">
                        <div>{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </td>
                      <td className="px-4 py-3">{s.salesCount}</td>
                      <td className="px-4 py-3">{formatMoney(s.totalSold)}</td>
                      <td className="px-4 py-3">{formatMoney(s.averageSale)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'products' && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Units Sold</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {productsLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Load ho raha…</td></tr>
              ) : products?.products.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Koi data nahi.</td></tr>
              ) : (
                products?.products.map((p) => (
                  <tr key={p.productId} className="border-t">
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.sku}</td>
                    <td className="px-4 py-3">{p.unitsSold}</td>
                    <td className="px-4 py-3">{formatMoney(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'valuation' && (
        <div className="space-y-4">
          {valuationLoading ? (
            <p className="text-sm text-muted-foreground">Load ho raha…</p>
          ) : (
            valuation && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Total Units</p>
                    <p className="text-lg font-semibold">{valuation.summary.totalUnits}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="text-lg font-semibold">{formatMoney(valuation.summary.totalValue)}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Items Without Cost</p>
                    <p className="text-lg font-semibold text-amber-600">
                      {valuation.summary.itemsWithoutCost}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Units</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valuation.byProduct.map((p) => (
                        <tr key={p.productId} className="border-t">
                          <td className="px-4 py-3">{p.name}</td>
                          <td className="px-4 py-3">{p.sku}</td>
                          <td className="px-4 py-3">{p.units}</td>
                          <td className="px-4 py-3">{formatMoney(p.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isSuperAdmin && !branchId && valuation.byBranch.length > 1 && (
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Units</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {valuation.byBranch.map((b) => (
                          <tr key={b.branchId} className="border-t">
                            <td className="px-4 py-3">
                              {branches?.find((br) => br.id === b.branchId)?.name ?? b.branchId}
                            </td>
                            <td className="px-4 py-3">{b.units}</td>
                            <td className="px-4 py-3">{formatMoney(b.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}