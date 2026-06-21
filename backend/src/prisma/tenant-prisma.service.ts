import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantContextService } from '../context/tenant-context.service';

// Ye ek request-scoped wrapper hai jo automatically current tenant ke saath
// scoped prisma client deta hai. Services isko inject karke use karengi.
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // Scoped client — har query mein tenantId khud lag jata hai
  get client() {
    return this.prisma.forTenant(() => this.tenantContext.getTenantId());
  }
}