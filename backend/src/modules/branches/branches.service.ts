import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { PlanLimitService } from '../../common/services/plan-limit.service';
import { TenantContextService } from '../../context/tenant-context.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateBranchDto } from './dto/update-branch.dto';

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
      where: { isActive: true } as any,
      orderBy: { createdAt: 'desc' },
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

  // Branch update — sirf name/address, isActive ko touch nahi karta
  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.tenantPrisma.client.branch.findFirst({
      where: { id },
    });
    if (!branch) {
      throw new NotFoundException('Branch nahi mili');
    }

    const updated = await this.tenantPrisma.client.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
      } as any,
    });

    return updated;
  }

  // Soft delete — active staff ya stock ho to block
  async remove(id: string) {
    const branch = await this.tenantPrisma.client.branch.findFirst({
      where: { id },
    });
    if (!branch) {
      throw new NotFoundException('Branch nahi mili');
    }

    // 1. Active staff check
    const activeStaff = await this.tenantPrisma.client.user.count({
      where: { branchId: id, isActive: true },
    });
    if (activeStaff > 0) {
      throw new BadRequestException(
        'Is branch mein active staff hai — pehle unhe doosri branch mein move ya deactivate karein',
      );
    }

    // 2. In-stock inventory check
    const inStockItems = await this.tenantPrisma.client.stockItem.count({
      where: { branchId: id, status: 'IN_STOCK', quantity: { gt: 0 } },
    });
    if (inStockItems > 0) {
      throw new BadRequestException(
        'Is branch mein stock maujood hai — pehle transfer karein ya clear karein',
      );
    }

    // 3. Soft delete
    await this.tenantPrisma.client.branch.update({
      where: { id },
      data: { isActive: false } as any,
    });

    return { message: 'Branch delete kar di gayi' };
  }
}