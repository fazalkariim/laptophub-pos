'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBranches } from '@/hooks/useBranches';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateBranchDialog } from '@/components/branches/CreateBranchDialog';
import { EditBranchDialog } from '@/components/branches/EditBranchDialog';
import { DeleteBranchDialog } from '@/components/branches/DeleteBranchDialog';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Button } from '@/components/ui/button';
import type { Branch } from '@/types';

export default function BranchesPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useBranches();

  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const { pageItems, page, setPage, totalPages, total } = usePagination(
    data,
    20
  );

  const columns: Column<Branch>[] = [
    { header: 'Name', cell: (b) => b.name },
    { header: 'Address', cell: (b) => b.address ?? '—' },
    {
      header: '',
      cell: (b) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="inverted"
            size="sm"
            onClick={() => router.push(`/settings/branches/${b.id}`)}
          >
            Detail
          </Button>
          <Button variant="inverted" size="sm" onClick={() => setEditTarget(b)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(b)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Apne business ki branches manage karein."
        action={<CreateBranchDialog />}
      />

      <DataTable
        columns={columns}
        data={pageItems}
        isLoading={isLoading}
        isError={isError}
        rowKey={(b) => b.id}
        emptyMessage="Abhi koi branch nahi hai."
      />

      {total > 0 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      <EditBranchDialog branch={editTarget} onOpenChange={(v) => !v && setEditTarget(null)} />
      <DeleteBranchDialog branch={deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} />
    </div>
  );
}