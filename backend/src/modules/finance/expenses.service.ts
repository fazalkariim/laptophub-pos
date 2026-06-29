import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class ExpensesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // Create expense
  async create(dto: CreateExpenseDto, user: CurrentUser) {
    // Branch scope: Manager sirf apni branch ka kharch
    if (user.role !== 'SUPER_ADMIN' && dto.branchId !== user.branchId) {
      throw new BadRequestException('Aap sirf apni branch ka kharch add kar sakte hain');
    }

    // Branch maujood hai?
    const branch = await this.tenantPrisma.client.branch.findFirst({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException('Branch nahi mila');
    }

    return this.tenantPrisma.client.expense.create({
      data: {
        branchId: dto.branchId,
        category: dto.category,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
      } as any,
    });
  }

  // Ek branch ke expenses (optional date range)
  async findByBranch(branchId: string, from?: string, to?: string) {
    const where: any = { branchId };

    // Date range filter (agar diya ho)
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59'); // poora din
    }

    const expenses = await this.tenantPrisma.client.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Total bhi nikaalo
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      expenses,
      total,
      count: expenses.length,
    };
  }

  // Delete (galti se add ho to)
  async remove(id: string, user: CurrentUser) {
    const expense = await this.tenantPrisma.client.expense.findFirst({
      where: { id },
    });
    if (!expense) {
      throw new NotFoundException('Expense nahi mila');
    }
    if (user.role !== 'SUPER_ADMIN' && expense.branchId !== user.branchId) {
      throw new BadRequestException('Aap sirf apni branch ka expense hata sakte hain');
    }

    await this.tenantPrisma.client.expense.delete({ where: { id } });
    return { message: 'Expense hata diya gaya' };
  }
}