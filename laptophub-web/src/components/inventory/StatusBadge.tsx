import type { StockStatus } from '@/types';

export function StatusBadge({ status }: { status: StockStatus }) {
  const styles: Record<string, string> = {
    IN_STOCK: 'bg-green-100 text-green-700',
    SOLD: 'bg-gray-100 text-gray-600',
  };
  const cls = styles[status] ?? 'bg-blue-100 text-blue-700';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}