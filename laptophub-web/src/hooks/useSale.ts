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

// Ye function 8 second ke andar jawab na aaye to khud "timeout" error de deta hai,
// chahe asli request background mein latki reh jaaye. Ye axios/XHR ke apne
// cancellation mechanism pe depend nahi karta — isliye hamesha kaam karta hai.
function postWithHardTimeout<T>(url: string, data: any, ms = 8000): Promise<T> {
  console.log('>>> SALE: mutationFn shuru hua');
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      console.log('>>> SALE: 8 second timer chal gaya, reject kar rahe hain');
      if (settled) return;
      settled = true;
      const timeoutError: any = new Error('Request timed out');
      timeoutError.code = 'HARD_TIMEOUT';
      timeoutError.response = undefined;
      reject(timeoutError);
    }, ms);

    apiClient
      .post<T>(url, data)
      .then((res) => {
        console.log('>>> SALE: request SUCCESS aa gayi');
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res.data as T);
      })
      .catch((err) => {
        console.log('>>> SALE: request CATCH mein gayi', err);
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function useCreateSale(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      return postWithHardTimeout<SaleResult>('/sales', input, 8000);
    },
    networkMode: 'always',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', branchId] });
    },
  });
}