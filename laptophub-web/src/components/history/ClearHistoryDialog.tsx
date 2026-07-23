'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useClearHistory } from '@/hooks/useAuditLogs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ClearHistoryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const OPTIONS = [
  { value: '7d', label: '7 din se purani' },
  { value: '15d', label: '15 din se purani' },
  { value: 'all', label: 'Sab kuch (poori history)' },
] as const;

export function ClearHistoryDialog({ open, onOpenChange }: ClearHistoryDialogProps) {
  const [selected, setSelected] = useState<'7d' | '15d' | 'all'>('7d');
  const clearHistory = useClearHistory();

  function onConfirm() {
    clearHistory.mutate(selected, {
      onSuccess: (data) => {
        toast.success(data.message);
        onOpenChange(false);
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message ?? 'Delete nahi ho paya'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>History Clear Karein</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted"
            >
              <input
                type="radio"
                name="clear-scope"
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          Ye action <strong>permanent</strong> hai — delete hui history database
          se hamesha ke liye hat jaayegi, wapas nahi aa sakti.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={clearHistory.isPending}
          >
            {clearHistory.isPending ? 'Delete ho raha…' : 'Are You Sure? Delete Karein'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}