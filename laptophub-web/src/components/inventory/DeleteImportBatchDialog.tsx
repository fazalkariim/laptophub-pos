'use client';

import { toast } from 'sonner';
import { useDeleteImportBatch } from '@/hooks/useImportBatches';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { ImportBatchSummary } from '@/types';

interface DeleteImportBatchDialogProps {
  batch: ImportBatchSummary | null;
  onOpenChange: (v: boolean) => void;
}

export function DeleteImportBatchDialog({
  batch,
  onOpenChange,
}: DeleteImportBatchDialogProps) {
  const deleteBatch = useDeleteImportBatch();

  function onConfirm() {
    if (!batch) return;
    deleteBatch.mutate(batch.id, {
      onSuccess: () => {
        toast.success('Upload history delete kar di gayi');
        onOpenChange(false);
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message ?? 'Delete nahi ho paya'),
    });
  }

  return (
    <Dialog open={!!batch} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <strong>{batch?.fileName}</strong> ka upload-record yahan se hat
          jaayega. Is se koi stock delete nahi hoga — jo laptops is file se
          successfully add hue the, wo Inventory mein waise hi rahenge. Sirf
          ye "kab upload hua tha" wali history mit jaayegi.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteBatch.isPending}
          >
            {deleteBatch.isPending ? 'Delete ho raha…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}