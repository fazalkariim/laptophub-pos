import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, TenantPrismaService],
})
export class SalesModule {}