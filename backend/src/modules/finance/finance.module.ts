import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [ExpensesController, FinanceController],
  providers: [ExpensesService, FinanceService, TenantPrismaService],
})
export class FinanceModule {}