'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useResetUserPassword } from '@/hooks/useUsers';
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
import type { User } from '@/types';

interface ResetPasswordDialogProps {
  user: User | null;
  onOpenChange: (v: boolean) => void;
}

export function ResetPasswordDialog({ user, onOpenChange }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const resetPassword = useResetUserPassword();

  useEffect(() => {
    if (user) {
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [user]);

  function onSubmit() {
    if (!user) return;
    if (newPassword.length < 6) {
      toast.error('Password kam se kam 6 characters ka ho');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password match nahi kar rahe');
      return;
    }

    resetPassword.mutate(
      { userId: user.id, newPassword },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Reset nahi ho paya'),
      }
    );
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Reset Karein</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          <strong>{user?.name ?? user?.email}</strong> ka naya password set
          karein. Unko purana password batane ki zaroorat nahi.
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="newPassword">Naya Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Naya Password (dobara)</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={resetPassword.isPending}>
            {resetPassword.isPending ? 'Reset ho raha…' : 'Password Reset Karein'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}