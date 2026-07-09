'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  useReceiveTransfer,
  useRejectTransfer,
  useCancelTransfer,
} from '@/hooks/useTransfers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ActionType = 'receive' | 'reject' | 'cancel';

interface TransferActionDialogProps {
  transferId: string | null;
  action: ActionType | null;
  onClose: () => void;
}

const LABELS: Record<ActionType, string> = {
  receive: 'Receive',
  reject: 'Reject',
  cancel: 'Cancel',
};

export function TransferActionDialog({
  transferId,
  action,
  onClose,
}: TransferActionDialogProps) {
  const [reason, setReason] = useState('');
  const receiveTransfer = useReceiveTransfer();
  const rejectTransfer = useRejectTransfer();
  const cancelTransfer = useCancelTransfer();

  const mutation =
    action === 'receive'
      ? receiveTransfer
      : action === 'reject'
        ? rejectTransfer
        : cancelTransfer;

  function onConfirm() {
    if (!transferId || !action) return;
    if (reason.trim().length < 2) {
      toast.error('Reason likhein');
      return;
    }
    mutation.mutate(
      { transferId, reason },
      {
        onSuccess: () => {
          toast.success(`Transfer ${LABELS[action].toLowerCase()} ho gayi`);
          setReason('');
          onClose();
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Action fail hua'),
      }
    );
  }

  return (
    <Dialog open={!!action} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Transfer {action ? LABELS[action] : ''} Karein
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="reason">Reason</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="jaise: Damage ho gaya tha"
          />
        </div>

        <DialogFooter>
          <Button
            variant={action === 'receive' ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? 'Processing…'
              : `${action ? LABELS[action] : ''} Confirm Karein`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}