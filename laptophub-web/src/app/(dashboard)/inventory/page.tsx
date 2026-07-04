'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useStock } from '@/hooks/useStock';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/inventory/StatusBadge';
import type { StockItem } from '@/types';
import { IntakeDialog } from '@/components/inventory/IntakeDialog';
import { AdjustDialog } from '@/components/inventory/AdjustDialog';
import { Button } from '@/components/ui/button';

export default function InventoryPage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canSeeCost = user?.role !== 'SALESMAN';

  // Super Admin branch chun sakta hai; baaki apni branch pe locked
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    isSuperAdmin ? null : user?.branchId ?? null
  );

  const branchId = isSuperAdmin ? selectedBranch : user?.branchId ?? null;
  const { data, isLoading, isError } = useStock(branchId);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);

  const columns: Column<StockItem>[] = [
    { header: 'SKU', cell: (s) => s.product.sku },
    { header: 'Model', cell: (s) => s.product.model },
    { header: 'Brand', cell: (s) => s.product.brand ?? '—' },
    { header: 'Serial', cell: (s) => s.serialNumber ?? '—' },
    { header: 'Qty', cell: (s) => s.quantity },
    { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    ...(canSeeCost
      ? [
          {
            header: 'Cost',
            cell: (s: StockItem) =>
              s.costPrice != null
                ? `Rs ${Number(s.costPrice).toLocaleString()}`
                : '—',
          },
          
        ]
      : []),
      {
      header: '',
      cell: (s: StockItem) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdjustItem(s)}
          >
            Adjust
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Branch ka stock dekhein."

      action={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <select
                value={selectedBranch ?? ''}
                onChange={(e) => setSelectedBranch(e.target.value || null)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Branch chunein…</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            {branchId && <IntakeDialog branchId={branchId} />}
          </div>
        }
      />

      {!branchId ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Stock dekhne ke liye branch chunein.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          rowKey={(s) => s.id}
          emptyMessage="Is branch mein koi stock nahi hai."
        />
      )}

      <AdjustDialog
        item={adjustItem}
        branchId={branchId}
        onOpenChange={(v) => !v && setAdjustItem(null)}
      />
    </div>
  );
}