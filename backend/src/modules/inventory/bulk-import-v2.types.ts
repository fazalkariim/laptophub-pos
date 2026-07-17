export interface ParsedRow {
  no: number;
  location?: string;
  lastScan?: string;
  category?: string;
  brand?: string;
  trackingId?: string;
  specs?: string;
  costByVS?: number;
  finalSale?: number;
  buyer?: string;
  date?: string;
  status?: string;
  saleAt?: string;
  vendor?: string;
  vendorTrackingId?: string;
  receivedOn?: string;
  purchase?: number;
}

export interface RowResult {
  no: number;
  [key: string]: any;
  result: 'success' | 'failed';
  reason?: string;
}