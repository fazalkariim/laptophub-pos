'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { useExpiringWarranties } from '@/hooks/useCustomers';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import type { ExpiringWarranty } from '@/types';

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ExpiringWarrantiesPage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    isSuperAdmin ? null : user?.branchId ?? null
  );
  const branchId = isSuperAdmin ? selectedBranch : user?.branchId ?? null;

  const [withinDays, setWithinDays] = useState(30);
  const { data, isLoading, isError } = useExpiringWarranties(branchId, withinDays);

  const sorted = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => daysUntil(a.endDate) - daysUntil(b.endDate)
      ),
    [data]
  );

  const columns: Column<ExpiringWarranty>[] = [
    { header: 'Product', cell: (w) => w.product },
    { header: 'Serial', cell: (w) => w.serial ?? '—' },
    { header: 'Customer', cell: (w) => w.customer.name },
    { header: 'Contact', cell: (w) => w.customer.contact ?? '—' },
    {
      header: 'Expires',
      cell: (w) => new Date(w.endDate).toLocaleDateString(),
    },
    {
      header: 'Days Left',
      cell: (w) => {
        const days = daysUntil(w.endDate);
        const color =
          days <= 7
            ? 'text-red-600'
            : days <= 30
              ? 'text-amber-600'
              : 'text-muted-foreground';
        return (
          <span className={color}>
            {days < 0 ? 'Expired' : `${days} din`}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expiring Warranties"
        description="Follow-up ke liye jald khatam hone wali warranties."
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
            <select
              value={withinDays}
              onChange={(e) => setWithinDays(Number(e.target.value))}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value={7}>7 din</option>
              <option value={30}>30 din</option>
              <option value={60}>60 din</option>
              <option value={90}>90 din</option>
            </select>
          </div>
        }
      />

      {!branchId ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Dekhne ke liye branch chunein.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sorted}
          isLoading={isLoading}
          isError={isError}
          rowKey={(w) => w.id}
          emptyMessage="Is period mein koi warranty expire nahi ho rahi."
        />
      )}
    </div>
  );
}