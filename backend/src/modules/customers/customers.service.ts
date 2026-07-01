import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  getPaginationParams,
  buildPaginatedResult,
} from '../../common/utils/paginate';

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class CustomersService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // List — saare customers (scoped)
  async findAll(page = 1, limit = 20) {
    const { skip, take, page: p, limit: l } = getPaginationParams(page, limit);
    const where = { deletedAt: null };

    const [customers, total] = await Promise.all([
      this.tenantPrisma.client.customer.findMany({
        where: where as any,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantPrisma.client.customer.count({ where: where as any }),
    ]);

    return buildPaginatedResult(customers, total, p, l);
  }

  // Quick lookup — naam ya contact se dhoondo (POS pe sale ke waqt)
  async search(query: string) {
    return this.tenantPrisma.client.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { contact: { contains: query, mode: 'insensitive' } },
        ],
      } as any,
      take: 10,
      orderBy: { name: 'asc' },
    });
  }

  // Ek customer
  async findOne(id: string) {
    const customer = await this.tenantPrisma.client.customer.findFirst({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException('Customer nahi mila');
    }
    return customer;
  }

  // Create — duplicate ko block nahi, flag karta hai
  async create(dto: CreateCustomerDto, user: CurrentUser) {
    // Duplicate check — agar contact diya hai to milte-julte dhoondo
    let possibleDuplicates: any[] = [];
    if (dto.contact && dto.contact.trim() !== '') {
      possibleDuplicates = await this.tenantPrisma.client.customer.findMany({
        where: { contact: dto.contact.trim() },
        select: { id: true, name: true, contact: true },
      });
    }

    // Customer banao (chahe duplicate ho — sirf flag karenge)
    const branchId =
      (user.branchId ?? user.role === 'SUPER_ADMIN') ? user.branchId : null;

    const customer = await this.tenantPrisma.client.customer.create({
      data: {
        // Super Admin ki branchId null ho sakti hai — us soorat mein pehli branch use karें
        // ya require karें. Filhaal: jo user ki branch hai wahi.
        branchId: user.branchId ?? 'branch-main',
        name: dto.name,
        contact: dto.contact ?? null,
        type: dto.type ?? 'individual',
        tags: dto.tags ?? [],
      } as any,
    });

    // Response mein customer + warning (agar duplicates mile)
    return {
      customer,
      warning:
        possibleDuplicates.length > 0
          ? {
              message:
                'Is contact par milte-julte customer pehle se maujood hain',
              existing: possibleDuplicates,
            }
          : null,
    };
  }
}
