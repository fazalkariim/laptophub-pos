'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/lib/auth';
import { usePagination } from '@/hooks/usePagination';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { ResetPasswordDialog } from '@/components/users/ResetPasswordDialog';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';
import { useBranches } from '@/hooks/useBranches';

export default function UsersPage() {
  const { data, isLoading, isError } = useUsers();

  const currentUser = useAuth((s) => s.user);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  const { data: branches } = useBranches();
  function branchName(branchId: string | null) {
    if (!branchId) return '—';
    return branches?.find((b) => b.id === branchId)?.name ?? branchId;
  }

  const { pageItems, page, setPage, totalPages, total } = usePagination(
    data,
    20,
  );

  const columns: Column<User>[] = [
    { header: 'Name', cell: (user) => user.name ?? '—' },
    { header: 'Email', cell: (user) => user.email },
    { header: 'Role', cell: (user) => user.role },
    { header: 'Branch', cell: (user) => branchName(user.branchId) },
    {
      header: 'Status',
      cell: (user) => (
        <span
          className={
            (user as any).isActive === false
              ? 'text-red-600'
              : 'text-green-600'
          }
        >
          {(user as any).isActive === false ? 'Inactive' : 'Active'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (user) => {
        const isCurrentUser = user.id === currentUser?.id;

        return (
          <div className="flex justify-end gap-2">
            <Button variant="inverted" size="sm" onClick={() => setEditTarget(user)}>
              Edit
            </Button>
            {!isCurrentUser && (
              <Button
                variant="inverted"
                size="sm"
                onClick={() => setResetTarget(user)}
              >
                Reset Password
              </Button>
            )}
          </div>
        );
      },
    },
  ];

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
        rowKey={(user) => user.id}
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

      <EditUserDialog
        user={editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      />
      <ResetPasswordDialog
        user={resetTarget}
        onOpenChange={(v) => !v && setResetTarget(null)}
      />
    </div>
  );
}