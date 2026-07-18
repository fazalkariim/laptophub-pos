import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [TransfersController],
  providers: [TransfersService, TenantPrismaService],
  exports: [TransfersService],  // ← ye line honi chahiye
})
export class TransfersModule {}