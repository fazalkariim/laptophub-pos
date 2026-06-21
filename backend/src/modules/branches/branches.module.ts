import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService, TenantPrismaService],
})
export class BranchesModule {}