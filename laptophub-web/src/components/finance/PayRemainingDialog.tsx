'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAddRemainingPayment } from '@/hooks/useReceivables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/format';
import type {
  PaymentMethod,
  ReceivableSale,
} from '@/types';

interface PayRemainingDialogProps {
  sale: ReceivableSale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
}> = [
  {
    value: 'cash',
    label: 'Cash',
  },
  {
    value: 'card',
    label: 'Card',
  },
  {
    value: 'transfer',
    label: 'Bank Transfer',
  },
];

export function PayRemainingDialog({
  sale,
  open,
  onOpenChange,
}: PayRemainingDialogProps) {
  const addPayment =
    useAddRemainingPayment();

  const [method, setMethod] =
    useState<PaymentMethod>('cash');

  const [amount, setAmount] =
    useState('');

  const total = Number(sale?.total ?? 0);
  const currentPaid = Number(
    sale?.amountPaid ?? 0,
  );

  const remaining = useMemo(
    () =>
      Math.max(
        0,
        Number(
          (total - currentPaid).toFixed(2),
        ),
      ),
    [total, currentPaid],
  );

  useEffect(() => {
    if (open && sale) {
      setMethod('cash');
      setAmount(
        remaining > 0
          ? String(remaining)
          : '',
      );
    }
  }, [open, sale, remaining]);

  const enteredAmount = Number(amount);

  const isInvalidAmount =
    !Number.isFinite(enteredAmount) ||
    enteredAmount <= 0;

  const isOverpayment =
    enteredAmount > remaining + 0.01;

  const amountAfterPayment =
    currentPaid +
    (Number.isFinite(enteredAmount)
      ? enteredAmount
      : 0);

  const dueAfterPayment = Math.max(
    0,
    total - amountAfterPayment,
  );

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!sale) return;

    if (isInvalidAmount) {
      toast.error(
        'Valid payment amount enter karein.',
      );
      return;
    }

    if (isOverpayment) {
      toast.error(
        `Payment remaining amount ${formatMoney(
          remaining,
        )} se zyada nahi ho sakti.`,
      );
      return;
    }

    addPayment.mutate(
      {
        saleId: sale.id,
        method,
        amount: enteredAmount,
      },

      {
        onSuccess: () => {
          const fullyPaid =
            dueAfterPayment <= 0.01;

          toast.success(
            fullyPaid
              ? 'Remaining payment receive ho gayi. Sale fully paid hai.'
              : 'Partial remaining payment add ho gayi.',
          );

          setAmount('');
          onOpenChange(false);
        },

        onError: (error: any) => {
          const message =
            error?.response?.data?.message;

          toast.error(
            Array.isArray(message)
              ? message.join(', ')
              : message ??
                  'Payment add nahi ho saki.',
          );
        },
      },
    );
  }

  function setFullRemaining() {
    setAmount(String(remaining));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Pay Remaining
          </DialogTitle>
        </DialogHeader>

        {!sale ? null : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Invoice
                  </p>

                  <p className="font-medium">
                    {sale.invoiceNumber}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Customer
                  </p>

                  <p className="font-medium">
                    {sale.customer?.name ??
                      'Cash & Carry'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Sale Total
                </span>

                <span>
                  {formatMoney(total)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Already Collected
                </span>

                <span>
                  {formatMoney(currentPaid)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>
                  Remaining
                </span>

                <span className="text-amber-600">
                  {formatMoney(remaining)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">
                Payment Method
              </Label>

              <select
                id="payment-method"
                value={method}
                onChange={(event) =>
                  setMethod(
                    event.target
                      .value as PaymentMethod,
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {PAYMENT_METHODS.map(
                  (paymentMethod) => (
                    <option
                      key={
                        paymentMethod.value
                      }
                      value={
                        paymentMethod.value
                      }
                    >
                      {paymentMethod.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-amount">
                  Payment Amount
                </Label>

                <button
                  type="button"
                  onClick={setFullRemaining}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Pay full remaining
                </button>
              </div>

              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={remaining}
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                placeholder="Payment amount"
              />

              {isOverpayment && (
                <p className="text-xs text-red-500">
                  Amount remaining balance se
                  zyada nahi ho sakti.
                </p>
              )}
            </div>

            {enteredAmount > 0 &&
              !isOverpayment && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      New collected total
                    </span>

                    <span>
                      {formatMoney(
                        amountAfterPayment,
                      )}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between font-medium">
                    <span>
                      Remaining after payment
                    </span>

                    <span
                      className={
                        dueAfterPayment <= 0.01
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }
                    >
                      {formatMoney(
                        dueAfterPayment,
                      )}
                    </span>
                  </div>
                </div>
              )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onOpenChange(false)
                }
                disabled={
                  addPayment.isPending
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  addPayment.isPending ||
                  isInvalidAmount ||
                  isOverpayment
                }
              >
                {addPayment.isPending
                  ? 'Adding Payment…'
                  : 'Add Payment'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}