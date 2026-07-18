'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useImportBatches, useImportBatchDetail, useTransferFromBatch } from '@/hooks/useImportBatches';
import { useBranches } from '@/hooks/useBranches';
import { useStock } from '@/hooks/useStock';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const ALL_COLUMNS = [
  { key: 'location', label: 'Location' },
  { key: 'lastScan', label: 'Last Scan' },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'trackingId', label: 'Tracking ID' },
  { key: 'specs', label: 'Specs' },
  { key: 'costByVS', label: 'Cost by V.S' },
  { key: 'finalSale', label: 'Final Sale' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'saleAt', label: 'Sale @' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'vendorTrackingId', label: 'Vendor Tracking ID' },
  { key: 'receivedOn', label: 'Received on' },
  { key: 'purchase', label: 'Purchase' },
];

export function TransferFileTab() {
  const { data: batches } = useImportBatches();
  const { data: branches } = useBranches();

  const [batchId, setBatchId] = useState('');
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [destBranchId, setDestBranchId] = useState('');
  const [selectedTrackingIds, setSelectedTrackingIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.map((c) => c.key)
  );
  const [note, setNote] = useState('');

  const { data: batchDetail } = useImportBatchDetail(batchId || null);
  const transferMutation = useTransferFromBatch(batchId);

  // Batch ke successful rows, jin branches mein gaye the unke naam
  const successRows = useMemo(
    () => batchDetail?.rows.filter((r) => r.result === 'success') ?? [],
    [batchDetail]
  );

  // Is batch mein maujood distinct branch-names (Location)
  const branchNamesInBatch = useMemo(
    () => Array.from(new Set(successRows.map((r) => r.location).filter(Boolean))),
    [successRows]
  );

  function branchIdByName(name: string) {
    return branches?.find((b) => b.name === name)?.id ?? null;
  }

  // Chuni hui source-branch ka asli stock (Tracking ID se match karne ke liye)
  const { data: sourceStock } = useStock(sourceBranchId || null);

  // Sirf wo rows dikhao jo is source-branch se hain, aur unka StockItem abhi IN_STOCK ho
  const transferableRows = useMemo(() => {
    if (!sourceBranchId || !sourceStock) return [];
    const sourceBranchName = branches?.find((b) => b.id === sourceBranchId)?.name;
    return successRows
      .filter((r) => r.location === sourceBranchName)
      .map((r) => {
        const stockItem = sourceStock.find((s) => s.serialNumber === r.trackingId);
        return { row: r, stockItem };
      })
      .filter((x) => x.stockItem && x.stockItem.status === 'IN_STOCK');
  }, [sourceBranchId, sourceStock, successRows, branches]);

  function toggleTrackingId(id: string) {
    setSelectedTrackingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleColumn(key: string) {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  function onSubmit() {
    if (!destBranchId) {
      toast.error('Destination branch chunein');
      return;
    }
    if (selectedTrackingIds.length === 0) {
      toast.error('Kam se kam ek item chunein');
      return;
    }

    const stockItemIds = transferableRows
      .filter((x) => selectedTrackingIds.includes(x.row.trackingId!))
      .map((x) => x.stockItem!.id);

    transferMutation.mutate(
      { stockItemIds, destBranchId, visibleColumns, note: note || undefined },
      {
        onSuccess: () => {
          toast.success('Transfer bhej diya gaya');
          setSelectedTrackingIds([]);
          setNote('');
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Transfer fail hua'),
      }
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Step 1: batch chunein */}
      <div className="space-y-1">
        <Label>File Chunein</Label>
        <select
          value={batchId}
          onChange={(e) => {
            setBatchId(e.target.value);
            setSourceBranchId('');
            setSelectedTrackingIds([]);
          }}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Uploaded file chunein…</option>
          {batches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.fileName} — {new Date(b.uploadedAt).toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      {batchId && (
        <>
          {/* Step 2: source branch (is batch mein jitni branches thi unme se) */}
          <div className="space-y-1">
            <Label>Source Branch</Label>
            <select
              value={sourceBranchId}
              onChange={(e) => {
                setSourceBranchId(e.target.value);
                setSelectedTrackingIds([]);
              }}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Chunein…</option>
              {branchNamesInBatch.map((name) => {
                const id = branchIdByName(name!);
                return id ? (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ) : null;
              })}
            </select>
          </div>

          {/* Step 3: items chunein */}
          {sourceBranchId && (
            <div className="space-y-1">
              <Label>Items ({selectedTrackingIds.length} chuni gayi)</Label>
              {transferableRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Is branch mein transfer ke liye koi item available nahi
                  (shayad already transfer/bik chuki hai).
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {transferableRows.map(({ row }) => (
                    <label
                      key={row.trackingId}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTrackingIds.includes(row.trackingId!)}
                        onChange={() => toggleTrackingId(row.trackingId!)}
                      />
                      <span>
                        {row.category} · {row.brand ?? '—'} · {row.trackingId}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: destination */}
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

          {/* Step 5: kaunse columns dest-branch dekhe */}
          <div className="space-y-1">
            <Label>
              Destination branch ko ye details dikhengi ({visibleColumns.length}/16)
            </Label>
            <div className="flex flex-wrap gap-2 rounded-md border p-3">
              {ALL_COLUMNS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(c.key)}
                    onChange={() => toggleColumn(c.key)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Jo column uncheck karenge, us item ka actual data delete nahi
              hoga — sirf destination branch ko transfer mein wo field nahi
              dikhegi.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <Button onClick={onSubmit} disabled={transferMutation.isPending}>
            {transferMutation.isPending ? 'Bhej rahe…' : 'Transfer Bhejein'}
          </Button>
        </>
      )}
    </div>
  );
}