'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useUpdateUser, useUsers } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/lib/auth';
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

const ROLES = ['BRANCH_MANAGER', 'ACCOUNTANT', 'SALESMAN'] as const;

interface FormValues {
  name: string;
  role: string;
  branchId: string;
  isActive: boolean;
}

interface EditUserDialogProps {
  user: User | null;
  onOpenChange: (v: boolean) => void;
}

export function EditUserDialog({ user, onOpenChange }: EditUserDialogProps) {
  const currentUser = useAuth((s) => s.user);
  const updateUser = useUpdateUser();
  const { data: branches } = useBranches();
  const { data: allUsers } = useUsers();

  const { register, handleSubmit, watch, reset } = useForm<FormValues>();
  const selectedRole = watch('role');

  const isSelf = user?.id === currentUser?.id;

  // Branches jinka pehle se manager hai (is user ko chhod ke)
  const branchesWithManager = useMemo(() => {
    const set = new Set<string>();
    allUsers?.forEach((u) => {
      if (u.role === 'BRANCH_MANAGER' && u.branchId && u.id !== user?.id) {
        set.add(u.branchId);
      }
    });
    return set;
  }, [allUsers, user]);

  const hasOtherAccountant = useMemo(
    () =>
      allUsers?.some((u) => u.role === 'ACCOUNTANT' && u.id !== user?.id) ??
      false,
    [allUsers, user]
  );

  const availableRoles = ROLES.filter(
    (r) => r !== 'ACCOUNTANT' || !hasOtherAccountant || user?.role === 'ACCOUNTANT'
  );

  const availableBranches =
    selectedRole === 'BRANCH_MANAGER'
      ? branches?.filter((b) => !branchesWithManager.has(b.id))
      : branches;

  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? '',
        role: user.role,
        branchId: user.branchId ?? '',
        isActive: (user as any).isActive ?? true,
      });
    }
  }, [user, reset]);

  function onSubmit(values: FormValues) {
    if (!user) return;
    updateUser.mutate(
      {
        id: user.id,
        name: values.name,
        role: values.role,
        branchId: values.branchId || undefined,
        isActive: values.isActive,
      },
      {
        onSuccess: () => {
          toast.success('User update ho gaya');
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Update nahi ho paya'),
      }
    );
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Edit Karein</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              {...register('role')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="branchId">Branch</Label>
            <select
              id="branchId"
              {...register('branchId')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Koi branch nahi</option>
              {availableBranches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-md border p-3">
            <input
              id="isActive"
              type="checkbox"
              {...register('isActive')}
              disabled={isSelf}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active {isSelf && '(khud ko deactivate nahi kar sakte)'}
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Save ho raha…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}