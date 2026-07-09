import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  SalesmanPerformance,
  BestSellingProducts,
  StockValuation,
} from '@/types';

export function useSalesmanPerformance(
  branchId: string | null,
  from: string,
  to: string
) {
  return useQuery({
    queryKey: ['reports', 'salesman-performance', branchId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (branchId) params.set('branchId', branchId);
      const res = await apiClient.get<SalesmanPerformance>(
        `/reports/salesman-performance?${params}`
      );
      return res.data;
    },
  });
}

export function useBestSellingProducts(
  branchId: string | null,
  from: string,
  to: string
) {
  return useQuery({
    queryKey: ['reports', 'best-selling', branchId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (branchId) params.set('branchId', branchId);
      const res = await apiClient.get<BestSellingProducts>(
        `/reports/best-selling-products?${params}`
      );
      return res.data;
    },
  });
}

export function useStockValuation(branchId: string | null) {
  return useQuery({
    queryKey: ['reports', 'stock-valuation', branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const res = await apiClient.get<StockValuation>(
        `/reports/stock-valuation?${params}`
      );
      return res.data;
    },
  });
}