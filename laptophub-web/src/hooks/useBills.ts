import { useQueries, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  BillReceipt,
  BillSale,
  Branch,
} from '@/types';

function extractSales(payload: unknown): BillSale[] {
  if (Array.isArray(payload)) {
    return payload as BillSale[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: BillSale[] }).data;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'sales' in payload &&
    Array.isArray((payload as { sales?: unknown }).sales)
  ) {
    return (payload as { sales: BillSale[] }).sales;
  }

  return [];
}

export function useBranchBills(
  branchId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['bills', 'branch', branchId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/sales/branch/${branchId}`,
      );

      return extractSales(response.data);
    },
    enabled: Boolean(branchId && enabled),
  });
}

export function useAllBranchesBills(
  branches: Branch[] | undefined,
  enabled: boolean,
) {
  const activeBranches = enabled ? branches ?? [] : [];

  const queries = useQueries({
    queries: activeBranches.map((branch) => ({
      queryKey: ['bills', 'branch', branch.id],
      queryFn: async () => {
        const response = await apiClient.get(
          `/sales/branch/${branch.id}`,
        );

        const sales = extractSales(response.data);

        return sales.map(
          (sale): BillSale => ({
            ...sale,
            branchId: sale.branchId ?? branch.id,
            branchName: branch.name,
          }),
        );
      },
      enabled,
    })),
  });

  const uniqueBills = new Map<string, BillSale>();

  queries.forEach((query) => {
    query.data?.forEach((bill) => {
      uniqueBills.set(bill.id, bill);
    });
  });

  const bills = Array.from(uniqueBills.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  const failedBranchCount = queries.filter(
    (query) => query.isError,
  ).length;

  const successfulBranchCount = queries.filter(
    (query) => query.isSuccess,
  ).length;

  return {
    data: bills,

    isLoading:
      enabled &&
      activeBranches.length > 0 &&
      queries.some((query) => query.isPending),

    isFetching: queries.some((query) => query.isFetching),

    isError:
      enabled &&
      activeBranches.length > 0 &&
      failedBranchCount === activeBranches.length,

    partialError:
      failedBranchCount > 0 &&
      successfulBranchCount > 0,

    failedBranchCount,
  };
}

export function useBillReceipt(
  saleId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['bill-receipt', saleId],
    queryFn: async () => {
      const response = await apiClient.get<BillReceipt>(
        `/sales/${saleId}/receipt`,
      );

      return response.data;
    },
    enabled: Boolean(saleId && enabled),
  });
}