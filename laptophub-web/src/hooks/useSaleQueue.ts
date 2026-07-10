"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import type { CreateSaleInput, SaleResult } from "@/hooks/useSale";

export interface QueuedSale {
  id: string;
  queuedAt: string;
  payload: CreateSaleInput;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = "laptophub-sale-queue";

function loadQueue(): QueuedSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedSale[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function useSaleQueue(onSaleSynced?: (sale: SaleResult) => void) {
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const syncingRef = useRef(false);

  useEffect(() => {
    setQueue(loadQueue());
  }, []);

  const enqueue = useCallback((payload: CreateSaleInput, error?: string) => {
    const item: QueuedSale = {
      id: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
      payload,
      attempts: 0,
      lastError: error,
    };
    setQueue((prev) => {
      const updated = [...prev, item];
      saveQueue(updated);
      return updated;
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      saveQueue(updated);
      return updated;
    });
  }, []);

  // Ek queued sale ko retry karo
  const syncOne = useCallback(
    async (item: QueuedSale) => {
try {
        const data = await new Promise<SaleResult>((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            const timeoutError: any = new Error('Request timed out');
            timeoutError.response = undefined;
            reject(timeoutError);
          }, 8000);

          apiClient
            .post<SaleResult>('/sales', item.payload)
            .then((res) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve(res.data);
            })
            .catch((err) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(err);
            });
        });
        removeFromQueue(item.id);
        onSaleSynced?.(data);
        return true;
      } catch (err: any) {
        // Agar backend ne jawab diya (validation/business error) — queue se hata do,
        // kyunki retry se bhi wahi error aayega. User ko manually dekhna hoga.
        if (err?.response) {
          setQueue((prev) => {
            const updated = prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    attempts: q.attempts + 1,
                    lastError: err.response?.data?.message ?? "Sale reject hui",
                  }
                : q,
            );
            saveQueue(updated);
            return updated;
          });
        } else {
          // Network fail — attempt count badhao, queue mein rehne do
          setQueue((prev) => {
            const updated = prev.map((q) =>
              q.id === item.id
                ? { ...q, attempts: q.attempts + 1, lastError: "Network error" }
                : q,
            );
            saveQueue(updated);
            return updated;
          });
        }
        return false;
      }
    },
    [onSaleSynced, removeFromQueue],
  );

  // Poori queue sync karo (jab connection wapas aaye)
  const syncAll = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const current = loadQueue();
    for (const item of current) {
      await syncOne(item);
    }
    syncingRef.current = false;
  }, [syncOne]);

  // Auto-retry jab browser online ho
  useEffect(() => {
    function handleOnline() {
      syncAll();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncAll]);

  // Warn karo agar tab band ho / refresh ho aur pending sales hon
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (loadQueue().length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { queue, enqueue, syncAll, syncOne, removeFromQueue };
}
