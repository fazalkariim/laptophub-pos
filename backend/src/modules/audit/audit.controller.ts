import { Controller, Get, Param, Query, UseGuards,Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Audit logs (sirf Super Admin)' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.findAll(
      user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      userId, entityType, from, to,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Ek audit log ka poora detail (requestBody samet)' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.auditService.findOne(id, user.tenantId);
  }

  @Delete()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'History entries permanently delete karein (time-scoped)' })
  deleteOld(@CurrentUser() user: any, @Query('olderThan') olderThan: string) {
    return this.auditService.deleteOld(user.tenantId, olderThan ?? 'all');
  }
}