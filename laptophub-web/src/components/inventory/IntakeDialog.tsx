'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAddStock } from '@/hooks/useStock';
import { useAllProducts } from '@/hooks/useCatalog';
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

const schema = z.object({
  productId: z.string().min(1, 'Product chunein'),
  serialNumber: z.string().optional(),
  quantity: z.coerce.number().int().positive('Quantity 0 se zyada honi chahiye'),
  costPrice: z.coerce.number().nonnegative().optional(),
});

type FormValues = z.infer<typeof schema>;

interface IntakeDialogProps {
  branchId: string;
}

export function IntakeDialog({ branchId }: IntakeDialogProps) {
  const [open, setOpen] = useState(false);
  const addStock = useAddStock();
  const { data: products } = useAllProducts();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { quantity: 1 },
  });

  useEffect(() => {
    if (open) reset({ quantity: 1 });
  }, [open, reset]);

  function onSubmit(values: FormValues) {
    addStock.mutate(
      {
        branchId,
        productId: values.productId,
        serialNumber: values.serialNumber || undefined,
        quantity: values.quantity,
        costPrice: values.costPrice,
      },
      {
        onSuccess: () => {
          toast.success('Stock add ho gaya');
          reset({ quantity: 1 });
          setOpen(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Stock add nahi hua'),
      }
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Stock</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nayi Stock (Manual Intake)</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="productId">Product</Label>
              <select
                id="productId"
                {...register('productId')}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Product chunein…</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.model} — {p.sku}
                  </option>
                ))}
              </select>
              {errors.productId && (
                <p className="text-xs text-red-500">
                  {errors.productId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="serialNumber">Serial Number (optional)</Label>
              <Input id="serialNumber" {...register('serialNumber')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="text-xs text-red-500">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="costPrice">Cost Price (optional)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                {...register('costPrice')}
              />
              {errors.costPrice && (
                <p className="text-xs text-red-500">
                  {errors.costPrice.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={addStock.isPending}>
                {addStock.isPending ? 'Add ho raha…' : 'Add Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}