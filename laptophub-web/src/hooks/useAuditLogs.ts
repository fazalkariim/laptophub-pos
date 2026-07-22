import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedAuditLogs, AuditLogDetail } from '@/types';

export interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page: number;
  limit?: number;
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit ?? 50));
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await apiClient.get<PaginatedAuditLogs>(
        `/audit-logs?${params}`
      );
      return res.data;
    },
  });
}

export function useAuditLogDetail(id: string | null) {
  return useQuery({
    queryKey: ['audit-logs', 'detail', id],
    queryFn: async () => {
      const res = await apiClient.get<AuditLogDetail>(`/audit-logs/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}