import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Product,
  CreateProductInput,
  PaginatedResponse,
} from '@/types';

export function useCatalog(page: number, limit = 10) {
  return useQuery({
    queryKey: ['catalog', page, limit],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Product>>(
        `/catalog?page=${page}&limit=${limit}`
      );
      return res.data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const res = await apiClient.post<Product>('/catalog', input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: CreateProductInput & { id: string }) => {
      const res = await apiClient.patch<Product>(`/catalog/${id}`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/catalog/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

// Dropdown ke liye — bada limit taake saare products ek call mein aa jaayein
export function useAllProducts() {
  return useQuery({
    queryKey: ['catalog', 'all'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Product>>(
        '/catalog?page=1&limit=100'
      );
      return res.data.data;
    },
  });
}