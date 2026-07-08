'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StockItem, Customer } from '@/types';
import type { PaymentLine } from '@/components/pos/PaymentPanel';

export interface CartLine {
  item: StockItem;
  price: number;
  discount: number;
}

export interface HeldSale {
  id: string;
  heldAt: string;
  branchId: string;
  cart: CartLine[];
  customer: Customer | null;
  payments: PaymentLine[];
}

const STORAGE_KEY = 'laptophub-held-sales';

function loadHeldSales(): HeldSale[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHeldSales(sales: HeldSale[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  } catch {
    // storage full ya disabled — chup chaap ignore
  }
}

export function useHeldSales() {
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  useEffect(() => {
    setHeldSales(loadHeldSales());
  }, []);

  const holdSale = useCallback(
    (branchId: string, cart: CartLine[], customer: Customer | null, payments: PaymentLine[]) => {
      const newHeld: HeldSale = {
        id: crypto.randomUUID(),
        heldAt: new Date().toISOString(),
        branchId,
        cart,
        customer,
        payments,
      };
      setHeldSales((prev) => {
        const updated = [...prev, newHeld];
        saveHeldSales(updated);
        return updated;
      });
    },
    []
  );

  const resumeSale = useCallback((id: string) => {
    setHeldSales((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      saveHeldSales(updated);
      return updated;
    });
  }, []);

  const discardSale = useCallback((id: string) => {
    setHeldSales((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      saveHeldSales(updated);
      return updated;
    });
  }, []);

  return { heldSales, holdSale, resumeSale, discardSale };
}