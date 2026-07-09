'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePaySupplier } from '@/hooks/usePurchaseOrders';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import type { PurchaseOrder } from '@/types';

interface PaySupplierDialogProps {
  po: PurchaseOrder | null;
  onClose: () => void;
}

const METHODS = ['cash', 'bank transfer', 'cheque'];

export function PaySupplierDialog({ po, onClose }: PaySupplierDialogProps) {
  const paySupplier = usePaySupplier();
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState('');

  const due = po ? Number(po.totalCost) - Number(po.amountPaid) : 0;

  function reset() {
    setMethod('cash');
    setAmount('');
  }

  function onSubmit() {
    if (!po) return;
    const val = Number(amount);
    if (!val || val <= 0) {
      toast.error('Amount daalein');
      return;
    }
    if (val > due + 0.01) {
      toast.error(`Amount baqi (${formatMoney(due)}) se zyada nahi ho sakta`);
      return;
    }

    paySupplier.mutate(
      { poId: po.id, method, amount: val },
      {
        onSuccess: () => {
          toast.success('Payment ho gaya');
          reset();
          onClose();
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Payment fail hua'),
      }
    );
  }

  return (
    <Dialog open={!!po} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supplier Payment — {po?.poNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span>{po && formatMoney(po.totalCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span>{po && formatMoney(po.amountPaid)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Baqi (Due)</span>
            <span className="text-amber-600">{formatMoney(due)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Method</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={paySupplier.isPending || due <= 0}>
            {paySupplier.isPending ? 'Processing…' : 'Payment Confirm Karein'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}