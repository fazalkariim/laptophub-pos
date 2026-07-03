import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Branch } from '@/types';

export function useBranches() {
  return useQuery({
    queryKey: queryKeys.branches,
    queryFn: async () => {
      const res = await apiClient.get<Branch[]>('/branches');
      return res.data;
    },
  });
}