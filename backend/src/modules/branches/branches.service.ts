import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // Saari branches — automatically sirf current tenant ki aayengi
  findAll() {
    return this.tenantPrisma.client.branch.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Nayi branch banao — tenantId khud lag jayega
  create(dto: CreateBranchDto) {
    return this.tenantPrisma.client.branch.create({
      data: {
        name: dto.name,
        address: dto.address,
      } as any,
    });
  }
}