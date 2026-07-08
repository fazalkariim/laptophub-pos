import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Receipt } from '@/types';

export function useReceipt(saleId: string | null) {
  return useQuery({
    queryKey: ['receipt', saleId],
    queryFn: async () => {
      const res = await apiClient.get<Receipt>(`/sales/${saleId}/receipt`);
      return res.data;
    },
    enabled: !!saleId,
  });
}