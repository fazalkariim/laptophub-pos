'use client';

import { toast } from 'sonner';
import { useDeleteUser } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { User } from '@/types';

interface DeleteUserDialogProps {
  user: User | null;
  onOpenChange: (v: boolean) => void;
}

export function DeleteUserDialog({ user, onOpenChange }: DeleteUserDialogProps) {
  const deleteUser = useDeleteUser();

  function onConfirm() {
    if (!user) return;
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        toast.success('User delete kar diya gaya');
        onOpenChange(false);
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message ?? 'Delete nahi ho paya'),
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User delete karein?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {user?.name ?? user?.email} deactivate ho jaayega. Ye login nahi kar
          payega, par uski purani sales/records mehfooz rahenge.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending ? 'Delete ho raha…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}