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
  barcode: string | null;
}

export interface CreateProductInput {
  sku: string;
  model: string;
  brand?: string;
  category?: string;
  specs?: string;
  barcode?: string;
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

export interface TransferLine {
  id: string;
  transferId: string;
  stockItemId: string;
}

export interface Transfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  destBranchId: string;
  status: 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED';
  sentById: string;
  receivedById: string | null;
  note: string | null;
  createdAt: string;
  completedAt: string | null;
  lines: TransferLine[];
}

export interface CreateTransferInput {
  sourceBranchId: string;
  destBranchId: string;
  stockItemIds: string[];
  note?: string;
}

export interface TransferActionInput {
  transferId: string;
  reason: string;
}

export interface ConsolidatedStockRow {
  branchId: string;
  status: string;
  itemCount: number;
  totalQuantity: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  terms: string | null;
  deletedAt: string | null;
}

export interface CreateSupplierInput {
  name: string;
  contact?: string;
  terms?: string;
}

export interface POLine {
  id: string;
  poId: string;
  productId: string;
  quantity: number;
  receivedQty: number;
  costPrice: string;
  product?: { brand: string; model: string; sku: string };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  destinationBranchId: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  totalCost: string;
  amountPaid: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  createdById: string;
  note: string | null;
  createdAt: string;
  lines: POLine[];
  supplier?: { name: string; contact: string | null };
}

export interface CreatePOLineInput {
  productId: string;
  quantity: number;
  costPrice: number;
}

export interface CreatePOInput {
  supplierId: string;
  destinationBranchId: string;
  lines: CreatePOLineInput[];
  note?: string;
}

export interface ReceivePOLineInput {
  poLineId: string;
  serials: string[];
  quantity: number;
}

export interface ReceivePOInput {
  poId: string;
  lines: ReceivePOLineInput[];
}

export interface PaySupplierInput {
  poId: string;
  method: string;
  amount: number;
}

export interface SupplierPayables {
  supplier: { id: string; name: string; contact: string | null };
  summary: {
    totalOrdered: number;
    totalPaid: number;
    totalDue: number;
    posCount: number;
  };
  orders: any[];
}

export interface Expense {
  id: string;
  branchId: string;
  category: string;
  amount: string;
  date: string;
}

export interface CreateExpenseInput {
  branchId: string;
  category: string;
  amount: number;
  date: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  count: number;
}

export interface BranchProfit {
  branchId: string;
  period: { from: string; to: string };
  revenue: number;
  cogs: number;
  grossMargin: number;
  marginPercent: number;
  itemsSold: number;
  itemsWithoutCost: number;
}

export interface SalesSummary {
  branchId: string;
  period: { from: string; to: string };
  summary: {
    totalSalesCount: number;
    returnedCount: number;
    activeSalesCount: number;
    grossRevenue: number;
    totalCollected: number;
    totalReceivable: number;
  };
  paymentBreakdown: Record<string, number>;
}

export interface FinanceDashboard {
  period: { from: string; to: string };
  overall: {
    revenue: number;
    cogs: number;
    grossMargin: number;
    expenses: number;
    netProfit: number;
    collected: number;
    receivable: number;
    payable: number;
    netCashPosition: number;
  };
  perBranch: Array<{
    branchId: string;
    branchName: string;
    revenue: number;
    cogs: number;
    grossMargin: number;
    expenses: number;
    netProfit: number;
    collected: number;
    receivable: number;
    salesCount: number;
  }>;
}

export interface SalesmanPerformance {
  period: { from: string; to: string };
  scope: string;
  salesmen: Array<{
    salesmanId: string;
    name: string;
    email: string;
    salesCount: number;
    totalSold: number;
    averageSale: number;
  }>;
}

export interface BestSellingProducts {
  period: { from: string; to: string };
  scope: string;
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }>;
}

export interface StockValuation {
  scope: string;
  summary: {
    totalUnits: number;
    totalValue: number;
    itemsWithoutCost: number;
  };
  byProduct: Array<{
    productId: string;
    name: string;
    sku: string;
    units: number;
    value: number;
  }>;
  byBranch: Array<{ branchId: string; units: number; value: number }>;
}