'use client';

import { toast } from 'sonner';
import { useDeleteProduct } from '@/hooks/useCatalog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Product } from '@/types';

interface DeleteProductDialogProps {
  product: Product | null;
  onOpenChange: (v: boolean) => void;
}

export function DeleteProductDialog({
  product,
  onOpenChange,
}: DeleteProductDialogProps) {
  const deleteProduct = useDeleteProduct();

  function onConfirm() {
    if (!product) return;
    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        toast.success('Product delete ho gaya');
        onOpenChange(false);
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message ?? 'Delete error'),
    });
  }

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Product delete karein?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {product?.model} ({product?.sku}) delete ho jaayega. Ye wapas nahi
          aayega.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteProduct.isPending}
          >
            {deleteProduct.isPending ? 'Delete ho raha…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}