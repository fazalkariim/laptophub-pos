'use client';

import { useMemo, useState } from 'react';
import { Eye, Search, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import {
  useAllBranchesBills,
  useBranchBills,
} from '@/hooks/useBills';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  DataTable,
  type Column,
} from '@/components/shared/DataTable';
import { BillDialog } from '@/components/bills/BillDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import type { BillSale } from '@/types';

const ALL_BRANCHES = 'ALL';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getAmountPaid(bill: BillSale) {
  return Number(
    bill.amountPaid ??
      bill.paidTotal ??
      bill.payments?.reduce(
        (sum, payment) =>
          sum + Number(payment.amount ?? 0),
        0,
      ) ??
      0,
  );
}

function getLineModel(line: NonNullable<BillSale['lines']>[number]) {
  return (
    line.product?.model ??
    line.stockItem?.product?.model ??
    ''
  );
}

function getLineSerial(line: NonNullable<BillSale['lines']>[number]) {
  return (
    line.serialNumber ??
    line.stockItem?.serialNumber ??
    ''
  );
}

export default function BillsPage() {
  const user = useAuth((state) => state.user);
  const {
    data: branches,
    isLoading: branchesLoading,
    isError: branchesError,
  } = useBranches();

  const [selectedBranch, setSelectedBranch] =
    useState(ALL_BRANCHES);

  const [search, setSearch] = useState('');
  const [selectedSaleId, setSelectedSaleId] =
    useState<string | null>(null);

  const showingAllBranches =
    selectedBranch === ALL_BRANCHES;

  const allBills = useAllBranchesBills(
    branches,
    showingAllBranches,
  );

  const branchBills = useBranchBills(
    showingAllBranches ? null : selectedBranch,
    !showingAllBranches,
  );

  const bills = showingAllBranches
    ? allBills.data
    : (branchBills.data ?? []).map((bill) => ({
        ...bill,
        branchName:
          branches?.find(
            (branch) => branch.id === selectedBranch,
          )?.name ?? bill.branchName,
      }));

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBills = useMemo(() => {
    if (!normalizedSearch) return bills;

    return bills.filter((bill) => {
      const invoice = bill.invoiceNumber
        .toLowerCase();

      const customerName =
        bill.customer?.name?.toLowerCase() ?? '';

      const customerContact =
        bill.customer?.contact?.toLowerCase() ?? '';

      const branchName =
        bill.branchName?.toLowerCase() ?? '';

      const lineMatch =
        bill.lines?.some((line) => {
          const model =
            getLineModel(line).toLowerCase();

          const serial =
            getLineSerial(line).toLowerCase();

          return (
            model.includes(normalizedSearch) ||
            serial.includes(normalizedSearch)
          );
        }) ?? false;

      return (
        invoice.includes(normalizedSearch) ||
        customerName.includes(normalizedSearch) ||
        customerContact.includes(normalizedSearch) ||
        branchName.includes(normalizedSearch) ||
        lineMatch
      );
    });
  }, [bills, normalizedSearch]);

  const isLoading = showingAllBranches
    ? branchesLoading || allBills.isLoading
    : branchBills.isLoading;

  const isError = showingAllBranches
    ? branchesError || allBills.isError
    : branchBills.isError;

  const totalAmount = filteredBills.reduce(
    (sum, bill) => sum + Number(bill.total ?? 0),
    0,
  );

  const totalCollected = filteredBills.reduce(
    (sum, bill) => sum + getAmountPaid(bill),
    0,
  );

  const columns: Column<BillSale>[] = [
    {
      header: 'Invoice',
      cell: (bill) => (
        <span className="font-medium">
          {bill.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Date',
      cell: (bill) => formatDate(bill.createdAt),
    },
    {
      header: 'Branch',
      cell: (bill) => bill.branchName ?? '—',
    },
    {
      header: 'Customer',
      cell: (bill) =>
        bill.customer?.name ?? 'Cash & Carry',
    },
    {
      header: 'Items',
      cell: (bill) =>
        String(
          bill.lines?.reduce(
            (sum, line) =>
              sum + Number(line.quantity ?? 0),
            0,
          ) ?? 0,
        ),
    },
    {
      header: 'Total',
      cell: (bill) =>
        formatMoney(Number(bill.total ?? 0)),
    },
    {
      header: 'Collected',
      cell: (bill) =>
        formatMoney(getAmountPaid(bill)),
    },
    {
      header: 'Payment',
      cell: (bill) => (
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
          {bill.paymentStatus}
        </span>
      ),
    },
    {
      header: '',
      cell: (bill) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelectedSaleId(bill.id)
            }
          >
            <Eye className="mr-2 h-4 w-4" />
            View Bill
          </Button>
        </div>
      ),
    },
  ];

  if (!user) return null;

  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-red-500">
        Aapko Bills section access karne ki
        permission nahi hai.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Bills"
        description="Sold items ke tamam invoices overall ya branch-wise dekhein."
        action={
          <select
            value={selectedBranch}
            onChange={(event) => {
              setSelectedBranch(event.target.value);
              setSearch('');
            }}
            className="min-w-[190px] rounded-md border bg-background px-3 py-2 text-sm"
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
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Total Bills
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {filteredBills.length}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Total Sales
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatMoney(totalAmount)}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Amount Collected
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatMoney(totalCollected)}
          </p>
        </div>
      </div>

      <div className="relative mb-4 w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search invoice, customer, model or serial…"
          className="pl-9 pr-10"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear bills search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showingAllBranches &&
        allBills.partialError && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {allBills.failedBranchCount}{' '}
            {allBills.failedBranchCount === 1
              ? 'branch'
              : 'branches'}{' '}
            ke bills load nahi ho sake. Baaki
            branches ka data dikhaya ja raha hai.
          </div>
        )}

      <DataTable
        columns={columns}
        data={filteredBills}
        isLoading={isLoading}
        isError={isError}
        rowKey={(bill) => bill.id}
        emptyMessage={
          normalizedSearch
            ? 'Koi matching bill nahi mila.'
            : 'Abhi koi sale bill nahi hai.'
        }
      />

      <BillDialog
        saleId={selectedSaleId}
        open={Boolean(selectedSaleId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSaleId(null);
          }
        }}
      />
    </div>
  );
}