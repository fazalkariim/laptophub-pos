export const queryKeys = {
  users: ['users'] as const,
  branches: ['branches'] as const,
  catalog: (page: number) => ['catalog', page] as const,
  customers: (page: number) => ['customers', page] as const,
  stock: (branchId: string) => ['stock', branchId] as const,
};