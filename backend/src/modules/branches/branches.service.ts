import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { PlanLimitService } from '../../common/services/plan-limit.service';
import { TenantContextService } from '../../context/tenant-context.service';

@Injectable()
export class BranchesService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly planLimit: PlanLimitService,
  ) 
  {}

  // Saari branches — automatically sirf current tenant ki aayengi
  findAll() {
    return this.tenantPrisma.client.branch.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Nayi branch banao — tenantId khud lag jayega
  async create(dto: CreateBranchDto) {
    const tenantId = this.tenantContext.getTenantId();
    await this.planLimit.checkBranchLimit(tenantId!);
    return this.tenantPrisma.client.branch.create({
      data: {
        name: dto.name,
        address: dto.address,
      } as any,
    });
  }
}