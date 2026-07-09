'use client';

import { useMemo } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { useConsolidatedStock } from '@/hooks/useTransfers';
import { PageHeader } from '@/components/shared/PageHeader';
import type { ConsolidatedStockRow } from '@/types';
import { StatusBadge } from '@/components/inventory/StatusBadge';

export default function ConsolidatedStockPage() {
  const { data: branches } = useBranches();
  const { data, isLoading, isError } = useConsolidatedStock();

  const grouped = useMemo(() => {
    const map = new Map<string, ConsolidatedStockRow[]>();
    for (const row of data ?? []) {
      const existing = map.get(row.branchId) ?? [];
      map.set(row.branchId, [...existing, row]);
    }
    return map;
  }, [data]);

  function branchName(id: string) {
    return branches?.find((b) => b.id === id)?.name ?? id;
  }

  function branchTotal(rows: ConsolidatedStockRow[]) {
    return rows.reduce((sum, r) => sum + r.totalQuantity, 0);
  }

  return (
    <div>
      <PageHeader
        title="Consolidated Stock"
        description="Saari branches ka stock ek jagah — status ke hisaab se."
      />

      {isLoading && (
        <p className="text-sm text-muted-foreground">Load ho raha…</p>
      )}
      {isError && (
        <p className="text-sm text-red-500">Data load nahi hua.</p>
      )}

      {!isLoading && grouped.size === 0 && (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Koi stock data nahi mila.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from(grouped.entries()).map(([branchId, rows]) => (
          <div key={branchId} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{branchName(branchId)}</h3>
              <span className="text-sm text-muted-foreground">
                {branchTotal(rows)} units
              </span>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.status}
                  className="flex items-center justify-between text-sm"
                >
                  <StatusBadge status={r.status} />
                  <span>
                    {r.totalQuantity} units
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({r.itemCount} items)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

