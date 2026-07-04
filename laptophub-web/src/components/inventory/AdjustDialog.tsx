'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAdjustStock } from '@/hooks/useStock';
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
import type { StockItem } from '@/types';

const STATUSES = ['IN_STOCK', 'SOLD', 'IN_TRANSIT', 'RESERVED', 'RETURNED'] as const;

const schema = z.object({
  quantityChange: z.coerce
    .number()
    .int('Poora number daalein')
    .refine((v) => v !== 0, 'Change 0 nahi ho sakta'),
  reason: z.string().min(2, 'Reason likhein'),
  newStatus: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AdjustDialogProps {
  item: StockItem | null;
  branchId: string | null;
  onOpenChange: (v: boolean) => void;
}

export function AdjustDialog({ item, branchId, onOpenChange }: AdjustDialogProps) {
  const adjust = useAdjustStock(branchId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
  });

  useEffect(() => {
    if (item) {
      reset({ quantityChange: 0, reason: '', newStatus: '' });
    }
  }, [item, reset]);

  function onSubmit(values: FormValues) {
    if (!item) return;
    adjust.mutate(
      {
        stockItemId: item.id,
        quantityChange: values.quantityChange,
        reason: values.reason,
        newStatus: values.newStatus || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Stock adjust ho gaya');
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Adjustment nahi hui'),
      }
    );
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock Adjust</DialogTitle>
        </DialogHeader>

        {item && (
          <p className="text-sm text-muted-foreground">
            {item.product.model} · {item.product.sku}
            {item.serialNumber ? ` · ${item.serialNumber}` : ''} · abhi qty:{' '}
            {item.quantity}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="quantityChange">
              Quantity Change (jaise -2 kam, +1 zyada)
            </Label>
            <Input
              id="quantityChange"
              type="number"
              {...register('quantityChange')}
            />
            {errors.quantityChange && (
              <p className="text-xs text-red-500">
                {errors.quantityChange.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="newStatus">New Status (optional)</Label>
            <select
              id="newStatus"
              {...register('newStatus')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Status same rakhein</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="jaise: 2 units damaged"
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-xs text-red-500">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={adjust.isPending}>
              {adjust.isPending ? 'Adjust ho raha…' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}