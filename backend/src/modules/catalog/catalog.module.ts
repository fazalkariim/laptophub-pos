import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, TenantPrismaService],
})
export class CatalogModule {}