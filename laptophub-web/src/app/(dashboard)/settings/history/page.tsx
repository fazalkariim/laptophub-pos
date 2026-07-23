'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useUsers } from '@/hooks/useUsers';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { DateRangePicker } from '@/components/finance/DateRangePicker';
import { AuditLogDetailDialog } from '@/components/history/AuditLogDetailDialog';
import { ClearHistoryDialog } from '@/components/history/ClearHistoryDialog';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/types';

const ENTITY_TYPES = [
  'User', 'Branch', 'Product', 'StockItem', 'Customer', 'Sale',
  'Supplier', 'PurchaseOrder', 'Transfer', 'Expense', 'ImportBatch',
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

const ACTION_COLORS: Record<string, string> = {
  Created: 'bg-green-50 text-green-700',
  Updated: 'bg-blue-50 text-blue-700',
  Deleted: 'bg-red-50 text-red-700',
};

function actionColor(action: string) {
  const prefix = Object.keys(ACTION_COLORS).find((p) => action.startsWith(p));
  return prefix ? ACTION_COLORS[prefix] : 'bg-muted text-muted-foreground';
}

export default function HistoryPage() {
  const { data: users } = useUsers();

  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const { data, isLoading, isError } = useAuditLogs({
    page,
    userId: userId || undefined,
    entityType: entityType || undefined,
    from,
    to,
  });

  const columns: Column<AuditLogEntry>[] = [
    { header: 'Waqt', cell: (l) => new Date(l.createdAt).toLocaleString() },
    { header: 'User', cell: (l) => l.userName ?? '—' },
    { header: 'Role', cell: (l) => l.userRole },
    {
      header: 'Action',
      cell: (l) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColor(l.action)}`}>
          {l.action}
        </span>
      ),
    },
    { header: 'Entity', cell: (l) => l.entityType ?? '—' },
    {
      header: '',
      cell: (l) => (
        <Button
          variant="inverted"
          size="sm"
          onClick={(e) => {
            e.stopPropagation(); // taake row-click bhi trigger na ho double
            setSelectedLogId(l.id);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="History"
        description="Poore system mein kisne kya kiya — pura record."
        action={
          <div className="flex items-center gap-2">
            <DateRangePicker
              from={from}
              to={to}
              onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }}
            />
            <Button variant="destructive" onClick={() => setClearDialogOpen(true)}>
              Clear History
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Sab Users</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>

        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Sab Entities</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        rowKey={(l) => l.id}
        emptyMessage="Is filter ke hisaab se koi history nahi mili."
        onRowClick={(l) => setSelectedLogId(l.id)}
      />

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AuditLogDetailDialog
        id={selectedLogId}
        onOpenChange={(v) => !v && setSelectedLogId(null)}
      />
      <ClearHistoryDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
      />
    </div>
  );
}