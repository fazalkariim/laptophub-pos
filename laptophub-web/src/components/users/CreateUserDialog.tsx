'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateUser, useUsers } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
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

// SUPER_ADMIN yahan se create nahi hota — sirf signup/seed se banta hai
const CREATABLE_ROLES = ['BRANCH_MANAGER', 'ACCOUNTANT', 'SALESMAN'] as const;

const schema = z.object({
  name: z.string().min(2, 'Name kam se kam 2 characters'),
  email: z.string().email('Valid email daalein'),
  password: z.string().min(6, 'Password kam se kam 6 characters'),
  role: z.enum(CREATABLE_ROLES),
  branchId: z.string().min(1, 'Branch chunein'),
});

type FormValues = z.infer<typeof schema>;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const createUser = useCreateUser();
  const { data: branches } = useBranches();
  const { data: existingUsers } = useUsers();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'SALESMAN' },
  });

  const selectedRole = watch('role');

  // Branches jinka pehle se ek active Branch Manager hai
  const branchesWithManager = useMemo(() => {
    const set = new Set<string>();
    existingUsers?.forEach((u) => {
      if (u.role === 'BRANCH_MANAGER' && u.branchId) set.add(u.branchId);
    });
    return set;
  }, [existingUsers]);

  // Kya pehle se koi Accountant maujood hai
  const hasAccountant = useMemo(
    () => existingUsers?.some((u) => u.role === 'ACCOUNTANT') ?? false,
    [existingUsers]
  );

  // Role dropdown mein Accountant tabhi dikhega jab abhi tak koi Accountant nahi hai
  const availableRoles = CREATABLE_ROLES.filter(
    (r) => r !== 'ACCOUNTANT' || !hasAccountant
  );

  // Branch dropdown: agar role Manager hai, to jinka manager pehle se hai unhe hata do
  const availableBranches =
    selectedRole === 'BRANCH_MANAGER'
      ? branches?.filter((b) => !branchesWithManager.has(b.id))
      : branches;

  function onSubmit(values: FormValues) {
    createUser.mutate(values, {
      onSuccess: () => {
        toast.success('User ban gaya');
        reset();
        setOpen(false);
      },
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.message ?? 'User banane mein error aayi'
        );
      },
    });
  }

  return (
    <>
      <Button variant="tertiary" onClick={() => setOpen(true)}>
        Add User
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naya User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
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
              {hasAccountant && (
                <p className="text-xs text-muted-foreground">
                  Accountant pehle se maujood hai — naya banane ke liye purana
                  pehle delete karein.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="branchId">Branch</Label>
              <select
                id="branchId"
                {...register('branchId')}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Branch chunein…</option>
                {availableBranches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="text-xs text-red-500">{errors.branchId.message}</p>
              )}
              {selectedRole === 'BRANCH_MANAGER' &&
                branches &&
                availableBranches?.length === 0 && (
                  <p className="text-xs text-amber-600">
                    Saari branches mein pehle se manager assign hai.
                  </p>
                )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Ban raha…' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}