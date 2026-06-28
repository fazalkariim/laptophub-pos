import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { PoController } from './po.controller';
import { PoService } from './po.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [SuppliersController, PoController],
  providers: [SuppliersService, PoService, TenantPrismaService],
})
export class PurchasingModule {}