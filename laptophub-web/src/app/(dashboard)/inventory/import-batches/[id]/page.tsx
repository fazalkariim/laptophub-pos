'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useImportBatchDetail } from '@/hooks/useImportBatches';
import { PageHeader } from '@/components/shared/PageHeader';
import { EditFailedRowDialog } from '@/components/inventory/EditFailedRowDialog';
import { Button } from '@/components/ui/button';
import type { BulkImportRow } from '@/types';

const COLUMNS: { key: keyof BulkImportRow; label: string }[] = [
  { key: 'no', label: 'No' },
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

export default function ImportBatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const { data: detail, isLoading, isError } = useImportBatchDetail(batchId);
  const [editRow, setEditRow] = useState<BulkImportRow | null>(null);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Load ho raha…</p>;
  }
  if (isError || !detail) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/inventory/bulk-intake')}
        >
          ← Bulk Intake
        </Button>
        <p className="mt-4 text-sm text-red-500">File load nahi ho payi.</p>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/inventory/bulk-intake')}
      >
        ← Bulk Intake
      </Button>

      <PageHeader
        title={detail.fileName}
        description={`Uploaded by ${detail.uploadedBy.name} — ${new Date(
          detail.uploadedAt
        ).toLocaleString()}`}
      />

      <div className="mb-4 flex gap-4 text-sm">
        <span className="text-muted-foreground">
          Total: <span className="font-medium text-foreground">{detail.totalRows}</span>
        </span>
        <span className="text-green-600">Success: {detail.successCount}</span>
        <span className="text-red-600">Failed: {detail.failedCount}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {c.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">
                Result
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">
                Reason
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {detail.rows.map((r) => (
              <tr
                key={r.no}
                className={`border-t ${r.result === 'failed' ? 'bg-red-50/50' : ''}`}
              >
                {COLUMNS.map((c) => {
                  const value = r[c.key];
                  return (
                    <td key={c.key} className="whitespace-nowrap px-3 py-2">
                      {value !== null && value !== undefined && value !== ''
                        ? String(value)
                        : '—'}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-3 py-2">
                  {r.result === 'success' ? (
                    <span className="text-green-600">Success</span>
                  ) : (
                    <span className="text-red-600">Failed</span>
                  )}
                </td>
                <td className="px-3 py-2 text-red-600">
                  {r.result === 'failed' ? (r.reason ?? '—') : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.result === 'failed' && (
                    <button
                      onClick={() => setEditRow(r)}
                      className="text-xs font-medium text-tertiary hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditFailedRowDialog
        batchId={batchId}
        row={editRow}
        onOpenChange={(v) => !v && setEditRow(null)}
      />
    </div>
  );
}