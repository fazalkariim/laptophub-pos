'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useBranches } from '@/hooks/useBranches';
import {
  useAllBranchesStock,
  useStock,
  type StockItemWithBranch,
} from '@/hooks/useStock';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/inventory/StatusBadge';
import { AdjustDialog } from '@/components/inventory/AdjustDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import type { StockItem } from '@/types';

const ALL_BRANCHES = 'ALL';

export default function InventoryPage() {
  const user = useAuth((state) => state.user);

  const {
    data: branches,
    isLoading: branchesLoading,
    isError: branchesError,
  } = useBranches();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canSeeCost = user?.role !== 'SALESMAN';

  /*
   * Super Admin ke liye default ALL hai.
   * Branch Manager ke liye ye state use nahi hogi.
   */
  const [selectedBranch, setSelectedBranch] =
    useState<string>(ALL_BRANCHES);

  const [search, setSearch] = useState('');
  const [adjustItem, setAdjustItem] =
    useState<StockItemWithBranch | null>(null);

  const showingAllBranches =
    isSuperAdmin && selectedBranch === ALL_BRANCHES;

  /*
   * Specific branch query:
   * - Super Admin jab koi single branch select kare
   * - Branch Manager ke liye uski assigned branch
   */
  const singleBranchId = isSuperAdmin
    ? selectedBranch === ALL_BRANCHES
      ? null
      : selectedBranch
    : user?.branchId ?? null;

  const {
    data: singleBranchStock,
    isLoading: singleBranchLoading,
    isError: singleBranchError,
  } = useStock(singleBranchId);

  /*
   * Sirf Super Admin + All Branches scope mein parallel queries chalengi.
   */
  const {
    data: allBranchesStock,
    isLoading: allBranchesLoading,
    isError: allBranchesError,
    partialError,
    failedBranchCount,
  } = useAllBranchesStock(
    branches,
    Boolean(isSuperAdmin && showingAllBranches),
  );

  /*
   * Single branch ke stock mein branch name attach karo.
   * Isse same display type all/single dono views mein use ho sakega.
   */
  const singleBranchRows = useMemo<StockItemWithBranch[]>(() => {
    if (!singleBranchStock || !singleBranchId) return [];

    const branchName =
      branches?.find((branch) => branch.id === singleBranchId)?.name ??
      singleBranchId;

    return singleBranchStock.map((item) => ({
      ...item,
      inventoryBranchId: item.branchId ?? singleBranchId,
      inventoryBranchName: branchName,
    }));
  }, [singleBranchStock, singleBranchId, branches]);

  const inventoryData = showingAllBranches
    ? allBranchesStock
    : singleBranchRows;

  /*
   * Search currently loaded scope par hoti hai.
   * Isse har key press par backend request nahi jaayegi.
   */
  const normalizedSearch = search.trim().toLowerCase();

  const filteredInventory = useMemo(() => {
    if (!normalizedSearch) return inventoryData;

    return inventoryData.filter((item) => {
      const model = item.product?.model?.toLowerCase() ?? '';
      const serial = item.serialNumber?.toLowerCase() ?? '';

      return (
        model.includes(normalizedSearch) ||
        serial.includes(normalizedSearch)
      );
    });
  }, [inventoryData, normalizedSearch]);

  const isLoading = showingAllBranches
    ? branchesLoading || allBranchesLoading
    : singleBranchLoading;

  const isError = showingAllBranches
    ? branchesError || allBranchesError
    : singleBranchError;

  /*
   * Columns component ke andar hain kyunki Adjust button ko local state
   * update karni hai aur Branch column sirf Super Admin ko dikhana hai.
   */
  const columns: Column<StockItemWithBranch>[] = [];

  if (isSuperAdmin) {
    columns.push({
      header: 'Branch',
      cell: (item) => item.inventoryBranchName,
    });
  }

  columns.push(
    {
      header: 'SKU',
      cell: (item) => item.product?.sku ?? '—',
    },
    {
      header: 'Model',
      cell: (item) => item.product?.model ?? '—',
    },
    {
      header: 'Brand',
      cell: (item) => item.product?.brand ?? '—',
    },
    {
      header: 'Serial',
      cell: (item) => item.serialNumber ?? '—',
    },
    {
      header: 'Qty',
      cell: (item) => String(item.quantity),
    },
    {
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status} />,
    },
  );

  if (canSeeCost) {
    columns.push({
      header: 'Cost',
      cell: (item) =>
        item.costPrice !== null && item.costPrice !== undefined
          ? formatMoney(Number(item.costPrice))
          : '—',
    });
  }

  columns.push({
    header: '',
    cell: (item) => (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdjustItem(item)}
        >
          Adjust
        </Button>
      </div>
    ),
  });

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={
          showingAllBranches
            ? 'Saari branches ka stock dekhein.'
            : 'Selected branch ka stock dekhein.'
        }
        action={
          isSuperAdmin ? (
            <select
              value={selectedBranch}
              onChange={(event) => {
                setSelectedBranch(event.target.value);
                setSearch('');
              }}
              className="min-w-[180px] rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value={ALL_BRANCHES}>All Branches</option>

              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      {/* Search bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by model or serial number…"
            className="pl-9 pr-10"
          />

          {search.length > 0 && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear inventory search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!isLoading && !isError && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredInventory.length} of {inventoryData.length}{' '}
            items
          </p>
        )}
      </div>

      {/* Ek ya zyada branches fail hui, lekin baaki data available hai */}
      {showingAllBranches && partialError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {failedBranchCount}{' '}
          {failedBranchCount === 1 ? 'branch' : 'branches'} ka inventory
          load nahi ho saka. Baaki branches ka available stock dikhaya
          ja raha hai.
        </div>
      )}

      {/* Branch Manager ke user mein branch assigned na ho */}
      {!isSuperAdmin && !singleBranchId ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Aapke user account ke saath koi branch assigned nahi hai.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredInventory}
          isLoading={isLoading}
          isError={isError}
          rowKey={(item) => item.id}
          emptyMessage={
            normalizedSearch
              ? 'No inventory item matches your search.'
              : showingAllBranches
                ? 'Kisi branch mein abhi inventory nahi hai.'
                : 'Is branch mein koi stock nahi hai.'
          }
        />
      )}

      <AdjustDialog
        item={adjustItem as StockItem | null}
        branchId={
          adjustItem?.inventoryBranchId ??
          singleBranchId
        }
        onOpenChange={(open) => {
          if (!open) setAdjustItem(null);
        }}
      />
    </div>
  );
}