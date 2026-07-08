import type { Role } from '@/lib/auth';

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  branchId: string | null;
  branch?: Branch | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  branchId: string;
}

export interface Product {
  id: string;
  sku: string;
  model: string;
  brand: string | null;
  category: string | null;
  specs: string | null;
}

export interface CreateProductInput {
  sku: string;
  model: string;
  brand?: string;
  category?: string;
  specs?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Customer {
  id: string;
  branchId: string;
  name: string;
  contact: string | null;
  type: string | null;
  tags: string[];
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  contact?: string;
  type?: string;
  tags?: string[];
}

export interface ReceiptItem {
  description: string;
  serialNumber: string | null;
  price: number;
  discount: number;
  lineTotal: number;
}

export interface ReceiptPayment {
  method: string;
  amount: number;
}

export interface Receipt {
  invoiceNumber: string;
  date: string;
  branch: { name: string; address: string | null };
  salesman: string;
  customer: { name: string; contact: string | null } | null;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
  totalDiscount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  status: string;
}

export type StockStatus = 'IN_STOCK' | 'SOLD' | string;

export interface StockItem {
  id: string;
  branchId: string;
  productId: string;
  serialNumber: string | null;
  quantity: number;
  status: StockStatus;
  costPrice: string | null;
  createdAt: string;
  product: {
    brand: string | null;
    model: string;
    sku: string;
    category: string | null;
  };
}

export interface CustomerHistorySale {
  saleId: string;
  invoiceNumber: string;
  date: string;
  items: string[];
  total: number;
  paid: number;
  due: number;
  paymentStatus: string;
  saleStatus: string;
}

export interface CustomerHistory {
  customer: { id: string; name: string; contact: string | null };
  summary: {
    totalPurchased: number;
    totalPaid: number;
    totalDue: number;
    salesCount: number;
  };
  history: CustomerHistorySale[];
}

export interface CustomerWarranty {
  id: string;
  serial: string | null;
  product: string;
  startDate: string;
  endDate: string;
  status: string;
  daysLeft: number;
  isExpired: boolean;
}

export interface CustomerWarranties {
  customer: { id: string; name: string };
  warranties: CustomerWarranty[];
}

export interface ExpiringWarranty {
  id: string;
  serial: string | null;
  product: string;
  customer: { name: string; contact: string | null };
  endDate: string;
}