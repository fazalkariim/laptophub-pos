import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Customer, CreateCustomerInput } from '@/types';

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