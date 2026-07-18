'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useBulkImportV2 } from '@/hooks/useImportBatches';
import { Button } from '@/components/ui/button';
import type { BulkImportRow } from '@/types';
import { Upload, FileText, X, Download } from 'lucide-react';

const REQUIRED_COLS = ['Location', 'Category', 'Tracking ID', 'Specs', 'Purchase'];

const TEMPLATE_HEADERS = [
  'No', 'Location', 'Last Scan', 'Category', 'Brand', 'Tracking ID',
  'Specs', 'Cost by V.S', 'Final Sale', 'Buyer', 'Date', 'Status',
  'Sale @', 'Vendor', 'Vendor Tracking ID', 'Received on', 'Purchase',
];

export function FileImportWizardV2() {
  const bulkImport = useBulkImportV2();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    failedCount: number;
    failed: BulkImportRow[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

function downloadTemplate() {
    const sampleRow = [
      '1', 'Main Branch', '', 'Laptop', 'Dell', 'TRK-001',
      '16GB RAM, 512GB SSD', '82000', '', '', '', 'IN_STOCK',
      '', 'Tech Distributors', 'INV-2026-001', '2026-07-01', '78000',
    ];
    const quotedRow = sampleRow
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
    const csv = TEMPLATE_HEADERS.join(',') + '\n' + quotedRow + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-intake-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileSelect(f: File | null) {
    setFile(f);
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  }

  function onImport() {
    if (!file) {
      toast.error('File select karein');
      return;
    }
    setResult(null);
    bulkImport.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        toast.success(`${data.imported} rows import hue`);
        if (data.failedCount === 0) {
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message ?? 'Import fail hua'),
    });
  }

  function downloadFailed() {
    if (!result || result.failed.length === 0) return;
    const headers = [...TEMPLATE_HEADERS, 'Reason'];
    const rows = result.failed.map((r) =>
      [
        r.no, r.location ?? '', r.lastScan ?? '', r.category ?? '',
        r.brand ?? '', r.trackingId ?? '', r.specs ?? '', r.costByVS ?? '',
        r.finalSale ?? '', r.buyer ?? '', r.date ?? '', r.status ?? '',
        r.saleAt ?? '', r.vendor ?? '', r.vendorTrackingId ?? '',
        r.receivedOn ?? '', r.purchase ?? '', r.reason ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-rows.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl">
      <div className="overflow-hidden rounded-lg border">
        {/* Section 1 — format reference */}
        <div className="border-b p-5">
          <h3 className="mb-1 text-sm font-semibold">CSV Format</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Har row apni khud ki Location aur product-info le kar aati hai —
            alag-alag branches/products ek hi file mein ho sakte hain.
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TEMPLATE_HEADERS.map((h) => (
              <span
                key={h}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  REQUIRED_COLS.includes(h)
                    ? 'bg-red-50 text-red-600'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {h}
                {REQUIRED_COLS.includes(h) ? '*' : ''}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-red-600">*</span> Required — Location
            harf-ba-harf kisi maujooda branch ke naam se match honi chahiye.
          </p>
        </div>

        {/* Section 2 — upload */}
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Upload File</h3>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-tertiary hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Template Download Karein
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 text-center transition-colors ${
                dragOver
                  ? 'border-tertiary bg-tertiary/5'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                File yahan drop karein ya{' '}
                <span className="text-tertiary">browse karein</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV, TXT, XLS ya XLSX
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleFileSelect(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="File hataayein"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <Button
            className="mt-4 w-full"
            onClick={onImport}
            disabled={bulkImport.isPending || !file}
          >
            {bulkImport.isPending ? 'Import ho raha…' : 'Import Karein'}
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-4 overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
            <span className="text-sm font-semibold text-green-700">
              {result.imported} imported
            </span>
            {result.failedCount > 0 && (
              <span className="text-sm font-semibold text-red-600">
                {result.failedCount} failed
              </span>
            )}
          </div>

          {result.failedCount > 0 && (
            <div className="p-5">
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tracking ID</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failed.map((r) => (
                      <tr key={r.no} className="border-t">
                        <td className="px-3 py-2">{r.no}</td>
                        <td className="px-3 py-2">{r.trackingId ?? '—'}</td>
                        <td className="px-3 py-2 text-red-600">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={downloadFailed}
              >
                Failed Rows Download Karein
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}