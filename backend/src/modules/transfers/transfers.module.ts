import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [TransfersController],
  providers: [TransfersService, TenantPrismaService],
})
export class TransfersModule {}