import type { Role } from './auth';

export const canViewFinance = (role: Role) => role !== 'SALESMAN';
export const canAdjustStock = (role: Role) =>
  role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER';
export const canManageUsers = (role: Role) => role === 'SUPER_ADMIN';
export const canDoPurchasing = (role: Role) =>
  role === 'SUPER_ADMIN' || role === 'ACCOUNTANT';
export const isHeadOffice = (role: Role) =>
  role === 'SUPER_ADMIN' || role === 'ACCOUNTANT';