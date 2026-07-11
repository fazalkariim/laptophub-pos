'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import type { HeldSale } from '@/hooks/useHeldSales';

interface HeldSalesDropdownProps {
  heldSales: HeldSale[];
  onResume: (sale: HeldSale) => void;
  onDiscard: (id: string) => void;
}

export function HeldSalesDropdown({
  heldSales,
  onResume,
  onDiscard,
}: HeldSalesDropdownProps) {
  const [open, setOpen] = useState(false);

  if (heldSales.length === 0) return null;

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        Held Sales ({heldSales.length})
      </Button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded-md border bg-background shadow-lg">
          <ul className="max-h-80 divide-y overflow-y-auto">
            {heldSales.map((h) => {
              const total = h.cart.reduce(
                (sum, l) => sum + (l.price - l.discount) * l.item.quantity,
                0
              );
              return (
                <li key={h.id} className="p-3 text-sm">
                  <div className="mb-1 flex justify-between">
                    <span className="font-medium">
                      {h.customer?.name ?? 'Walk-in'}
                    </span>
                    <span>{formatMoney(total)}</span>
                  </div>
                  <div className="mb-2 text-xs text-muted-foreground">
                    {h.cart.length} items ·{' '}
                    {new Date(h.heldAt).toLocaleTimeString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="tertiary"
                      onClick={() => {
                        onResume(h);
                        setOpen(false);
                      }}
                    >
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDiscard(h.id)}
                    >
                      Discard
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}