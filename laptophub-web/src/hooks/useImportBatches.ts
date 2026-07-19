import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BulkImportResult, ImportBatchSummary, ImportBatchDetail, BulkImportRow } from '@/types';

export function useBulkImportV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<BulkImportResult>(
        '/inventory/bulk/import',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });
}

export function useImportBatches() {
  return useQuery({
    queryKey: ['import-batches'],
    queryFn: async () => {
      const res = await apiClient.get<ImportBatchSummary[]>(
        '/inventory/import-batches'
      );
      return res.data;
    },
  });
}

export function useImportBatchDetail(id: string | null) {
  return useQuery({
    queryKey: ['import-batches', id],
    queryFn: async () => {
      const res = await apiClient.get<ImportBatchDetail>(
        `/inventory/import-batches/${id}`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export interface UpdateImportRowInput {
  location?: string;
  lastScan?: string | null;
  category?: string;
  brand?: string | null;
  trackingId?: string;
  specs?: string;
  costByVS?: number | null;
  finalSale?: number | null;
  buyer?: string | null;
  date?: string | null;
  status?: string | null;
  saleAt?: string | null;
  vendor?: string | null;
  vendorTrackingId?: string | null;
  receivedOn?: string | null;
  purchase?: number;
}

export function useUpdateImportRow(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rowNo,
      ...input
    }: UpdateImportRowInput & { rowNo: number }) => {
      const res = await apiClient.patch<BulkImportRow>(
        `/inventory/import-batches/${batchId}/rows/${rowNo}`,
        input
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import-batches', batchId] });
      qc.invalidateQueries({ queryKey: ['import-batches'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export interface TransferFromBatchInput {
  stockItemIds: string[];
  destBranchId: string;
  visibleColumns: string[];
  note?: string;
}

export function useTransferFromBatch(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransferFromBatchInput) => {
      const res = await apiClient.post(
        `/inventory/import-batches/${batchId}/transfer`,
        input
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export function useDeleteImportBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message: string }>(
        `/inventory/import-batches/${id}`
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });
}