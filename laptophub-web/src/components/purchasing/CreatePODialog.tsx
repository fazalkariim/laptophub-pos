'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useBranches } from '@/hooks/useBranches';
import { useAllProducts } from '@/hooks/useCatalog';
import { useCreatePO } from '@/hooks/usePurchaseOrders';
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

interface Line {
  productId: string;
  quantity: number;
  costPrice: number;
}

const emptyLine: Line = { productId: '', quantity: 1, costPrice: 0 };

export function CreatePODialog() {
  const [open, setOpen] = useState(false);
  const { data: suppliers } = useSuppliers();
  const { data: branches } = useBranches();
  const { data: products } = useAllProducts();
  const createPO = useCreatePO();

  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  function resetForm() {
    setSupplierId('');
    setBranchId('');
    setNote('');
    setLines([{ ...emptyLine }]);
  }

  function updateLine(i: number, field: keyof Line, value: string | number) {
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l))
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.costPrice, 0);

  function onSubmit() {
    if (!supplierId) {
      toast.error('Supplier chunein');
      return;
    }
    if (!branchId) {
      toast.error('Destination branch chunein');
      return;
    }
    if (lines.some((l) => !l.productId || l.quantity <= 0 || l.costPrice <= 0)) {
      toast.error('Har line mein product, quantity aur cost price zaroori hai');
      return;
    }

    createPO.mutate(
      {
        supplierId,
        destinationBranchId: branchId,
        lines,
        note: note || undefined,
      },
      {
        onSuccess: (po) => {
          toast.success(`PO ban gaya — ${po.poNumber}`);
          resetForm();
          setOpen(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'PO nahi bana'),
      }
    );
  }

  return (
    <>
      <Button variant="tertiary" onClick={() => setOpen(true)}>New Purchase Order</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Naya Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Supplier</Label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Chunein…</option>
                  {suppliers?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Destination Branch</Label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Chunein…</option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              {lines.map((line, i) => (
                <div key={i} className="flex items-end gap-2 rounded-md border p-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Product</Label>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(i, 'productId', e.target.value)}
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                    >
                      <option value="">Chunein…</option>
                      {products?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.model} — {p.sku}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={line.quantity || ''}
                      onChange={(e) =>
                        updateLine(i, 'quantity', Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Cost/unit</Label>
                    <Input
                      type="number"
                      value={line.costPrice || ''}
                      onChange={(e) =>
                        updateLine(i, 'costPrice', Number(e.target.value))
                      }
                    />
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="mb-2 text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-primary hover:underline"
              >
                + Aur item add karein
              </button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="text-right text-sm font-semibold">
              Total: Rs {total.toLocaleString()}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onSubmit} disabled={createPO.isPending}>
              {createPO.isPending ? 'Ban raha…' : 'PO Banayein (Draft)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}