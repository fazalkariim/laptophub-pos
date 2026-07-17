import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BulkImportResult, ImportBatchSummary, ImportBatchDetail } from '@/types';

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