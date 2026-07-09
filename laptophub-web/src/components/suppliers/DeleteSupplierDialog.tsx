'use client';

import { toast } from 'sonner';
import { useDeleteSupplier } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Supplier } from '@/types';

interface DeleteSupplierDialogProps {
  supplier: Supplier | null;
  onOpenChange: (v: boolean) => void;
}

export function DeleteSupplierDialog({
  supplier,
  onOpenChange,
}: DeleteSupplierDialogProps) {
  const deleteSupplier = useDeleteSupplier();

  function onConfirm() {
    if (!supplier) return;
    deleteSupplier.mutate(supplier.id, {
      onSuccess: () => {
        toast.success('Supplier delete ho gaya');
        onOpenChange(false);
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message ?? 'Delete error'),
    });
  }

  return (
    <Dialog open={!!supplier} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supplier delete karein?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {supplier?.name} delete ho jaayega (soft delete — recover ho sakta
          hai).
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteSupplier.isPending}
          >
            {deleteSupplier.isPending ? 'Delete ho raha…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}