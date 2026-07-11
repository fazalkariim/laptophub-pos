'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useReceivePO } from '@/hooks/usePurchaseOrders';
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
import type { PurchaseOrder } from '@/types';

interface ReceiveGoodsDialogProps {
  po: PurchaseOrder | null;
  onClose: () => void;
}

export function ReceiveGoodsDialog({ po, onClose }: ReceiveGoodsDialogProps) {
  const receivePO = useReceivePO();
  // Har line ke liye current serial-input aur added-serials list
  const [serialInputs, setSerialInputs] = useState<Record<string, string>>({});
  const [serialLists, setSerialLists] = useState<Record<string, string[]>>({});

  function addSerial(lineId: string) {
    const val = (serialInputs[lineId] ?? '').trim();
    if (!val) return;
    setSerialLists((prev) => ({
      ...prev,
      [lineId]: [...(prev[lineId] ?? []), val],
    }));
    setSerialInputs((prev) => ({ ...prev, [lineId]: '' }));
  }

  function removeSerial(lineId: string, index: number) {
    setSerialLists((prev) => ({
      ...prev,
      [lineId]: prev[lineId].filter((_, i) => i !== index),
    }));
  }

  function reset() {
    setSerialInputs({});
    setSerialLists({});
  }

  function onSubmit() {
    if (!po) return;
    const lines = po.lines
      .map((l) => ({
        poLineId: l.id,
        serials: serialLists[l.id] ?? [],
        quantity: 0,
      }))
      .filter((l) => l.serials.length > 0);

    if (lines.length === 0) {
      toast.error('Kam se kam ek serial scan karein');
      return;
    }

    receivePO.mutate(
      { poId: po.id, lines },
      {
        onSuccess: () => {
          toast.success('Goods receive ho gaye — stock mein add ho gaya');
          reset();
          onClose();
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Receive fail hua'),
      }
    );
  }

  return (
    <Dialog open={!!po} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Goods Receive Karein — {po?.poNumber}</DialogTitle>
        </DialogHeader>

        <div className="max-h-96 space-y-4 overflow-y-auto">
          {po?.lines.map((line) => {
            const remaining = line.quantity - line.receivedQty;
            const added = serialLists[line.id] ?? [];
            return (
              <div key={line.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {line.product?.model ?? line.productId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Ordered: {line.quantity} · Received: {line.receivedQty} ·
                    Baaki: {remaining}
                  </span>
                </div>

                {remaining <= 0 ? (
                  <p className="text-xs text-green-600">
                    Poora receive ho chuka hai.
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Serial scan/type karein…"
                        value={serialInputs[line.id] ?? ''}
                        onChange={(e) =>
                          setSerialInputs((prev) => ({
                            ...prev,
                            [line.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSerial(line.id);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="tertiary"
                        onClick={() => addSerial(line.id)}
                      >
                        Add
                      </Button>
                    </div>
                    {added.length > remaining && (
                      <p className="mt-1 text-xs text-red-500">
                        Order se zyada serials add ho gaye ({added.length}/
                        {remaining})
                      </p>
                    )}
                    {added.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {added.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs"
                          >
                            {s}
                            <button
                              onClick={() => removeSerial(line.id, i)}
                              className="text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={receivePO.isPending}>
            {receivePO.isPending ? 'Receive ho raha…' : 'Receive Confirm Karein'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}