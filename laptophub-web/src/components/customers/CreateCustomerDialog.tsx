'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateCustomer } from '@/hooks/useCustomers';
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
  name: z.string().min(2, 'Naam kam se kam 2 characters'),
  contact: z.string().optional(),
  type: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateCustomerDialog() {
  const [open, setOpen] = useState(false);
  const createCustomer = useCreateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'individual' },
  });

  function onSubmit(values: FormValues) {
    createCustomer.mutate(
      { name: values.name, contact: values.contact, type: values.type },
      {
        onSuccess: (res) => {
          if (res.warning) toast.warning(res.warning.message);
          else toast.success('Customer ban gaya');
          reset({ type: 'individual' });
          setOpen(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Customer nahi bana'),
      }
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Customer</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naya Customer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Naam</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact">Contact (optional)</Label>
              <Input id="contact" {...register('contact')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                {...register('type')}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? 'Ban raha…' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}