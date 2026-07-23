import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  AddRemainingPaymentInput,
  Branch,
  ReceivableSale,
} from '@/types';

function extractSales(payload: unknown): ReceivableSale[] {
  if (Array.isArray(payload)) {
    return payload as ReceivableSale[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray(
      (payload as { data?: unknown }).data,
    )
  ) {
    return (
      payload as { data: ReceivableSale[] }
    ).data;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'sales' in payload &&
    Array.isArray(
      (payload as { sales?: unknown }).sales,
    )
  ) {
    return (
      payload as { sales: ReceivableSale[] }
    ).sales;
  }

  return [];
}

function hasRemainingPayment(
  sale: ReceivableSale,
): boolean {
  const total = Number(sale.total ?? 0);
  const paid = Number(sale.amountPaid ?? 0);
  const remaining = total - paid;

  return (
    remaining > 0.01 &&
    sale.status !== 'RETURNED' &&
    sale.paymentStatus !== 'PAID'
  );
}

export function useBranchReceivables(
  branchId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['receivables', 'branch', branchId],

    queryFn: async () => {
      const response = await apiClient.get(
        `/sales/branch/${branchId}`,
      );

      return extractSales(response.data)
        .filter(hasRemainingPayment)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );
    },

    enabled: Boolean(branchId && enabled),
  });
}

export function useAllBranchesReceivables(
  branches: Branch[] | undefined,
  enabled: boolean,
) {
  const activeBranches = enabled
    ? branches ?? []
    : [];

  const queries = useQueries({
    queries: activeBranches.map((branch) => ({
      queryKey: [
        'receivables',
        'branch',
        branch.id,
      ],

      queryFn: async () => {
        const response = await apiClient.get(
          `/sales/branch/${branch.id}`,
        );

        return extractSales(response.data)
          .filter(hasRemainingPayment)
          .map(
            (sale): ReceivableSale => ({
              ...sale,
              branchId:
                sale.branchId ?? branch.id,
              branchName: branch.name,
            }),
          );
      },

      enabled,
    })),
  });

  const uniqueSales = new Map<
    string,
    ReceivableSale
  >();

  queries.forEach((query) => {
    query.data?.forEach((sale) => {
      uniqueSales.set(sale.id, sale);
    });
  });

  const data = Array.from(
    uniqueSales.values(),
  ).sort(
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
    data,

    isLoading:
      enabled &&
      activeBranches.length > 0 &&
      queries.some(
        (query) => query.isPending,
      ),

    isError:
      enabled &&
      activeBranches.length > 0 &&
      failedBranchCount ===
        activeBranches.length,

    partialError:
      failedBranchCount > 0 &&
      successfulBranchCount > 0,

    failedBranchCount,
  };
}

export function useAddRemainingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: AddRemainingPaymentInput,
    ) => {
      const response = await apiClient.post(
        '/sales/payments',
        input,
      );

      return response.data;
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['receivables'],
        }),

        queryClient.invalidateQueries({
          queryKey: ['bills'],
        }),

        queryClient.invalidateQueries({
          queryKey: ['finance'],
        }),

        queryClient.invalidateQueries({
          queryKey: ['bill-receipt'],
        }),
      ]);
    },
  });
}