'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useTransfers } from '@/hooks/useTransfers';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge';
import { CreateTransferDialog } from '@/components/transfers/CreateTransferDialog';
import { TransferActionDialog } from '@/components/transfers/TransferActionDialog';
import { Button } from '@/components/ui/button';
import type { Transfer } from '@/types';

type ActionType = 'receive' | 'reject' | 'cancel';

export default function TransfersPage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();
  const { data: transfers, isLoading, isError } = useTransfers();

  const [actionTarget, setActionTarget] = useState<{
    id: string;
    action: ActionType;
  } | null>(null);

  function branchName(id: string) {
    return branches?.find((b) => b.id === id)?.name ?? id;
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const columns: Column<Transfer>[] = [
    { header: 'Transfer #', cell: (t) => t.transferNumber },
    { header: 'From', cell: (t) => branchName(t.sourceBranchId) },
    { header: 'To', cell: (t) => branchName(t.destBranchId) },
    { header: 'Items', cell: (t) => t.lines.length },
    { header: 'Status', cell: (t) => <TransferStatusBadge status={t.status} /> },
    {
      header: 'Date',
      cell: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
    {
      header: '',
      cell: (t) => {
        if (t.status !== 'IN_TRANSIT') return null;

        const canReceiveReject =
          isSuperAdmin || user?.branchId === t.destBranchId;
        const canCancel = isSuperAdmin || user?.branchId === t.sourceBranchId;

        return (
          <div className="flex justify-end gap-2">
            {canReceiveReject && (
              <>
                <Button
                  size="sm"
                  variant="tertiary"
                  onClick={() =>
                    setActionTarget({ id: t.id, action: 'receive' })
                  }
                >
                  Receive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActionTarget({ id: t.id, action: 'reject' })
                  }
                >
                  Reject
                </Button>
              </>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  setActionTarget({ id: t.id, action: 'cancel' })
                }
              >
                Cancel
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
        title="Transfers"
        description="Branches ke darmiyan stock transfer karein."
        action={<CreateTransferDialog />}
      />

      <DataTable
        columns={columns}
        data={transfers}
        isLoading={isLoading}
        isError={isError}
        rowKey={(t) => t.id}
        emptyMessage="Abhi koi transfer nahi hai."
      />

      <TransferActionDialog
        transferId={actionTarget?.id ?? null}
        action={actionTarget?.action ?? null}
        onClose={() => setActionTarget(null)}
      />
    </div>
  );
}