import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // List — saare suppliers (scoped)
 findAll() {
    return this.tenantPrisma.client.supplier.findMany({
      where: { deletedAt: null } as any,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.tenantPrisma.client.supplier.findFirst({
      where: { id, deletedAt: null } as any,
    });
    if (!supplier) {
      throw new NotFoundException('Supplier nahi mila');
    }
    return supplier;
  }

  // Create — duplicate naam check (same naam pe rok, kyunke supplier business entity hai)
  async create(dto: CreateSupplierDto) {
    const existing = await this.tenantPrisma.client.supplier.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Is naam ka supplier pehle se maujood hai');
    }

    return this.tenantPrisma.client.supplier.create({
      data: {
        name: dto.name,
        contact: dto.contact ?? null,
        terms: dto.terms ?? null,
      } as any,
    });
  }

  // Update
  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id); // maujood hai confirm

    // Agar naam badal raha hai, to naya naam kisi aur ka to nahi?
    if (dto.name) {
      const clash = await this.tenantPrisma.client.supplier.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (clash) {
        throw new ConflictException('Ye naam kisi aur supplier ka hai');
      }
    }

    return this.tenantPrisma.client.supplier.update({
      where: { id },
      data: dto as any,
    });
  }

  // Delete
  async remove(id: string) {
    await this.findOne(id);
    await this.tenantPrisma.client.supplier.update({
      where: { id },
      data: { deletedAt: new Date() } as any,
    });
    return { message: 'Supplier hata diya gaya (soft delete)' };
  }
}