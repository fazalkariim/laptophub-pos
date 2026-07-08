'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { QueuedSale } from '@/hooks/useSaleQueue';

interface QueuedSalesBadgeProps {
  queue: QueuedSale[];
  onRetry: (item: QueuedSale) => void;
  onRetryAll: () => void;
  onDiscard: (id: string) => void;
}

export function QueuedSalesBadge({
  queue,
  onRetry,
  onRetryAll,
  onDiscard,
}: QueuedSalesBadgeProps) {
  const [open, setOpen] = useState(false);

  if (queue.length === 0) return null;

  return (
    <div className="relative">
      <Button
        variant="destructive"
        onClick={() => setOpen((v) => !v)}
      >
        ⚠ {queue.length} Sale{queue.length > 1 ? 's' : ''} Pending
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-80 rounded-md border bg-background shadow-lg">
          <div className="border-b p-2">
            <p className="text-xs text-muted-foreground">
              Connection issue ki wajah se ye sales save nahi ho paayein.
              Data mehfooz hai — dobara try karein.
            </p>
          </div>
          <ul className="max-h-72 divide-y overflow-y-auto">
            {queue.map((q) => (
              <li key={q.id} className="p-3 text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{q.payload.lines.length} items</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(q.queuedAt).toLocaleTimeString()}
                  </span>
                </div>
                {q.lastError && (
                  <p className="mb-2 text-xs text-red-500">{q.lastError}</p>
                )}
                <p className="mb-2 text-xs text-muted-foreground">
                  Attempts: {q.attempts}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onRetry(q)}>
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDiscard(q.id)}
                  >
                    Discard
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t p-2">
            <Button size="sm" className="w-full" onClick={onRetryAll}>
              Sab Retry Karein
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}