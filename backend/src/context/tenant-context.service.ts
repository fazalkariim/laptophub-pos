import { Injectable, Scope } from '@nestjs/common';

// Scope.REQUEST ka matlab: har HTTP request ke liye iska NAYA instance banega.
// Isliye ek request ka tenantId doosri request ke saath mix nahi hoga.
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private tenantId: string | null = null;
  private branchId: string | null = null;

  // Middleware ye method call karke tenant set karega
  set(tenantId: string, branchId: string | null) {
    this.tenantId = tenantId;
    this.branchId = branchId;
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  getBranchId(): string | null {
    return this.branchId;
  }
}