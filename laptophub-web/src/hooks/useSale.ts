import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SaleLineInput {
  stockItemId: string;
  price: number;
  discount: number;
  quantity: number;
}

export interface SalePaymentInput {
  method: string;
  amount: number;
}

export interface CreateSaleInput {
  branchId: string;
  customerId?: string;
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
}

export interface SaleResult {
  id: string;
  invoiceNumber: string;
  subtotal: string;
  totalDiscount: string;
  total: string;
  amountPaid: string;
  paymentStatus: string;
  status: string;
  lines: any[];
  payments: any[];
}

export function useCreateSale(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const res = await apiClient.post<SaleResult>('/sales', input);
      return res.data;
    },
    onSuccess: () => {
      // sale ke baad stock badla — us branch ki list refresh
      qc.invalidateQueries({ queryKey: ['stock', branchId] });
    },
  });
}