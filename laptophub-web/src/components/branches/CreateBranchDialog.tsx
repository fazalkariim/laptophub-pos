'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateBranch } from '@/hooks/useBranches';
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

const schema = z.object({
  name: z.string().min(2, 'Branch ka naam kam se kam 2 characters'),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateBranchDialog() {
  const [open, setOpen] = useState(false);
  const createBranch = useCreateBranch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function onSubmit(values: FormValues) {
    createBranch.mutate(values, {
      onSuccess: () => {
        toast.success('Branch ban gayi');
        reset();
        setOpen(false);
      },
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.message ?? 'Branch banane mein error aayi'
        );
      },
    });
  }

  return (
    <>
      <Button variant="tertiary" onClick={() => setOpen(true)}>Add Branch</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nayi Branch</DialogTitle>
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
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending ? 'Ban rahi…' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}