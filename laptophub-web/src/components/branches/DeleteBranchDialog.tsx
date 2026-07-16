'use client';

import { toast } from 'sonner';
import { useDeleteBranch } from '@/hooks/useBranches';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Branch } from '@/types';

interface DeleteBranchDialogProps {
  branch: Branch | null;
  onOpenChange: (v: boolean) => void;
}

export function DeleteBranchDialog({ branch, onOpenChange }: DeleteBranchDialogProps) {
  const deleteBranch = useDeleteBranch();

  function onConfirm() {
    if (!branch) return;
    deleteBranch.mutate(branch.id, {
      onSuccess: () => {
        toast.success('Branch delete kar di gayi');
        onOpenChange(false);
      },
      onError: (err: any) =>
        toast.error(
          err?.response?.data?.message ?? 'Branch delete nahi ho payi'
        ),
    });
  }

  return (
    <Dialog open={!!branch} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Branch delete karein?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {branch?.name} deactivate ho jaayegi. Agar is branch mein active
          staff ya stock hai, to delete nahi hoga — pehle unhe move karna
          hoga.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteBranch.isPending}
          >
            {deleteBranch.isPending ? 'Delete ho raha…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}