import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Branch } from '@/types';

export interface CreateBranchInput {
  name: string;
  address?: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
}

export function useBranches() {
  return useQuery({
    queryKey: queryKeys.branches,
    queryFn: async () => {
      const res = await apiClient.get<Branch[]>('/branches');
      return res.data;
    },
  });
}

export function useBranch(id: string | null) {
  return useQuery({
    queryKey: ['branches', id],
    queryFn: async () => {
      const res = await apiClient.get<Branch>(`/branches/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const res = await apiClient.post<Branch>('/branches', input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
    },
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateBranchInput & { id: string }) => {
      const res = await apiClient.patch<Branch>(`/branches/${id}`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message: string }>(
        `/branches/${id}`
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
    },
  });
}