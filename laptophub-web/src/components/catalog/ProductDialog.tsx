'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useCatalog';
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
import type { Product } from '@/types';

const schema = z.object({
  sku: z.string().min(1, 'SKU zaroori hai'),
  model: z.string().min(2, 'Model kam se kam 2 characters'),
  brand: z.string().optional(),
  category: z.string().optional(),
  specs: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProductDialogProps {
  product?: Product; // diya to edit, warna create
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ProductDialog({
  product,
  open,
  onOpenChange,
}: ProductDialogProps) {
  const isEdit = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

 const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
  });

  // Jab dialog khule, edit mode mein product ki values bhar do
 useEffect(() => {
    if (open) {
      reset({
        sku: product?.sku ?? '',
        model: product?.model ?? '',
        brand: product?.brand ?? '',
        category: product?.category ?? '',
        specs: product?.specs ?? '',
      });
    }
  }, [open, product, reset]);

  function onSubmit(values: FormValues) {
    if (isEdit && product) {
      updateProduct.mutate(
        { id: product.id, ...values },
        {
          onSuccess: () => {
            toast.success('Product update ho gaya');
            onOpenChange(false);
          },
          onError: (err: any) =>
            toast.error(err?.response?.data?.message ?? 'Update error'),
        }
      );
    } else {
      createProduct.mutate(values, {
        onSuccess: () => {
          toast.success('Product ban gaya');
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Create error'),
      });
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Product Edit' : 'Naya Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
         <div className="space-y-1">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} />
            {errors.sku && (
              <p className="text-xs text-red-500">{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="model">Model</Label>
            <Input id="model" {...register('model')} />
            {errors.model && (
              <p className="text-xs text-red-500">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="brand">Brand (optional)</Label>
            <Input id="brand" {...register('brand')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="category">Category (optional)</Label>
            <Input id="category" {...register('category')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="specs">Specs (optional)</Label>
            <Input id="specs" {...register('specs')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Save ho raha…' : isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

