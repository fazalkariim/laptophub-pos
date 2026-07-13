'use client';

import { useUsers } from '@/hooks/useUsers';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import type { User } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const columns: Column<User>[] = [
  { header: 'Name', cell: (u) => u.name ?? '—' },
  { header: 'Email', cell: (u) => u.email },
  { header: 'Role', cell: (u) => u.role },
  { header: 'Branch', cell: (u) => u.branch?.name ?? '—' },
];

export default function UsersPage() {
  const { data, isLoading, isError } = useUsers();

  const { pageItems, page, setPage, totalPages, total } = usePagination(
    data,
    20,
  );

  return (
    <div>
      <PageHeader
        title="Users"
        description="Apne business ke users manage karein."
        action={<CreateUserDialog />}
      />

      <DataTable
        columns={columns}
        data={pageItems}
        isLoading={isLoading}
        isError={isError}
        rowKey={(u) => u.id}
        emptyMessage="Abhi koi user nahi hai."
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