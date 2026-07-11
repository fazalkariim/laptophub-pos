'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { PageHeader } from '@/components/shared/PageHeader';
import { POStatusBadge } from '@/components/purchasing/POStatusBadge';
import { ReceiveGoodsDialog } from '@/components/purchasing/ReceiveGoodsDialog';
import { PaySupplierDialog } from '@/components/purchasing/PaySupplierDialog';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: po, isLoading, isError } = usePurchaseOrder(id);
  const [showReceive, setShowReceive] = useState(false);
  const [showPay, setShowPay] = useState(false);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Load ho raha…</p>;
  }
  if (isError) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/purchasing/orders')}>
          ← Purchase Orders
        </Button>
        <p className="mt-4 text-sm text-red-500">
          PO load nahi ho paya. Connection check karein ya permission verify karein.
        </p>
      </div>
    );
  }
  if (!po) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/purchasing/orders')}>
          ← Purchase Orders
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">PO nahi mila.</p>
      </div>
    );
  }

  const canReceive =
    (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') &&
    po.lines.some((l) => l.receivedQty < l.quantity);
  const due = Number(po.totalCost) - Number(po.amountPaid);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.push('/purchasing/orders')}>
        ← Purchase Orders
      </Button>

      <PageHeader
        title={po.poNumber}
        description={po.supplier?.name ?? po.supplierId}
        action={
          <div className="flex gap-2">
            {canReceive && (
              <Button onClick={() => setShowReceive(true)}>
                Receive Goods
              </Button>
            )}
            {due > 0 && (
              <Button variant="inverted" onClick={() => setShowPay(true)}>
                Pay Supplier
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <POStatusBadge status={po.status} />
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">{formatMoney(po.totalCost)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-lg font-semibold">{formatMoney(po.amountPaid)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Due</p>
          <p className={`text-lg font-semibold ${due > 0 ? 'text-amber-600' : ''}`}>
            {formatMoney(due)}
          </p>
        </div>
      </div>

      {po.note && (
        <p className="mb-4 text-sm text-muted-foreground">Note: {po.note}</p>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Product
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Ordered
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Received
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Cost/unit
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-3">
                  {l.product?.model ?? l.productId}
                </td>
                <td className="px-4 py-3">{l.quantity}</td>
                <td className="px-4 py-3">
                  {l.receivedQty}
                  {l.receivedQty < l.quantity && (
                    <span className="ml-1 text-xs text-amber-600">
                      ({l.quantity - l.receivedQty} baaki)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatMoney(l.costPrice)}</td>
                <td className="px-4 py-3">
                  {formatMoney(Number(l.costPrice) * l.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReceiveGoodsDialog po={showReceive ? po : null} onClose={() => setShowReceive(false)} />
      <PaySupplierDialog po={showPay ? po : null} onClose={() => setShowPay(false)} />
    </div>
  );
}