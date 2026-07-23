'use client';

import { Printer } from 'lucide-react';
import { useBillReceipt } from '@/hooks/useBills';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/format';

interface BillDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function money(value: string | number | undefined) {
  return formatMoney(Number(value ?? 0));
}

function formatDate(value: string | undefined) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function BillDialog({
  saleId,
  open,
  onOpenChange,
}: BillDialogProps) {
  const {
    data: receipt,
    isLoading,
    isError,
  } = useBillReceipt(saleId, open);

  function printBill() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto print:max-h-none print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Sale Bill</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Bill load ho raha hai…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
            Bill load nahi ho saka.
          </div>
        )}

        {receipt && (
          <div
            id="printable-bill"
            className="space-y-6 bg-background p-2 print:p-0"
          >
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold">
                  LaptopHub
                </h2>

                <p className="text-sm text-muted-foreground">
                  {receipt.branch?.name ?? 'Branch'}
                </p>

                {receipt.branch?.address && (
                  <p className="text-sm text-muted-foreground">
                    {receipt.branch.address}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Invoice
                </p>

                <p className="font-semibold">
                  {receipt.invoiceNumber}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(receipt.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Customer
                </p>
                <p className="font-medium">
                  {receipt.customer?.name ??
                    'Cash & Carry Customer'}
                </p>
                <p className="text-muted-foreground">
                  {receipt.customer?.contact ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Salesperson
                </p>
                <p className="font-medium">
                  {receipt.salesman?.name ??
                    receipt.salesman?.email ??
                    '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Payment Status
                </p>
                <p className="font-medium">
                  {receipt.paymentStatus ?? '—'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      Item
                    </th>
                    <th className="px-3 py-3 text-left">
                      Serial
                    </th>
                    <th className="px-3 py-3 text-right">
                      Qty
                    </th>
                    <th className="px-3 py-3 text-right">
                      Price
                    </th>
                    <th className="px-3 py-3 text-right">
                      Discount
                    </th>
                    <th className="px-3 py-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {receipt.items?.map((item, index) => {
                    const quantity = Number(item.quantity ?? 1);
                    const price = Number(item.price ?? 0);
                    const discount = Number(
                      item.discount ?? 0,
                    );

                    const lineTotal =
                      item.total !== undefined
                        ? Number(item.total)
                        : price * quantity - discount;

                    return (
                      <tr
                        key={`${item.serialNumber ?? 'item'}-${index}`}
                        className="border-t"
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium">
                            {item.model ??
                              item.name ??
                              'Product'}
                          </p>

                          {(item.brand || item.sku) && (
                            <p className="text-xs text-muted-foreground">
                              {[item.brand, item.sku]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {item.serialNumber ?? '—'}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {quantity}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {money(price)}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {money(discount)}
                        </td>

                        <td className="px-3 py-3 text-right font-medium">
                          {money(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal
                </span>
                <span>{money(receipt.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount
                </span>
                <span>
                  {money(receipt.totalDiscount)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{money(receipt.total)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Amount Collected
                </span>
                <span>
                  {money(
                    receipt.amountPaid ??
                      receipt.paidTotal,
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Remaining
                </span>
                <span>
                  {money(
                    Number(receipt.total ?? 0) -
                      Number(
                        receipt.amountPaid ??
                          receipt.paidTotal ??
                          0,
                      ),
                  )}
                </span>
              </div>
            </div>

            {receipt.payments &&
              receipt.payments.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Payments
                  </h3>

                  <div className="space-y-2">
                    {receipt.payments.map(
                      (payment, index) => (
                        <div
                          key={`${payment.method}-${index}`}
                          className="flex justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                        >
                          <span className="capitalize">
                            {payment.method}
                          </span>
                          <span>
                            {money(payment.amount)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            <div className="flex justify-end print:hidden">
              <Button onClick={printBill}>
                <Printer className="mr-2 h-4 w-4" />
                Print Bill
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}