import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  PurchaseOrder,
  CreatePOInput,
  ReceivePOInput,
  PaySupplierInput,
  SupplierPayables,
} from '@/types';

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get<PurchaseOrder[]>('/purchase-orders');
      return res.data;
    },
  });
}

export function usePurchaseOrder(id: string | null) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: async () => {
      const res = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

function useInvalidatePOs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['purchase-orders'] });
}

export function useCreatePO() {
  const invalidate = useInvalidatePOs();
  return useMutation({
    mutationFn: async (input: CreatePOInput) => {
      const res = await apiClient.post<PurchaseOrder>(
        '/purchase-orders',
        input
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useSendPO() {
  const invalidate = useInvalidatePOs();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<PurchaseOrder>(
        `/purchase-orders/${id}/send`
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useReceivePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReceivePOInput) => {
      const res = await apiClient.post<PurchaseOrder>(
        '/purchase-orders/receive',
        input
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['stock'] }); // naya stock aaya
    },
  });
}

export function usePaySupplier() {
  const invalidate = useInvalidatePOs();
  return useMutation({
    mutationFn: async (input: PaySupplierInput) => {
      const res = await apiClient.post<PurchaseOrder>(
        '/purchase-orders/pay-supplier',
        input
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useSupplierPayables(supplierId: string | null) {
  return useQuery({
    queryKey: ['purchase-orders', 'payables', supplierId],
    queryFn: async () => {
      const res = await apiClient.get<SupplierPayables>(
        `/purchase-orders/supplier/${supplierId}/payables`
      );
      return res.data;
    },
    enabled: !!supplierId,
  });
}