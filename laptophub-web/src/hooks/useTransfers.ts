import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Transfer,
  CreateTransferInput,
  TransferActionInput,
  ConsolidatedStockRow,
} from '@/types';

export function useTransfers() {
  return useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const res = await apiClient.get<Transfer[]>('/transfers');
      return res.data;
    },
  });
}

function useTransferMutation() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transfers'] });
    qc.invalidateQueries({ queryKey: ['stock'] }); // stock badla dono branch mein
  };
  return { qc, invalidate };
}

export function useCreateTransfer() {
  const { invalidate } = useTransferMutation();
  return useMutation({
    mutationFn: async (input: CreateTransferInput) => {
      const res = await apiClient.post<Transfer>('/transfers', input);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useReceiveTransfer() {
  const { invalidate } = useTransferMutation();
  return useMutation({
    mutationFn: async (input: TransferActionInput) => {
      const res = await apiClient.post<Transfer>('/transfers/receive', input);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useRejectTransfer() {
  const { invalidate } = useTransferMutation();
  return useMutation({
    mutationFn: async (input: TransferActionInput) => {
      const res = await apiClient.post<Transfer>('/transfers/reject', input);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelTransfer() {
  const { invalidate } = useTransferMutation();
  return useMutation({
    mutationFn: async (input: TransferActionInput) => {
      const res = await apiClient.post<Transfer>('/transfers/cancel', input);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useConsolidatedStock() {
  return useQuery({
    queryKey: ['transfers', 'consolidated-stock'],
    queryFn: async () => {
      const res = await apiClient.get<ConsolidatedStockRow[]>(
        '/transfers/consolidated-stock'
      );
      return res.data;
    },
  });
}