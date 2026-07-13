'use client';

import { useBranches } from '@/hooks/useBranches';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateBranchDialog } from '@/components/branches/CreateBranchDialog';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import type { Branch } from '@/types';

const columns: Column<Branch>[] = [
  { header: 'Name', cell: (b) => b.name },
  { header: 'Address', cell: (b) => b.address ?? '—' },
];

export default function BranchesPage() {
  const { data, isLoading, isError } = useBranches();

  const { pageItems, page, setPage, totalPages, total } = usePagination(
    data,
    20,
  );

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
    </div>
  );
}