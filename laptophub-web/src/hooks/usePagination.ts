import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[] | undefined, pageSize = 20) {
  const [page, setPage] = useState(1);

  const safeItems = items ?? [];
  const totalPages = Math.max(1, Math.ceil(safeItems.length / pageSize));

  // Agar data badal jaaye aur current page ab valid na ho, to page 1 pe wapas
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => safeItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [safeItems, currentPage, pageSize]
  );

  return {
    pageItems,
    page: currentPage,
    setPage,
    totalPages,
    total: safeItems.length,
  };
}