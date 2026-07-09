'use client';

import { useState } from 'react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import { DeleteSupplierDialog } from '@/components/suppliers/DeleteSupplierDialog';
import { Button } from '@/components/ui/button';
import type { Supplier } from '@/types';

export default function SuppliersPage() {
  const { data, isLoading, isError } = useSuppliers();

  const [createOpen, setCreateOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | undefined>();
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  const columns: Column<Supplier>[] = [
    { header: 'Name', cell: (s) => s.name },
    { header: 'Contact', cell: (s) => s.contact ?? '—' },
    { header: 'Terms', cell: (s) => s.terms ?? '—' },
    {
      header: '',
      cell: (s) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditSupplier(s)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteSupplier(s)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Apne suppliers manage karein."
        action={<Button onClick={() => setCreateOpen(true)}>Add Supplier</Button>}
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        rowKey={(s) => s.id}
        emptyMessage="Abhi koi supplier nahi hai."
      />

      <SupplierDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SupplierDialog
        supplier={editSupplier}
        open={!!editSupplier}
        onOpenChange={(v) => !v && setEditSupplier(undefined)}
      />
      <DeleteSupplierDialog
        supplier={deleteSupplier}
        onOpenChange={(v) => !v && setDeleteSupplier(null)}
      />
    </div>
  );
}