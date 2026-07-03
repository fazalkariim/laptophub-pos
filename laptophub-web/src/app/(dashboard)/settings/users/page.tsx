'use client';

import { useUsers } from '@/hooks/useUsers';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import type { User } from '@/types';

const columns: Column<User>[] = [
  { header: 'Name', cell: (u) => u.name ?? '—' },
  { header: 'Email', cell: (u) => u.email },
  { header: 'Role', cell: (u) => u.role },
  { header: 'Branch', cell: (u) => u.branch?.name ?? '—' },
];

export default function UsersPage() {
  const { data, isLoading, isError } = useUsers();

  return (
    <div>
      <PageHeader
        title="Users"
        description="Apne business ke users manage karein."
        action={<CreateUserDialog />}
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        rowKey={(u) => u.id}
        emptyMessage="Abhi koi user nahi hai."
      />
    </div>
  );
}