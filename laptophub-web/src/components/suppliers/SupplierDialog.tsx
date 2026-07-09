'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';
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
import type { Supplier } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Naam kam se kam 2 characters'),
  contact: z.string().optional(),
  terms: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SupplierDialogProps {
  supplier?: Supplier;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SupplierDialog({
  supplier,
  open,
  onOpenChange,
}: SupplierDialogProps) {
  const isEdit = !!supplier;
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        name: supplier?.name ?? '',
        contact: supplier?.contact ?? '',
        terms: supplier?.terms ?? '',
      });
    }
  }, [open, supplier, reset]);

  function onSubmit(values: FormValues) {
    if (isEdit && supplier) {
      updateSupplier.mutate(
        { id: supplier.id, ...values },
        {
          onSuccess: () => {
            toast.success('Supplier update ho gaya');
            onOpenChange(false);
          },
          onError: (err: any) =>
            toast.error(err?.response?.data?.message ?? 'Update error'),
        }
      );
    } else {
      createSupplier.mutate(values, {
        onSuccess: () => {
          toast.success('Supplier ban gaya');
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Create error'),
      });
    }
  }

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Supplier Edit' : 'Naya Supplier'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Naam</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="contact">Contact (optional)</Label>
            <Input id="contact" {...register('contact')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="terms">Terms (optional)</Label>
            <Input
              id="terms"
              placeholder="jaise: 30 days credit"
              {...register('terms')}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Save ho raha…'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}