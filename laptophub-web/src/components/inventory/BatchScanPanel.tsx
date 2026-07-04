'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAllProducts } from '@/hooks/useCatalog';
import { useBulkScan, BulkResult } from '@/hooks/useStock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BatchScanPanelProps {
  branchId: string;
}

export function BatchScanPanel({ branchId }: BatchScanPanelProps) {
  const { data: products } = useAllProducts();
  const bulkScan = useBulkScan(branchId);

  const [productId, setProductId] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [result, setResult] = useState<BulkResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addSerial() {
    const val = current.trim();
    if (!val) return;
    setSerials((prev) => [...prev, val]);
    setCurrent('');
    // focus wapas scan field pe (scanner-as-keyboard)
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSerial();
    }
  }

  function removeSerial(index: number) {
    setSerials((prev) => prev.filter((_, i) => i !== index));
  }

  // duplicate serials nikalo (UI flag ke liye)
  const duplicates = serials.filter(
    (s, i) => serials.indexOf(s) !== i
  );
  const isDuplicate = (s: string) =>
    serials.filter((x) => x === s).length > 1;

  function onCommit() {
    if (!productId) {
      toast.error('Pehle product chunein');
      return;
    }
    if (serials.length === 0) {
      toast.error('Kam se kam ek serial scan karein');
      return;
    }
    setResult(null);
    bulkScan.mutate(
      { branchId, productId, serials },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`${data.imported} items import hue`);
          if (data.failedCount === 0) {
            // sab kaamyaab — list saaf kar do
            setSerials([]);
          }
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Bulk scan fail hua'),
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Product select */}
      <div className="space-y-1 max-w-md">
        <Label htmlFor="scan-product">Product</Label>
        <select
          id="scan-product"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Product chunein…</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.model} — {p.sku}
            </option>
          ))}
        </select>
      </div>

      {/* Scan field */}
      <div className="space-y-1 max-w-md">
        <Label htmlFor="scan-field">Serial Scan karein (Enter dabayein)</Label>
        <div className="flex gap-2">
          <Input
            id="scan-field"
            ref={inputRef}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Serial scan ya type karein…"
            autoFocus
          />
          <Button type="button" variant="outline" onClick={addSerial}>
            Add
          </Button>
        </div>
        {duplicates.length > 0 && (
          <p className="text-xs text-amber-600">
            Duplicate serials hain — commit se pehle theek karein.
          </p>
        )}
      </div>

      {/* Running list */}
      <div className="max-w-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            Scanned: {serials.length}
          </span>
          {serials.length > 0 && (
            <button
              type="button"
              onClick={() => setSerials([])}
              className="text-xs text-muted-foreground hover:underline"
            >
              Sab clear karein
            </button>
          )}
        </div>

        {serials.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
            Abhi tak koi serial scan nahi hua.
          </div>
        ) : (
          <ul className="max-h-64 overflow-y-auto rounded-lg border divide-y">
            {serials.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span className={isDuplicate(s) ? 'text-amber-600' : ''}>
                  {s}
                  {isDuplicate(s) && ' (duplicate)'}
                </span>
                <button
                  type="button"
                  onClick={() => removeSerial(i)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Commit */}
      <div className="max-w-md">
        <Button
          onClick={onCommit}
          disabled={bulkScan.isPending || serials.length === 0}
        >
          {bulkScan.isPending
            ? 'Commit ho raha…'
            : `Commit ${serials.length} items`}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="max-w-md rounded-lg border p-4 text-sm">
          <p className="font-medium text-green-700">
            {result.imported} imported
          </p>
          {result.failedCount > 0 && (
            <div className="mt-2">
              <p className="font-medium text-red-600">
                {result.failedCount} failed:
              </p>
              <ul className="mt-1 list-inside list-disc text-red-600">
                {result.failed.map((f, i) => (
                  <li key={i}>
                    {typeof f === 'string'
                      ? f
                      : `${f.serial ?? ''} — ${f.reason ?? 'error'}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}