import type { CustomerWarranty } from '@/types';

export function WarrantyCard({ w }: { w: CustomerWarranty }) {
  const statusColor = w.isExpired
    ? 'text-red-600 bg-red-50'
    : w.daysLeft <= 30
      ? 'text-amber-600 bg-amber-50'
      : 'text-green-600 bg-green-50';

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">{w.product}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor}`}>
          {w.isExpired ? 'Expired' : `${w.daysLeft} din baaki`}
        </span>
      </div>
      {w.serial && (
        <p className="text-xs text-muted-foreground">Serial: {w.serial}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {new Date(w.startDate).toLocaleDateString()} –{' '}
        {new Date(w.endDate).toLocaleDateString()}
      </p>
    </div>
  );
}