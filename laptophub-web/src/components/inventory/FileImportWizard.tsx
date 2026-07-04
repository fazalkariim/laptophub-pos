'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAllProducts } from '@/hooks/useCatalog';
import { useBulkImport, BulkResult } from '@/hooks/useStock';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface FileImportWizardProps {
  branchId: string;
}

export function FileImportWizard({ branchId }: FileImportWizardProps) {
  const { data: products } = useAllProducts();
  const bulkImport = useBulkImport(branchId);

  const [productId, setProductId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample template client-side banao aur download karo
  function downloadTemplate() {
    const csv = 'serialNumber,costPrice\nSN-001,85000\nSN-002,86000\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImport() {
    if (!productId) {
      toast.error('Pehle product chunein');
      return;
    }
    if (!file) {
      toast.error('File select karein');
      return;
    }
    setResult(null);
    bulkImport.mutate(
      { branchId, productId, file },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`${data.imported} items import hue`);
          if (data.failedCount === 0) {
            // sab kaamyaab — file input clear
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Import fail hua'),
      }
    );
  }

  // Failed rows ko CSV banake download (fix karke dobara upload ke liye)
  function downloadFailed() {
    if (!result || result.failed.length === 0) return;
    const rows = result.failed.map((f) =>
      typeof f === 'string' ? f : `${f.serial ?? ''},${f.reason ?? ''}`
    );
    const csv = 'serialNumber,reason\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-rows.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-md space-y-6">
      {/* Step 1: Product + template */}
      <div className="space-y-1">
        <Label htmlFor="import-product">Product</Label>
        <select
          id="import-product"
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

      <div>
        <Button type="button" variant="outline" onClick={downloadTemplate}>
          Template Download karein
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">
          CSV format: serialNumber, costPrice (pehli line header rakhein).
        </p>
      </div>

      {/* Step 2: File upload */}
      <div className="space-y-1">
        <Label htmlFor="import-file">CSV File</Label>
        <input
          id="import-file"
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:bg-muted file:px-3 file:py-2 file:text-sm"
        />
        {file && (
          <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
        )}
      </div>

      {/* Step 3: Import */}
      <Button onClick={onImport} disabled={bulkImport.isPending || !file}>
        {bulkImport.isPending ? 'Import ho raha…' : 'Import karein'}
      </Button>

      {/* Result */}
      {result && (
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium text-green-700">
            {result.imported} imported
          </p>
          {result.failedCount > 0 && (
            <div className="mt-2 space-y-2">
              <p className="font-medium text-red-600">
                {result.failedCount} failed:
              </p>
              <ul className="list-inside list-disc text-red-600">
                {result.failed.map((f, i) => (
                  <li key={i}>
                    {typeof f === 'string'
                      ? f
                      : `${f.serial ?? ''} — ${f.reason ?? 'error'}`}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadFailed}
              >
                Failed rows download karein
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}