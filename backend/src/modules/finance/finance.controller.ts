import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DateRangeDto } from './dto/date-range.dto';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

@Get('profit/:branchId')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT')  // profit/margin salesman ke liye nahi (CRITICAL)
  @ApiOperation({ summary: 'COGS + Gross Margin (profit) — date range optional' })
  profitReport(
    @Param('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financeService.profitReport(branchId, from, to);
  }

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')  // poore business ka view — sirf head office
  @ApiOperation({ summary: 'Consolidated dashboard — saari branches (sirf Super Admin)' })
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.financeService.dashboard(from, to);
  }

@Get('sales-summary/:branchId')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Sales summary + payment breakdown (date range optional)' })
  salesSummary(
    @Param('branchId') branchId: string,
    @Query() query: DateRangeDto,
  ) {
    return this.financeService.salesSummary(branchId, query.from, query.to);
  }
}