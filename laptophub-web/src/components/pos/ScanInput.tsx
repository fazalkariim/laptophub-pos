'use client';

import { useState, useRef, useMemo } from 'react';
import { useStock } from '@/hooks/useStock';
import { Input } from '@/components/ui/input';
import type { StockItem } from '@/types';

interface ScanInputProps {
  branchId: string;
  onPick: (item: StockItem) => void;
  disabledIds: string[];
}

export function ScanInput({ branchId, onPick, disabledIds }: ScanInputProps) {
  const { data: stock } = useStock(branchId);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (stock ?? [])
      .filter((s) => s.status === 'IN_STOCK' && s.quantity > 0)
      .filter((s) => !disabledIds.includes(s.id))
      .filter(
        (s) =>
          s.serialNumber?.toLowerCase().includes(q) ||
          s.product.model.toLowerCase().includes(q) ||
          s.product.sku.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, stock, disabledIds]);

  const previewItem = matches[highlighted];

  function pick(item: StockItem) {
    onPick(item);
    setQuery('');
    setHighlighted(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, matches.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      setQuery('');
      setHighlighted(0);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const exact = matches.find(
        (m) => m.serialNumber?.toLowerCase() === query.trim().toLowerCase()
      );
      if (exact) pick(exact);
      else if (matches[highlighted]) pick(matches[highlighted]);
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Serial scan ya model/SKU search karein…"
        autoFocus
        role="combobox"
        aria-expanded={matches.length > 0}
        aria-controls="scan-results-list"
        aria-activedescendant={previewItem ? `scan-result-${previewItem.id}` : undefined}
      />

      {/* Search box ka text kabhi nahi badalta (scanner-safe) —
          ye chhota preview batata hai kaunsa item arrow-key se highlight hai */}
      {previewItem && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span>Selected:</span>
          <span className="font-medium text-foreground">
            {previewItem.product.model}
          </span>
          <span>
            · {previewItem.product.sku}
            {previewItem.serialNumber ? ` · ${previewItem.serialNumber}` : ''}
          </span>
        </div>
      )}

      {matches.length > 0 && (
        <ul
          id="scan-results-list"
          role="listbox"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-background shadow-lg"
        >
          {matches.map((m, i) => (
            <li
              key={m.id}
              id={`scan-result-${m.id}`}
              role="option"
              aria-selected={i === highlighted}
              onClick={() => pick(m)}
              onMouseEnter={() => setHighlighted(i)}
              className={`cursor-pointer px-3 py-2 text-sm border-l-2 ${
                i === highlighted
                  ? 'bg-primary/10 border-l-primary'
                  : 'border-l-transparent hover:bg-muted'
              }`}
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