import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Expense,
  CreateExpenseInput,
  ExpensesResponse,
  BranchProfit,
  SalesSummary,
  FinanceDashboard,
} from '@/types';

export function useExpenses(branchId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['expenses', branchId, from, to],
    queryFn: async () => {
      const res = await apiClient.get<ExpensesResponse>(
        `/expenses/branch/${branchId}?from=${from}&to=${to}`
      );
      return res.data;
    },
    enabled: !!branchId,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const res = await apiClient.post<Expense>('/expenses', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message: string }>(
        `/expenses/${id}`
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useBranchProfit(branchId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['finance', 'profit', branchId, from, to],
    queryFn: async () => {
      const res = await apiClient.get<BranchProfit>(
        `/finance/profit/${branchId}?from=${from}&to=${to}`
      );
      return res.data;
    },
    enabled: !!branchId,
  });
}

export function useSalesSummary(branchId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: ['finance', 'sales-summary', branchId, from, to],
    queryFn: async () => {
      const res = await apiClient.get<SalesSummary>(
        `/finance/sales-summary/${branchId}?from=${from}&to=${to}`
      );
      return res.data;
    },
    enabled: !!branchId,
  });
}

export function useFinanceDashboard(from: string, to: string) {
  return useQuery({
    queryKey: ['finance', 'dashboard', from, to],
    queryFn: async () => {
      const res = await apiClient.get<FinanceDashboard>(
        `/finance/dashboard?from=${from}&to=${to}`
      );
      return res.data;
    },
  });
}