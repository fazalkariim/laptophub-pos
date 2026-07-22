// Route pattern → human-readable action label
// Pattern format: "METHOD /path/with/:param"
const ROUTE_LABELS: Record<string, string> = {
  'GET /inventory/branch/:branchId': 'Viewed inventory',
  'POST /inventory': 'Stock add kiya',
  'POST /inventory/adjustments': 'Stock adjust kiya',
  'POST /inventory/bulk/scan': 'Bulk scan intake kiya',
  'POST /inventory/bulk/import': 'Bulk import kiya',
  'DELETE /inventory/import-batches/:id': 'Upload history delete ki',
  'GET /users': 'Users list dekhi',
  'POST /users': 'User banaya',
  'DELETE /users/:id': 'User delete kiya',
  'GET /branches': 'Branches list dekhi',
  'POST /branches': 'Branch banaya',
  'PATCH /branches/:id': 'Branch update kiya',
  'DELETE /branches/:id': 'Branch delete kiya',
  'GET /catalog': 'Catalog dekha',
  'POST /catalog': 'Product banaya',
  'PATCH /catalog/:id': 'Product update kiya',
  'DELETE /catalog/:id': 'Product delete kiya',
  'POST /sales': 'Sale ki',
  'POST /sales/returns': 'Return kiya',
  'POST /sales/payments': 'Payment collect ki',
  'GET /customers': 'Customers list dekhi',
  'POST /customers': 'Customer banaya',
  'POST /transfers': 'Transfer bheja',
  'POST /transfers/receive': 'Transfer receive kiya',
  'POST /transfers/reject': 'Transfer reject kiya',
  'POST /transfers/cancel': 'Transfer cancel kiya',
  'POST /suppliers': 'Supplier banaya',
  'POST /purchase-orders': 'PO banaya',
  'POST /purchase-orders/:id/send': 'PO send kiya',
  'POST /purchase-orders/receive': 'Goods receive kiya',
  'POST /purchase-orders/pay-supplier': 'Supplier payment ki',
  'POST /expenses': 'Expense add kiya',
  'DELETE /expenses/:id': 'Expense delete kiya',
  'GET /finance/dashboard': 'Dashboard dekha',
  'GET /reports/stock-valuation': 'Stock valuation dekhi',
  'PATCH /auth/change-password': 'Password badla',
  'PATCH /auth/reset-password': 'User ka password reset kiya',
};

// Route ko URL pattern mein badlo taake IDs generic ":param" ban jayein
// e.g. "/users/abc-123-uuid" -> "/users/:id"
function normalizeRoute(path: string): string {
  // UUID-jaisa koi bhi segment ":id" ban jayega
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
             .replace(/\/branch-[a-zA-Z0-9-]+/g, '/:branchId'); // seed branch ids jaise 'branch-main'
}

export function getActionLabel(method: string, path: string): string {
  const cleanPath = path.split('?')[0]; // query params hatao
  const normalized = normalizeRoute(cleanPath);
  const key = `${method} ${normalized}`;
  return ROUTE_LABELS[key] ?? `${method} ${cleanPath}`; // fallback
}

// Route se entityType nikaalne ke liye chhota mapping
export function getEntityType(path: string): string | null {
  const segment = path.split('?')[0].split('/')[1];
  const map: Record<string, string> = {
    users: 'User', branches: 'Branch', catalog: 'Product',
    sales: 'Sale', customers: 'Customer', transfers: 'Transfer',
    suppliers: 'Supplier', 'purchase-orders': 'PurchaseOrder',
    expenses: 'Expense', inventory: 'StockItem',
  };
  return map[segment] ?? null;
}