'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useImportBatches, useDeleteImportBatch } from '@/hooks/useImportBatches';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { DeleteImportBatchDialog } from '@/components/inventory/DeleteImportBatchDialog';
import { Button } from '@/components/ui/button';
import type { ImportBatchSummary } from '@/types';

export function UploadedFilesTab() {
  const router = useRouter();
  const { data: batches, isLoading, isError } = useImportBatches();
  const [deleteTarget, setDeleteTarget] = useState<ImportBatchSummary | null>(null);

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
    {
      header: '',
      cell: (b) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(b);
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={batches}
        isLoading={isLoading}
        isError={isError}
        rowKey={(b) => b.id}
        emptyMessage="Abhi tak koi file upload nahi hui."
        onRowClick={(b) => router.push(`/inventory/import-batches/${b.id}`)}
      />

      <DeleteImportBatchDialog
        batch={deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      />
    </div>
  );
}