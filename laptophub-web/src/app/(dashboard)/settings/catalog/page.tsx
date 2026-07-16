'use client';

import { useState } from 'react';
import { useCatalog } from '@/hooks/useCatalog';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductDialog } from '@/components/catalog/ProductDialog';
import { DeleteProductDialog } from '@/components/catalog/DeleteProductDialog';
import { RoleGate } from '@/components/shared/RoleGate';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';

export default function CatalogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useCatalog(page);

  // dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const columns: Column<Product>[] = [
    { header: 'SKU', cell: (p) => p.sku },
    { header: 'Model', cell: (p) => p.model },
    { header: 'Brand', cell: (p) => p.brand ?? '—' },
    { header: 'Category', cell: (p) => p.category ?? '—' },
    { header: 'Barcode', cell: (p) => p.barcode ?? '—' },
    {
      header: 'Specs',
      cell: (p) =>
        p.specs ? (
          <span className="line-clamp-1 max-w-[200px] text-muted-foreground" title={p.specs}>
            {p.specs}
          </span>
        ) : (
          '—'
        ),
    },
    {
      header: '',
      cell: (p) => (
        <div className="flex justify-end gap-2">
          <Button variant="inverted" size="sm" onClick={() => setEditProduct(p)}>
            Edit
          </Button>
          <RoleGate allow={['SUPER_ADMIN']}>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteProduct(p)}
            >
              Delete
            </Button>
          </RoleGate>
        </div>
      ),
    },
  ];

  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Products manage karein."
        action={<Button variant="tertiary" onClick={() => setCreateOpen(true)}>Add Product</Button>}
      />

      <DataTable
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        rowKey={(p) => p.id}
        emptyMessage="Abhi koi product nahi hai."
      />

      {/* Pagination controls */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <ProductDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit dialog */}
      <ProductDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(v) => !v && setEditProduct(undefined)}
      />

      {/* Delete confirm */}
      <DeleteProductDialog
        product={deleteProduct}
        onOpenChange={(v) => !v && setDeleteProduct(null)}
      />
    </div>
  );
}