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

export function AuditLogDetailDialog({ id, onOpenChange }: AuditLogDetailDialogProps) {
  const { data: detail, isLoading } = useAuditLogDetail(id);

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Action Detail</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Load ho raha…</p>
        ) : detail ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">User</p>
                <p>{detail.userName ?? '—'} ({detail.userRole})</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Waqt</p>
                <p>{new Date(detail.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Action</p>
                <p>{detail.action}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p>{detail.statusCode}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Route</p>
                <p className="font-mono text-xs">{detail.method} {detail.path}</p>
              </div>
            </div>

            {detail.requestBody && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Data Bheji Gayi</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(detail.requestBody, null, 2)}
                </pre>
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