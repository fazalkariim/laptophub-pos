import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Supplier, CreateSupplierInput } from '@/types';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await apiClient.get<Supplier[]>('/suppliers');
      return res.data;
    },
  });
}

function useSupplierMutation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['suppliers'] });
}

export function useCreateSupplier() {
  const invalidate = useSupplierMutation();
  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const res = await apiClient.post<Supplier>('/suppliers', input);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSupplier() {
  const invalidate = useSupplierMutation();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: CreateSupplierInput & { id: string }) => {
      const res = await apiClient.patch<Supplier>(`/suppliers/${id}`, input);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSupplier() {
  const invalidate = useSupplierMutation();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message: string }>(
        `/suppliers/${id}`
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}