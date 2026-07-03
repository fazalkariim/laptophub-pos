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