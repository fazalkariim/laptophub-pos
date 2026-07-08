'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useCustomerDetail,
  useCustomerHistory,
  useCustomerWarranties,
} from '@/hooks/useCustomers';
import { PageHeader } from '@/components/shared/PageHeader';
import { WarrantyCard } from '@/components/customers/WarrantyCard';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tab, setTab] = useState<'history' | 'warranties'>('history');

  const { data: customer, isLoading: customerLoading } = useCustomerDetail(id);
  const { data: history, isLoading: historyLoading } = useCustomerHistory(id);
  const { data: warranties, isLoading: warrantiesLoading } =
    useCustomerWarranties(id);

  if (customerLoading) {
    return <p className="text-sm text-muted-foreground">Load ho raha…</p>;
  }
  if (!customer) {
    return <p className="text-sm text-red-500">Customer nahi mila.</p>;
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
        ← Customers
      </Button>

      <PageHeader
        title={customer.name}
        description={customer.contact ?? 'No contact'}
      />

      {/* Summary cards */}
      {history && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Purchased</p>
            <p className="text-lg font-semibold">
              {formatMoney(history.summary.totalPurchased)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold">
              {formatMoney(history.summary.totalPaid)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Due</p>
            <p
              className={`text-lg font-semibold ${
                history.summary.totalDue > 0 ? 'text-amber-600' : ''
              }`}
            >
              {formatMoney(history.summary.totalDue)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Sales Count</p>
            <p className="text-lg font-semibold">{history.summary.salesCount}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b">
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'history'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Purchase History
        </button>
        <button
          onClick={() => setTab('warranties')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'warranties'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Warranties
        </button>
      </div>

      {tab === 'history' ? (
        historyLoading ? (
          <p className="text-sm text-muted-foreground">Load ho raha…</p>
        ) : !history || history.history.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Koi purchase history nahi hai.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Due
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.history.map((sale) => (
                  <tr key={sale.saleId} className="border-t">
                    <td className="px-4 py-3">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{sale.items.join(', ')}</td>
                    <td className="px-4 py-3">{formatMoney(sale.total)}</td>
                    <td className="px-4 py-3">
                      {sale.due > 0 ? (
                        <span className="text-amber-600">
                          {formatMoney(sale.due)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {sale.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : warrantiesLoading ? (
        <p className="text-sm text-muted-foreground">Load ho raha…</p>
      ) : !warranties || warranties.warranties.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Koi warranty nahi hai.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {warranties.warranties.map((w) => (
            <WarrantyCard key={w.id} w={w} />
          ))}
        </div>
      )}
    </div>
  );
}