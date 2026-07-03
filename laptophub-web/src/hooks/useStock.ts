import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StockItem } from '@/types';

export function useStock(branchId: string | null) {
  return useQuery({
    queryKey: ['stock', branchId],
    queryFn: async () => {
      const res = await apiClient.get<StockItem[]>(
        `/inventory/branch/${branchId}`
      );
      return res.data;
    },
    enabled: !!branchId,
  });
}