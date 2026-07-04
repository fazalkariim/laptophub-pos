'use client';

import { useState, useRef, useMemo } from 'react';
import { useStock } from '@/hooks/useStock';
import { Input } from '@/components/ui/input';
import type { StockItem } from '@/types';

interface ScanInputProps {
  branchId: string;
  onPick: (item: StockItem) => void;
  disabledIds: string[]; // pehle se cart mein jo hain
}

export function ScanInput({ branchId, onPick, disabledIds }: ScanInputProps) {
  const { data: stock } = useStock(branchId);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (stock ?? [])
      .filter((s) => s.status === 'IN_STOCK')
      .filter((s) => !disabledIds.includes(s.id))
      .filter(
        (s) =>
          s.serialNumber?.toLowerCase().includes(q) ||
          s.product.model.toLowerCase().includes(q) ||
          s.product.sku.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, stock, disabledIds]);

  function pick(item: StockItem) {
    onPick(item);
    setQuery('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // exact serial match ho to seedha add (scanner behaviour)
      const exact = matches.find(
        (m) => m.serialNumber?.toLowerCase() === query.trim().toLowerCase()
      );
      if (exact) pick(exact);
      else if (matches.length === 1) pick(matches[0]);
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Serial scan ya model/SKU search karein…"
        autoFocus
      />
      {matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
          {matches.map((m) => (
            <li
              key={m.id}
              onClick={() => pick(m)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{m.product.model}</span>{' '}
              <span className="text-muted-foreground">
                · {m.product.sku}
                {m.serialNumber ? ` · ${m.serialNumber}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}