'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useUpdateBranch } from '@/hooks/useBranches';
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
import type { Branch } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Branch ka naam kam se kam 2 characters'),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditBranchDialogProps {
  branch: Branch | null;
  onOpenChange: (v: boolean) => void;
}

export function EditBranchDialog({ branch, onOpenChange }: EditBranchDialogProps) {
  const updateBranch = useUpdateBranch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (branch) {
      reset({ name: branch.name, address: branch.address ?? '' });
    }
  }, [branch, reset]);

  function onSubmit(values: FormValues) {
    if (!branch) return;
    updateBranch.mutate(
      { id: branch.id, ...values },
      {
        onSuccess: () => {
          toast.success('Branch update ho gayi');
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Update error'),
      }
    );
  }

  return (
    <Dialog open={!!branch} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Branch Edit Karein</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Branch Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" {...register('address')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={updateBranch.isPending}>
              {updateBranch.isPending ? 'Save ho raha…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}