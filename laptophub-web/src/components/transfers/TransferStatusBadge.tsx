export function TransferStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    IN_TRANSIT: 'bg-blue-100 text-blue-700',
    RECEIVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? 'bg-blue-100 text-blue-700'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}