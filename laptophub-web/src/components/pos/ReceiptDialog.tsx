'use client';

import { useReceipt } from '@/hooks/useReceipt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';

interface ReceiptDialogProps {
  saleId: string | null;
  onOpenChange: (v: boolean) => void;
}

export function ReceiptDialog({ saleId, onOpenChange }: ReceiptDialogProps) {
  const { data: receipt, isLoading, isError } = useReceipt(saleId);

  return (
    <Dialog open={!!saleId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Load ho raha…</p>
        )}
        {isError && (
          <p className="text-sm text-red-500">Receipt load nahi hui.</p>
        )}

        {receipt && (
          <>
            <div id="receipt-print-area" className="space-y-3 text-sm">
              <div className="text-center">
                <p className="font-semibold">{receipt.branch.name}</p>
                {receipt.branch.address && (
                  <p className="text-xs text-muted-foreground">
                    {receipt.branch.address}
                  </p>
                )}
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{receipt.invoiceNumber}</span>
                <span>{new Date(receipt.date).toLocaleString()}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                Salesman: {receipt.salesman}
                {receipt.customer && (
                  <div>Customer: {receipt.customer.name}</div>
                )}
              </div>

              <div className="border-t pt-2">
                {receipt.items.map((item, i) => (
                  <div key={i} className="mb-1 flex justify-between">
                    <div>
                      <div>{item.description}</div>
                      {item.serialNumber && (
                        <div className="text-xs text-muted-foreground">
                          {item.serialNumber}
                        </div>
                      )}
                    </div>
                    <span>{formatMoney(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>{formatMoney(receipt.totalDiscount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(receipt.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{formatMoney(receipt.amountPaid)}</span>
                </div>
                {receipt.balanceDue > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Balance Due</span>
                    <span>{formatMoney(receipt.balanceDue)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-2 text-xs text-muted-foreground">
                {receipt.payments.map((p, i) => (
                  <div key={i} className="flex justify-between capitalize">
                    <span>{p.method}</span>
                    <span>{formatMoney(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => window.print()}
            >
              Print Receipt
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}