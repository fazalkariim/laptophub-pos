import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { BulkIntakeService } from './bulk-intake.service';
import { BulkImportService } from './bulk-import.service';
import { BulkImportV2Service } from './bulk-import-v2.service';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    BulkIntakeService,
    BulkImportService,
    BulkImportV2Service,
    TenantPrismaService,
  ],
})
export class InventoryModule {}