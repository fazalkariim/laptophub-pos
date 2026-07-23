import { useMutation,useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Branch, StockItem } from '@/types';

export function useStock(branchId: string | null) {
  return useQuery({
    queryKey: ['stock', branchId],
    queryFn: async () => {
      const res = await apiClient.get<StockItem[]>(
        `/inventory/branch/${branchId}`
      );
      return res.data;
    },
    enabled: !!branchId,
  });
}

export interface IntakeInput {
  branchId: string;
  productId: string;
  serialNumber?: string;
  quantity: number;
  costPrice?: number;
}

export interface AdjustmentInput {
  stockItemId: string;
  quantityChange: number;
  reason: string;
  newStatus?: string;
}

export interface BulkResult {
  imported: number;
  failedCount: number;
  failed: any[]; // string ya { serial, reason } — dono handle karenge UI mein
}

export interface BulkScanInput {
  branchId: string;
  productId: string;
  serials: string[];
}

export interface BulkImportInput {
  branchId: string;
  productId: string;
  file: File;
}

export interface StockItemWithBranch extends StockItem {
  inventoryBranchId: string;
  inventoryBranchName: string;
}

interface AllBranchesStockResult {
  data: StockItemWithBranch[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  partialError: boolean;
  failedBranchCount: number;
}

export function useAddStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: IntakeInput) => {
      const res = await apiClient.post<StockItem>('/inventory', input);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      // us branch ki stock list turant refresh
      qc.invalidateQueries({ queryKey: ['stock', variables.branchId] });
    },
  });
}

export function useBulkImport(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkImportInput) => {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('branchId', input.branchId);
      formData.append('productId', input.productId);

      const res = await apiClient.post<BulkResult>(
        '/inventory/bulk/import',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', branchId] });
    },
  });
}

export function useAdjustStock(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdjustmentInput) => {
      const res = await apiClient.post('/inventory/adjustments', input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', branchId] });
    },
  });
}

export function useBulkScan(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkScanInput) => {
      const res = await apiClient.post<BulkResult>(
        '/inventory/bulk/scan',
        input
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', branchId] });
    },
  });
}

function extractCount(payload: any): number {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.data)) return payload.data.length;
  if (typeof payload?.count === 'number') return payload.count;
  return 0;
}

export function useLowStockCount(branchId: string | null) {
  return useQuery({
    queryKey: ['low-stock', branchId],
    queryFn: async () => {
      const res = await apiClient.get(`/inventory/branch/${branchId}/low-stock`);
      return extractCount(res.data);
    },
    enabled: !!branchId,
  });
}

export function useAllBranchesLowStockCount(branchIds: string[]) {
  return useQuery({
    queryKey: ['low-stock', 'all', branchIds],
    queryFn: async () => {
      const results = await Promise.all(
        branchIds.map((id) =>
          apiClient
            .get(`/inventory/branch/${id}/low-stock`)
            .then((res) => extractCount(res.data))
            .catch(() => 0)
        )
      );
      return results.reduce((sum, c) => sum + c, 0);
    },
    enabled: branchIds.length > 0,
  });
}

export function useAllBranchesStock(
  branches: Branch[] | undefined,
  enabled: boolean,
): AllBranchesStockResult {
  const activeBranches = enabled ? branches ?? [] : [];

  const queries = useQueries({
    queries: activeBranches.map((branch) => ({
      queryKey: ['stock', branch.id],
      queryFn: async () => {
        const response = await apiClient.get<StockItem[]>(
          `/inventory/branch/${branch.id}`,
        );

        return response.data.map(
          (item): StockItemWithBranch => ({
            ...item,
            inventoryBranchId: branch.id,
            inventoryBranchName: branch.name,
          }),
        );
      },
      enabled,
    })),
  });

  /*
   * Map use kar rahe hain taake kisi wajah se same stock ID do results mein
   * aa jaye to table mein duplicate row na bane.
   */
  const uniqueItems = new Map<string, StockItemWithBranch>();

  queries.forEach((query) => {
    query.data?.forEach((item) => {
      uniqueItems.set(item.id, item);
    });
  });

  const failedBranchCount = queries.filter(
    (query) => query.isError,
  ).length;

  const successfulBranchCount = queries.filter(
    (query) => query.isSuccess,
  ).length;

  return {
    data: Array.from(uniqueItems.values()),
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