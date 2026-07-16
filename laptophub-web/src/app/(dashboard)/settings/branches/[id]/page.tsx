'use client';

import { useParams, useRouter } from 'next/navigation';
import { useBranches } from '@/hooks/useBranches';
import { useUsers } from '@/hooks/useUsers';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function PersonRow({
  name,
  email,
  badge,
}: {
  name: string | null;
  email: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
        {initials(name, email)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {name ?? '—'}
        </p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;

  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: users, isLoading: usersLoading } = useUsers();

  const branch = branches?.find((b) => b.id === branchId);
  const manager = users?.find(
    (u) => u.role === 'BRANCH_MANAGER' && u.branchId === branchId
  );
  const salesmen = users?.filter(
    (u) => u.role === 'SALESMAN' && u.branchId === branchId
  );
  const accountant = users?.find(
    (u) => u.role === 'ACCOUNTANT' && u.branchId === branchId
  );

  if (branchesLoading) {
    return <p className="text-sm text-muted-foreground">Load ho raha…</p>;
  }
  if (!branch) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/settings/branches')}>
          ← Branches
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">Branch nahi mili.</p>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.push('/settings/branches')}>
        ← Branches
      </Button>

      <PageHeader title={branch.name} description={branch.address ?? 'No address'} />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Manager Assigned</p>
          <p className="mt-1 text-lg font-semibold">{manager ? 'Haan' : 'Nahi'}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Salesmen</p>
          <p className="mt-1 text-lg font-semibold">{salesmen?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Accountant</p>
          <p className="mt-1 text-lg font-semibold">{accountant ? 'Haan' : 'Nahi'}</p>
        </div>
      </div>

      {/* Manager */}
      <div className="mb-6 overflow-hidden rounded-lg border">
        <h3 className="border-b bg-muted/30 px-4 py-2.5 text-sm font-semibold">
          Branch Manager
        </h3>
        {usersLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Load ho raha…</p>
        ) : manager ? (
          <PersonRow name={manager.name} email={manager.email} />
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Is branch ka koi manager assign nahi hai.
          </p>
        )}
      </div>

      {/* Salesmen */}
      <div className="overflow-hidden rounded-lg border">
        <h3 className="border-b bg-muted/30 px-4 py-2.5 text-sm font-semibold">
          Salesmen ({salesmen?.length ?? 0})
        </h3>
        {usersLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Load ho raha…</p>
        ) : salesmen && salesmen.length > 0 ? (
          <div className="divide-y">
            {salesmen.map((s) => (
              <PersonRow key={s.id} name={s.name} email={s.email} />
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Is branch mein koi salesman nahi hai.
          </p>
        )}
      </div>
    </div>
  );
}