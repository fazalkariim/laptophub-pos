'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchaseOrders, useSendPO } from '@/hooks/usePurchaseOrders';
import { usePagination } from '@/hooks/usePagination';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { PageHeader } from '@/components/shared/PageHeader';
import { POStatusBadge } from '@/components/purchasing/POStatusBadge';
import { CreatePODialog } from '@/components/purchasing/CreatePODialog';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import type { PurchaseOrder } from '@/types';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { data: suppliers } = useSuppliers();
  const { data: orders, isLoading, isError } = usePurchaseOrders();
  const sendPO = useSendPO();

  const { pageItems, page, setPage, totalPages, total } = usePagination(
    orders,
    20,
  );

  function supplierName(id: string) {
    return suppliers?.find((s) => s.id === id)?.name ?? id;
  }

  function onSend(id: string) {
    sendPO.mutate(id, {
      onSuccess: () => toast.success('PO send ho gaya'),
      onError: (err: any) =>
        toast.error(err?.response?.data?.message ?? 'Send fail hua'),
    });
  }

  const columns: Column<PurchaseOrder>[] = [
    { header: 'PO #', cell: (po) => po.poNumber },
    { header: 'Supplier', cell: (po) => supplierName(po.supplierId) },
    { header: 'Total', cell: (po) => formatMoney(po.totalCost) },
    {
      header: 'Payment',
      cell: (po) => (
        <span
          className={
            po.paymentStatus === 'PAID'
              ? 'text-green-600'
              : po.paymentStatus === 'PARTIAL'
                ? 'text-amber-600'
                : 'text-muted-foreground'
          }
        >
          {po.paymentStatus}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (po) => <POStatusBadge status={po.status} />,
    },
    {
      header: '',
      cell: (po) => (
        <div className="flex justify-end gap-2">
          {po.status === 'DRAFT' && (
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => onSend(po.id)}
              disabled={sendPO.isPending}
            >
              Send
            </Button>
          )}

          <Button
            variant="inverted"
            size="sm"
            onClick={() => router.push(`/purchasing/orders/${po.id}`)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Suppliers se stock order karein."
        action={<CreatePODialog />}
      />

      <DataTable
        columns={columns}
        data={pageItems}
        isLoading={isLoading}
        isError={isError}
        rowKey={(po) => po.id}
        emptyMessage="Abhi koi purchase order nahi hai."
      />

      {total > 0 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}