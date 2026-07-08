import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Customer, CreateCustomerInput } from '@/types';
import type {CustomerHistory,CustomerWarranties,} from '@/types';
import type { ExpiringWarranty } from '@/types';


export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ['customers', 'search', query],
    queryFn: async () => {
      const res = await apiClient.get<Customer[]>(
        `/customers/search?q=${encodeURIComponent(query)}`
      );
      return res.data;
    },
    enabled: query.trim().length >= 2, // 2+ chars pe search
  });
}

export interface CustomerWarning {
  message: string;
  existing?: Customer;
}

export interface CreateCustomerResult {
  customer: Customer;
  warning: CustomerWarning | null;
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const res = await apiClient.post<CreateCustomerResult>(
        '/customers',
        input
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export interface PaginatedCustomers {
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useCustomerList(page: number, limit = 20) {
  return useQuery({
    queryKey: ['customers', 'list', page, limit],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedCustomers>(
        `/customers?page=${page}&limit=${limit}`
      );
      return res.data;
    },
  });
}


export function useCustomerDetail(id: string | null) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: async () => {
      const res = await apiClient.get<Customer>(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCustomerHistory(id: string | null) {
  return useQuery({
    queryKey: ['customers', 'history', id],
    queryFn: async () => {
      const res = await apiClient.get<CustomerHistory>(
        `/sales/customer/${id}/history`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCustomerWarranties(id: string | null) {
  return useQuery({
    queryKey: ['customers', 'warranties', id],
    queryFn: async () => {
      const res = await apiClient.get<CustomerWarranties>(
        `/sales/customer/${id}/warranties`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export function useExpiringWarranties(branchId: string | null, withinDays = 30) {
  return useQuery({
    queryKey: ['warranties', 'expiring', branchId, withinDays],
    queryFn: async () => {
      const res = await apiClient.get<ExpiringWarranty[]>(
        `/sales/warranties/expiring/${branchId}?withinDays=${withinDays}`
      );
      return res.data;
    },
    enabled: !!branchId,
  });
}