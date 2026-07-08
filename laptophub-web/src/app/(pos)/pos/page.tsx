'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useCreateSale } from '@/hooks/useSale';
import { ScanInput } from '@/components/pos/ScanInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import type { StockItem , Customer } from '@/types';
import { CustomerLookup } from '@/components/pos/CustomerLookup';
import { PaymentPanel, PaymentLine } from '@/components/pos/PaymentPanel';
import { ReceiptDialog } from '@/components/pos/ReceiptDialog';

interface CartLine {
  item: StockItem;
  price: number;
  discount: number;
}

export default function PosPage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();

  const canPickBranch =
    user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_MANAGER';
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    canPickBranch ? null : user?.branchId ?? null
  );
  const branchId = canPickBranch ? selectedBranch : user?.branchId ?? null;

  const [cart, setCart] = useState<CartLine[]>([]);
  const createSale = useCreateSale(branchId);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);

  function addItem(item: StockItem) {
    setCart((prev) => [...prev, { item, price: 0, discount: 0 }]);
  }
  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.item.id !== id));
  }
  function updateLine(id: string, field: 'price' | 'discount', value: number) {
    setCart((prev) =>
      prev.map((l) => (l.item.id === id ? { ...l, [field]: value } : l))
    );
  }

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + (l.price - l.discount) * l.item.quantity, 0),
    [cart]
  );

  const canDoPartial =
    user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_MANAGER';
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const isPartial = paidTotal < subtotal - 0.01;

  function completeSale() {
    if (!branchId) {
      toast.error('Branch chunein');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart khaali hai');
      return;
    }
    if (cart.some((l) => l.price <= 0)) {
      toast.error('Har item ka price daalein');
      return;
    }
    if (payments.length === 0) {
      toast.error('Kam se kam ek payment daalein');
      return;
    }
    if (isPartial && !canDoPartial) {
      toast.error('Udhaar sirf Manager ya Admin kar sakte hain. Poora payment lें.');
      return;
    }
    if (isPartial && canDoPartial && !customer) {
      toast.error('Udhaar sale ke liye customer zaroori hai.');
      return;
    }
    if (paidTotal > subtotal + 0.01) {
      toast.error('Payment total se zyada hai.');
      return;
    }

    createSale.mutate(
      {
        branchId,
        customerId: customer?.id,
        lines: cart.map((l) => ({
          stockItemId: l.item.id,
          price: l.price,
          discount: l.discount,
          quantity: l.item.quantity,
        })),
        payments,
      },
      {
        onSuccess: (sale) => {
          toast.success(`Sale complete — ${sale.invoiceNumber}`);
          setCart([]);
          setCustomer(null);
          setPayments([]);
          setReceiptSaleId(sale.id);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Sale fail hui'),
      }
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: scan + cart */}
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        {canPickBranch && (
          <select
            value={selectedBranch ?? ''}
            onChange={(e) => setSelectedBranch(e.target.value || null)}
            className="mb-3 max-w-xs rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Branch chunein…</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        {!branchId ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Sale shuru karne ke liye branch chunein.
          </div>
        ) : (
          <>
            <ScanInput
              branchId={branchId}
              onPick={addItem}
              disabledIds={cart.map((l) => l.item.id)}
            />

            <div className="mt-4 flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                  Item scan ya search karke cart mein add karein.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2">Item</th>
                      <th className="py-2">Price</th>
                      <th className="py-2">Discount</th>
                      <th className="py-2">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => (
                      <tr key={l.item.id} className="border-t">
                        <td className="py-2">
                          <div className="font-medium">
                            {l.item.product.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {l.item.product.sku}
                            {l.item.serialNumber
                              ? ` · ${l.item.serialNumber}`
                              : ''}
                          </div>
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            value={l.price || ''}
                            onChange={(e) =>
                              updateLine(
                                l.item.id,
                                'price',
                                Number(e.target.value)
                              )
                            }
                            className="w-28"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            value={l.discount || ''}
                            onChange={(e) =>
                              updateLine(
                                l.item.id,
                                'discount',
                                Number(e.target.value)
                              )
                            }
                            className="w-24"
                          />
                        </td>
                        <td className="py-2">
                          {formatMoney(l.price - l.discount)}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => removeLine(l.item.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: summary + pay */}
      <div className="w-80 shrink-0 overflow-y-auto border-l p-4">
        <h2 className="mb-4 text-lg font-semibold">Summary</h2>

        <div className="mb-4">
          <p className="mb-1 text-sm font-medium">Customer (optional)</p>
          <CustomerLookup
            attached={customer}
            onAttach={setCustomer}
            onClear={() => setCustomer(null)}
          />
        </div>

        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Items</span>
          <span>{cart.length}</span>
        </div>
        <div className="mb-4 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatMoney(subtotal)}</span>
        </div>

        <p className="mb-1 text-sm font-medium">Payment</p>
        <PaymentPanel
          total={subtotal}
          payments={payments}
          onChange={setPayments}
          canDoPartial={canDoPartial}
          hasCustomer={!!customer}
        />

        <Button
          className="mt-4 w-full"
          disabled={createSale.isPending || cart.length === 0}
          onClick={completeSale}
        >
          {createSale.isPending ? 'Processing…' : 'Complete Sale'}
        </Button>
      </div>
      <ReceiptDialog
        saleId={receiptSaleId}
        onOpenChange={(v) => !v && setReceiptSaleId(null)}
      />
    </div>
  );
}