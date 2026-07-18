'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useUpdateImportRow } from '@/hooks/useImportBatches';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BulkImportRow } from '@/types';

interface FormValues {
  location: string;
  lastScan: string;
  category: string;
  brand: string;
  trackingId: string;
  specs: string;
  costByVS: string;
  finalSale: string;
  buyer: string;
  date: string;
  status: string;
  saleAt: string;
  vendor: string;
  vendorTrackingId: string;
  receivedOn: string;
  purchase: string;
}

interface EditFailedRowDialogProps {
  batchId: string;
  row: BulkImportRow | null;
  onOpenChange: (v: boolean) => void;
}

const FIELDS: { key: keyof FormValues; label: string; required?: boolean }[] = [
  { key: 'location', label: 'Location', required: true },
  { key: 'category', label: 'Category', required: true },
  { key: 'brand', label: 'Brand' },
  { key: 'trackingId', label: 'Tracking ID', required: true },
  { key: 'specs', label: 'Specs', required: true },
  { key: 'purchase', label: 'Purchase', required: true },
  { key: 'costByVS', label: 'Cost by V.S' },
  { key: 'finalSale', label: 'Final Sale' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'saleAt', label: 'Sale @' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'vendorTrackingId', label: 'Vendor Tracking ID' },
  { key: 'receivedOn', label: 'Received on' },
  { key: 'lastScan', label: 'Last Scan' },
];

export function EditFailedRowDialog({
  batchId,
  row,
  onOpenChange,
}: EditFailedRowDialogProps) {
  const updateRow = useUpdateImportRow(batchId);
  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (row) {
      reset({
        location: row.location ?? '',
        lastScan: row.lastScan ?? '',
        category: row.category ?? '',
        brand: row.brand ?? '',
        trackingId: row.trackingId ?? '',
        specs: row.specs ?? '',
        costByVS: row.costByVS != null ? String(row.costByVS) : '',
        finalSale: row.finalSale != null ? String(row.finalSale) : '',
        buyer: row.buyer ?? '',
        date: row.date ?? '',
        status: row.status ?? '',
        saleAt: row.saleAt ?? '',
        vendor: row.vendor ?? '',
        vendorTrackingId: row.vendorTrackingId ?? '',
        receivedOn: row.receivedOn ?? '',
        purchase: row.purchase != null ? String(row.purchase) : '',
      });
    }
  }, [row, reset]);

  function onSubmit(values: FormValues) {
    if (!row) return;
    updateRow.mutate(
      {
        rowNo: row.no,
        location: values.location,
        lastScan: values.lastScan || null,
        category: values.category,
        brand: values.brand || null,
        trackingId: values.trackingId,
        specs: values.specs,
        costByVS: values.costByVS ? Number(values.costByVS) : null,
        finalSale: values.finalSale ? Number(values.finalSale) : null,
        buyer: values.buyer || null,
        date: values.date || null,
        status: values.status || null,
        saleAt: values.saleAt || null,
        vendor: values.vendor || null,
        vendorTrackingId: values.vendorTrackingId || null,
        receivedOn: values.receivedOn || null,
        purchase: Number(values.purchase),
      },
      {
        onSuccess: () => {
          toast.success('Row fix ho gayi — ab successful hai');
          onOpenChange(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Retry fail hui'),
      }
    );
  }

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Row #{row?.no} Edit Karein</DialogTitle>
        </DialogHeader>

        {row?.reason && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
            Pichli wajah: {row.reason}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={f.key}>
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </Label>
                <Input id={f.key} {...register(f.key)} />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={updateRow.isPending}>
              {updateRow.isPending ? 'Retry ho raha…' : 'Save & Retry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}