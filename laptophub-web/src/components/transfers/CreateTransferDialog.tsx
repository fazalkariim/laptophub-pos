'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useStock } from '@/hooks/useStock';
import { useCreateTransfer } from '@/hooks/useTransfers';
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

export function CreateTransferDialog() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();
  const createTransfer = useCreateTransfer();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [open, setOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState(
    isSuperAdmin ? '' : user?.branchId ?? ''
  );
  const [destBranchId, setDestBranchId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const { data: stock } = useStock(sourceBranchId || null);
  const availableItems = (stock ?? []).filter((s) => s.status === 'IN_STOCK');

  useEffect(() => {
    if (open) {
      setSourceBranchId(isSuperAdmin ? '' : user?.branchId ?? '');
      setDestBranchId('');
      setSelected([]);
      setNote('');
    }
  }, [open, isSuperAdmin, user?.branchId]);

  function toggleItem(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onSubmit() {
    if (!sourceBranchId) {
      toast.error('Source branch chunein');
      return;
    }
    if (!destBranchId) {
      toast.error('Destination branch chunein');
      return;
    }
    if (sourceBranchId === destBranchId) {
      toast.error('Source aur destination alag honi chahiye');
      return;
    }
    if (selected.length === 0) {
      toast.error('Kam se kam ek item chunein');
      return;
    }

    createTransfer.mutate(
      {
        sourceBranchId,
        destBranchId,
        stockItemIds: selected,
        note: note || undefined,
      },
      {
        onSuccess: (t) => {
          toast.success(`Transfer bheja gaya — ${t.transferNumber}`);
          setOpen(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Transfer fail hua'),
      }
    );
  }

  return (
    <>
      <Button variant="tertiary" onClick={() => setOpen(true)}>New Transfer</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nayi Transfer Bhejein</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Source Branch</Label>
                {isSuperAdmin ? (
                  <select
                    value={sourceBranchId}
                    onChange={(e) => {
                      setSourceBranchId(e.target.value);
                      setSelected([]);
                    }}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Chunein…</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-md border bg-muted px-3 py-2 text-sm">
                    {branches?.find((b) => b.id === sourceBranchId)?.name ??
                      'Apni branch'}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Destination Branch</Label>
                <select
                  value={destBranchId}
                  onChange={(e) => setDestBranchId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Chunein…</option>
                  {branches
                    ?.filter((b) => b.id !== sourceBranchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Items ({selected.length} chuni gayi)</Label>
              {!sourceBranchId ? (
                <p className="text-xs text-muted-foreground">
                  Pehle source branch chunein.
                </p>
              ) : availableItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Is branch mein koi IN_STOCK item nahi hai.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {availableItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span>
                        {item.product.model} · {item.product.sku}
                        {item.serialNumber ? ` · ${item.serialNumber}` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onSubmit} disabled={createTransfer.isPending}>
              {createTransfer.isPending ? 'Bhej rahe…' : 'Transfer Bhejein'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}