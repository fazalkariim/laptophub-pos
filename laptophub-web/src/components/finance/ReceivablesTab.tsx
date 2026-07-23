'use client';

import { useMemo, useState } from 'react';
import {
  CreditCard,
  Search,
  X,
} from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import {
  useAllBranchesReceivables,
  useBranchReceivables,
} from '@/hooks/useReceivables';
import {
  DataTable,
  type Column,
} from '@/components/shared/DataTable';
import { PayRemainingDialog } from '@/components/finance/PayRemainingDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import type { ReceivableSale } from '@/types';

const ALL_BRANCHES = 'ALL';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    'en-PK',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

function getRemaining(
  sale: ReceivableSale,
) {
  return Math.max(
    0,
    Number(sale.total ?? 0) -
      Number(sale.amountPaid ?? 0),
  );
}

export function ReceivablesTab() {
  const {
    data: branches,
    isLoading: branchesLoading,
    isError: branchesError,
  } = useBranches();

  const [selectedBranch, setSelectedBranch] =
    useState(ALL_BRANCHES);

  const [search, setSearch] =
    useState('');

  const [selectedSale, setSelectedSale] =
    useState<ReceivableSale | null>(null);

  const showingAllBranches =
    selectedBranch === ALL_BRANCHES;

  const allReceivables =
    useAllBranchesReceivables(
      branches,
      showingAllBranches,
    );

  const branchReceivables =
    useBranchReceivables(
      showingAllBranches
        ? null
        : selectedBranch,
      !showingAllBranches,
    );

  const rows = showingAllBranches
    ? allReceivables.data
    : (
        branchReceivables.data ?? []
      ).map((sale) => ({
        ...sale,

        branchName:
          branches?.find(
            (branch) =>
              branch.id ===
              selectedBranch,
          )?.name ??
          sale.branchName ??
          '—',
      }));

  const normalizedSearch =
    search.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((sale) => {
      const invoice =
        sale.invoiceNumber
          .toLowerCase();

      const customerName =
        sale.customer?.name
          ?.toLowerCase() ?? '';

      const customerContact =
        sale.customer?.contact
          ?.toLowerCase() ?? '';

      const branchName =
        sale.branchName
          ?.toLowerCase() ?? '';

      return (
        invoice.includes(
          normalizedSearch,
        ) ||
        customerName.includes(
          normalizedSearch,
        ) ||
        customerContact.includes(
          normalizedSearch,
        ) ||
        branchName.includes(
          normalizedSearch,
        )
      );
    });
  }, [rows, normalizedSearch]);

  const isLoading = showingAllBranches
    ? branchesLoading ||
      allReceivables.isLoading
    : branchReceivables.isLoading;

  const isError = showingAllBranches
    ? branchesError ||
      allReceivables.isError
    : branchReceivables.isError;

  const totalReceivable =
    filteredRows.reduce(
      (sum, sale) =>
        sum + getRemaining(sale),
      0,
    );

  const columns: Column<ReceivableSale>[] = [
    {
      header: 'Invoice',
      cell: (sale) => (
        <span className="font-medium">
          {sale.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Date',
      cell: (sale) =>
        formatDate(sale.createdAt),
    },
    {
      header: 'Branch',
      cell: (sale) =>
        sale.branchName ?? '—',
    },
    {
      header: 'Customer',
      cell: (sale) => (
        <div>
          <p className="font-medium">
            {sale.customer?.name ??
              'Unknown Customer'}
          </p>

          <p className="text-xs text-muted-foreground">
            {sale.customer?.contact ??
              'No contact'}
          </p>
        </div>
      ),
    },
    {
      header: 'Total',
      cell: (sale) =>
        formatMoney(
          Number(sale.total ?? 0),
        ),
    },
    {
      header: 'Collected',
      cell: (sale) =>
        formatMoney(
          Number(
            sale.amountPaid ?? 0,
          ),
        ),
    },
    {
      header: 'Remaining',
      cell: (sale) => (
        <span className="font-semibold text-amber-600">
          {formatMoney(
            getRemaining(sale),
          )}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (sale) => (
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
          {sale.paymentStatus}
        </span>
      ),
    },
    {
      header: '',
      cell: (sale) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() =>
              setSelectedSale(sale)
            }
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Remaining
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Receivable Sales
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {filteredRows.length}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Total Receivable
          </p>

          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {formatMoney(totalReceivable)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search invoice, customer or contact…"
            className="pl-9 pr-10"
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch('')
              }
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={selectedBranch}
          onChange={(event) => {
            setSelectedBranch(
              event.target.value,
            );
            setSearch('');
          }}
          className="h-10 min-w-[190px] rounded-md border bg-background px-3 text-sm"
        >
          <option value={ALL_BRANCHES}>
            All Branches
          </option>

          {branches?.map((branch) => (
            <option
              key={branch.id}
              value={branch.id}
            >
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {showingAllBranches &&
        allReceivables.partialError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {
              allReceivables.failedBranchCount
            }{' '}
            {allReceivables
              .failedBranchCount === 1
              ? 'branch'
              : 'branches'}{' '}
            ki receivables load nahi ho
            sakin. Baaki branches ka data
            dikhaya ja raha hai.
          </div>
        )}

      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={isLoading}
        isError={isError}
        rowKey={(sale) => sale.id}
        emptyMessage={
          normalizedSearch
            ? 'Koi matching receivable nahi mili.'
            : 'Kisi customer ki payment remaining nahi hai.'
        }
      />

      <PayRemainingDialog
        sale={selectedSale}
        open={Boolean(selectedSale)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSale(null);
          }
        }}
      />
    </div>
  );
}