'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import { PageHeader } from '@/components/shared/PageHeader';
import { BatchScanPanel } from '@/components/inventory/BatchScanPanel';
import { FileImportWizard } from '@/components/inventory/FileImportWizard';

export default function BulkIntakePage() {
  const user = useAuth((s) => s.user);
  const { data: branches } = useBranches();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    isSuperAdmin ? null : user?.branchId ?? null
  );
  const branchId = isSuperAdmin ? selectedBranch : user?.branchId ?? null;

  const [tab, setTab] = useState<'scan' | 'import'>('scan');

  return (
    <div>
      <PageHeader
        title="Bulk Intake"
        description="Ek saath bahut saari stock add karein."
        action={
          isSuperAdmin ? (
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
          ) : null
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setTab('scan')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'scan'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Batch Scan
        </button>
        <button
          onClick={() => setTab('import')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'import'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          File Import
        </button>
      </div>

     {!branchId ? (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Bulk intake ke liye pehle branch chunein.
      </div>
    ) : tab === 'scan' ? (
      <BatchScanPanel branchId={branchId} />
    ) : (
      <FileImportWizard branchId={branchId} />
    )}
        </div>
      );
}