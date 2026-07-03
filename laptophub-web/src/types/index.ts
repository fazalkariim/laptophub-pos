import type { Role } from '@/lib/auth';

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  branchId: string | null;
  branch?: Branch | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  branchId: string;
}