'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  useCustomerList,
  useCustomerSearch,
} from '@/hooks/useCustomers';
import {
  DataTable,
  type Column,
} from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateCustomerDialog } from '@/components/customers/CreateCustomerDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/types';

type CustomerTypeFilter = 'all' | 'individual' | 'business';

export default function CustomersPage() {
  const router = useRouter();
  const user = useAuth((state) => state.user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] =
    useState<CustomerTypeFilter>('all');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const list = useCustomerList(page);
  const searchResult = useCustomerSearch(search);

  /*
   * Existing customer search hook 2 ya zyada characters par use hota hai.
   */
  const isSearching = search.trim().length >= 2;

  const rawData = isSearching
    ? searchResult.data
    : list.data?.data;

  const isLoading = isSearching
    ? searchResult.isLoading
    : list.isLoading;

  const isError = isSearching
    ? searchResult.isError
    : list.isError;

  const meta = list.data?.meta;

  /*
   * Type filter currently loaded/search-result customers par apply hota hai.
   * Search aur type filter ek saath bhi kaam karenge.
   */
  const filteredCustomers = useMemo(() => {
    if (!rawData) return [];

    if (!isSuperAdmin || customerType === 'all') {
      return rawData;
    }

    return rawData.filter(
      (customer) =>
        customer.type?.toLowerCase() === customerType,
    );
  }, [rawData, customerType, isSuperAdmin]);

  const columns: Column<Customer>[] = [
    {
      header: 'Name',
      cell: (customer) => customer.name,
    },
    {
      header: 'Contact',
      cell: (customer) => customer.contact ?? '—',
    },
    {
      header: 'Type',
      cell: (customer) => {
        const type = customer.type?.toLowerCase();

        if (!type) return '—';

        return (
          <span
            className={
              type === 'business'
                ? 'inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700'
                : 'inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700'
            }
          >
            {type === 'business'
              ? 'Business'
              : 'Individual'}
          </span>
        );
      },
    },
    {
      header: 'Tags',
      cell: (customer) =>
        customer.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      header: '',
      cell: (customer) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/customers/${customer.id}`)
            }
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  if (!user) return null;

  const hasActiveFilter =
    search.trim().length > 0 ||
    (isSuperAdmin && customerType !== 'all');

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Apne customers dekhein aur manage karein."
        action={<CreateCustomerDialog />}
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-2xl">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Naam ya phone se search karein…"
            className="w-full sm:max-w-sm"
          />

          {isSuperAdmin && (
            <select
              value={customerType}
              onChange={(event) => {
                setCustomerType(
                  event.target.value as CustomerTypeFilter,
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-[180px]"
            >
              <option value="all">All Customers</option>
              <option value="individual">Individuals</option>
              <option value="business">Businesses</option>
            </select>
          )}

          {hasActiveFilter && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setCustomerType('all');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {!isLoading && !isError && (
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            {filteredCustomers.length}{' '}
            {filteredCustomers.length === 1
              ? 'customer'
              : 'customers'}{' '}
            shown
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        isLoading={isLoading}
        isError={isError}
        rowKey={(customer) => customer.id}
        emptyMessage={
          customerType === 'individual'
            ? 'Koi individual customer nahi mila.'
            : customerType === 'business'
              ? 'Koi business customer nahi mila.'
              : isSearching
                ? 'Koi customer nahi mila.'
                : 'Abhi koi customer nahi hai.'
        }
      />

      {!isSearching &&
  customerType === 'all' &&
  meta &&
  meta.totalPages > 1 && (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasPrev}
          onClick={() =>
            setPage((currentPage) =>
              Math.max(1, currentPage - 1),
            )
          }
        >
          Previous
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNext}
          onClick={() =>
            setPage((currentPage) => currentPage + 1)
          }
        >
          Next
        </Button>
      </div>
    </div>
  )}
    </div>
  );
}