'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateExpense } from '@/hooks/useFinance';
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

interface ExpenseDialogProps {
  branchId: string;
}

export function ExpenseDialog({ branchId }: ExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const createExpense = useCreateExpense();

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  function reset() {
    setCategory('');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
  }

  function onSubmit() {
    if (!category.trim()) {
      toast.error('Category likhein');
      return;
    }
    const val = Number(amount);
    if (!val || val <= 0) {
      toast.error('Valid amount daalein');
      return;
    }

    createExpense.mutate(
      { branchId, category: category.trim(), amount: val, date },
      {
        onSuccess: () => {
          toast.success('Expense add ho gaya');
          reset();
          setOpen(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Expense add nahi hua'),
      }
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Expense</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naya Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="jaise: Rent, Utilities"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onSubmit} disabled={createExpense.isPending}>
              {createExpense.isPending ? 'Add ho raha…' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}