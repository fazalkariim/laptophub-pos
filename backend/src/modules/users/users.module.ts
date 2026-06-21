import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, TenantPrismaService],
})
export class UsersModule {}