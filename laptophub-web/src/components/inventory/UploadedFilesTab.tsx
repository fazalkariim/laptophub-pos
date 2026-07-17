'use client';

import { useState } from 'react';
import { useImportBatches, useImportBatchDetail } from '@/hooks/useImportBatches';
import { DataTable, type Column } from '@/components/shared/DataTable';
import type { ImportBatchSummary, BulkImportRow } from '@/types';

export function UploadedFilesTab() {
  const { data: batches, isLoading, isError } = useImportBatches();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail, isLoading: detailLoading } = useImportBatchDetail(selectedId);

  const columns: Column<ImportBatchSummary>[] = [
    { header: 'File Name', cell: (b) => b.fileName },
    {
      header: 'Uploaded',
      cell: (b) => new Date(b.uploadedAt).toLocaleString(),
    },
    { header: 'By', cell: (b) => b.uploadedByName },
    { header: 'Total', cell: (b) => b.totalRows },
    {
      header: 'Success / Failed',
      cell: (b) => (
        <span>
          <span className="text-green-600">{b.successCount}</span>
          {' / '}
          <span className={b.failedCount > 0 ? 'text-red-600' : 'text-muted-foreground'}>
            {b.failedCount}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={batches}
        isLoading={isLoading}
        isError={isError}
        rowKey={(b) => b.id}
        emptyMessage="Abhi tak koi file upload nahi hui."
        onRowClick={(b) => setSelectedId(b.id)}
      />

      {selectedId && (
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              {detail?.fileName ?? 'Load ho raha…'}
            </h3>
            <button
              onClick={() => setSelectedId(null)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Band karein
            </button>
          </div>

          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Load ho raha…</p>
          ) : detail ? (
            <div className="max-h-96 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="px-2 py-1.5 text-left">No</th>
                    <th className="px-2 py-1.5 text-left">Location</th>
                    <th className="px-2 py-1.5 text-left">Category</th>
                    <th className="px-2 py-1.5 text-left">Brand</th>
                    <th className="px-2 py-1.5 text-left">Tracking ID</th>
                    <th className="px-2 py-1.5 text-left">Status</th>
                    <th className="px-2 py-1.5 text-left">Purchase</th>
                    <th className="px-2 py-1.5 text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((r: BulkImportRow) => (
                    <tr
                      key={r.no}
                      className={`border-t ${
                        r.result === 'failed' ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="px-2 py-1.5">{r.no}</td>
                      <td className="px-2 py-1.5">{r.location ?? '—'}</td>
                      <td className="px-2 py-1.5">{r.category ?? '—'}</td>
                      <td className="px-2 py-1.5">{r.brand ?? '—'}</td>
                      <td className="px-2 py-1.5">{r.trackingId ?? '—'}</td>
                      <td className="px-2 py-1.5">{r.status ?? '—'}</td>
                      <td className="px-2 py-1.5">{r.purchase ?? '—'}</td>
                      <td className="px-2 py-1.5">
                        {r.result === 'success' ? (
                          <span className="text-green-600">Success</span>
                        ) : (
                          <span className="text-red-600" title={r.reason}>
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}