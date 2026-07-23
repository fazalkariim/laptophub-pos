'use client';

import { useAuditLogDetail } from '@/hooks/useAuditLogs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AuditLogDetailDialogProps {
  id: string | null;
  onOpenChange: (v: boolean) => void;
}

// Technical fields jo end-user ko nahi dikhane
const HIDDEN_KEYS = new Set([
  'id', 'tenantId', 'passwordHash', 'refreshTokenHash', 'deletedAt',
]);

// "customer", "user" jaise wrapper-keys ke andar se asli data nikaalo
function unwrapEntity(obj: Record<string, any>): Record<string, any> {
  const keys = Object.keys(obj);
  const wrapperKey = keys.find(
    (k) => typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])
  );
  const otherKeysAreSimple = keys
    .filter((k) => k !== wrapperKey)
    .every((k) => obj[k] === null || typeof obj[k] !== 'object');

  if (wrapperKey && otherKeysAreSimple) {
    return obj[wrapperKey];
  }
  return obj;
}

// "createdAt" -> "Created At", "branchId" -> "Branch Id"
function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Haan' : 'Nahi';
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.join(', ');
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleString();
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function ReadableRecord({ data }: { data: Record<string, any> }) {
  const entity = unwrapEntity(data);
  const entries = Object.entries(entity).filter(
    ([key]) => !HIDDEN_KEYS.has(key)
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md bg-background p-2.5 shadow-sm">
          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {humanizeKey(key)}
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

// Update-case ke liye — dono objects compare karke sirf badle hue fields
function diffFields(
  before: Record<string, any> | null,
  after: Record<string, any> | null
) {
  const b = before ? unwrapEntity(before) : {};
  const a = after ? unwrapEntity(after) : {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const changed: { key: string; before: any; after: any }[] = [];
  for (const key of keys) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
      changed.push({ key, before: b[key], after: a[key] });
    }
  }
  return changed;
}

export function AuditLogDetailDialog({ id, onOpenChange }: AuditLogDetailDialogProps) {
  const { data: detail, isLoading } = useAuditLogDetail(id);

  const hasBefore = !!detail?.beforeData;
  const hasAfter = !!detail?.afterData;
  const isUpdate = hasBefore && hasAfter;
  const isCreate = !hasBefore && hasAfter;
  const isDelete = hasBefore && !hasAfter;

  const changedFields = isUpdate
    ? diffFields(detail!.beforeData, detail!.afterData)
    : [];

return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Action Detail</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Load ho raha…</p>
        ) : detail ? (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div>
                <p className="text-xs text-muted-foreground">User</p>
                <p className="font-medium">
                  {detail.userName ?? '—'}{' '}
                  <span className="font-normal text-muted-foreground">
                    ({detail.userRole})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Waqt</p>
                <p className="font-medium">
                  {new Date(detail.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="col-span-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">Action</p>
                <p className="font-semibold">{detail.action}</p>
              </div>
            </div>

            {isUpdate && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kya Badla
                </p>
                {changedFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Koi field-level farq nahi mila.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {changedFields.map((f) => (
                      <div key={f.key} className="rounded-lg border p-3">
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                          {humanizeKey(f.key)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 line-through">
                            {formatValue(f.before)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            {formatValue(f.after)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isCreate && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Naya Data
                </p>
                <div className="rounded-lg border border-green-100 bg-green-50/60 p-3">
                  <ReadableRecord data={detail.afterData!} />
                </div>
              </div>
            )}

            {isDelete && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Delete Kiya Gaya Data
                </p>
                <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
                  <ReadableRecord data={detail.beforeData!} />
                </div>
              </div>
            )}

            {!hasBefore && !hasAfter && detail.requestBody && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bheja Gaya Data
                </p>
                <div className="rounded-lg border bg-muted/60 p-3">
                  <ReadableRecord data={detail.requestBody} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-red-500">Load nahi ho paya.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}