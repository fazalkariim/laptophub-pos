'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';

export interface PaymentLine {
  method: string;
  amount: number;
}

const METHODS = ['cash', 'card', 'transfer'];

interface PaymentPanelProps {
  total: number;
  payments: PaymentLine[];
  onChange: (payments: PaymentLine[]) => void;
  canDoPartial: boolean; // Manager/Admin true, Salesman false
  hasCustomer: boolean;
}

export function PaymentPanel({
  total,
  payments,
  onChange,
  canDoPartial,
  hasCustomer,
}: PaymentPanelProps) {
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState('');

  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - paidTotal);
  const isPartial = paidTotal < total - 0.01;
  const isOverpaid = paidTotal > total + 0.01;
  const amountInputRef = useRef<HTMLInputElement>(null);

function addPayment() {
    const val = Number(amount);
    if (!val || val <= 0) return;
    onChange([...payments, { method, amount: val }]);
    setAmount('');
    amountInputRef.current?.focus(); // ye line add karo
  }

  function removePayment(index: number) {
    onChange(payments.filter((_, i) => i !== index));
  }

  function payFullRemaining() {
    if (remaining <= 0) return;
    onChange([...payments, { method, amount: remaining }]);
    setAmount('');
  }

  return (
    <div className="space-y-3">
      {/* Existing payment lines */}
      {payments.length > 0 && (
        <ul className="space-y-1">
          {payments.map((p, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
            >
              <span className="capitalize">{p.method}</span>
              <span>{formatMoney(p.amount)}</span>
              <button
                onClick={() => removePayment(i)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new payment line */}
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-md border px-2 py-2 text-sm"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
          <Input
          ref={amountInputRef}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="flex-1"
        />
        <Button type="button" variant="tertiary" onClick={addPayment} data-testid="add-payment-button">
          Add
        </Button>
      </div>

      {remaining > 0 && (
        <button
          onClick={payFullRemaining}
          className="text-xs text-primary hover:underline"
        >
          Baqi {formatMoney(remaining)} bhi isi method se add karein
        </button>
      )}

      {/* Status */}
      <div className="space-y-1 rounded-md border p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span>{formatMoney(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span>{formatMoney(paidTotal)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Baqi (Due)</span>
          <span className={remaining > 0 ? 'text-amber-600' : 'text-green-600'}>
            {formatMoney(remaining)}
          </span>
        </div>
      </div>

      {isOverpaid && (
        <p className="text-xs text-red-500">
          Payment total se zyada hai — kam karein.
        </p>
      )}

      {isPartial && !isOverpaid && (
        <>
          {!canDoPartial ? (
            <p className="text-xs text-red-500">
              Udhaar / partial payment sirf Manager ya Admin kar sakte hain.
              Poora payment lें.
            </p>
          ) : !hasCustomer ? (
            <p className="text-xs text-amber-600">
              Udhaar sale ke liye customer zaroori hai — pehle customer
              attach karein.
            </p>
          ) : (
            <p className="text-xs text-amber-600">
              Ye udhaar (partial) sale banegi — baqi {formatMoney(remaining)}{' '}
              baad mein collect karna hoga.
            </p>
          )}
        </>
      )}
    </div>
  );
}