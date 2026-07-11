'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerList, useCustomerSearch } from '@/hooks/useCustomers';
import { DataTable, Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateCustomerDialog } from '@/components/customers/CreateCustomerDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/types';

export default function CustomersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const list = useCustomerList(page);
  const searchResult = useCustomerSearch(search);

  // Agar search active hai (2+ chars), search results dikhao; warna paginated list
  const isSearching = search.trim().length >= 2;
  const data = isSearching ? searchResult.data : list.data?.data;
  const isLoading = isSearching ? searchResult.isLoading : list.isLoading;
  const isError = isSearching ? searchResult.isError : list.isError;
  const meta = list.data?.meta;

  const columns: Column<Customer>[] = [
    { header: 'Name', cell: (c) => c.name },
    { header: 'Contact', cell: (c) => c.contact ?? '—' },
    { header: 'Type', cell: (c) => c.type ?? '—' },
    {
      header: 'Tags',
      cell: (c) =>
        c.tags.length > 0 ? (
          <div className="flex gap-1">
            {c.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      header: '',
      cell: (c) => (
        <Button
          variant="inverted"
          size="sm"
          onClick={() => router.push(`/customers/${c.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Apne customers dekhein aur manage karein."
        action={<CreateCustomerDialog />}
      />

      <div className="mb-4 max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Naam ya phone se search karein…"
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        rowKey={(c) => c.id}
        emptyMessage={
          isSearching ? 'Koi customer nahi mila.' : 'Abhi koi customer nahi hai.'
        }
      />

      {!isSearching && meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}