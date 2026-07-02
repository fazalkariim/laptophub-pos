import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('salesman-performance')
  @ApiOperation({ summary: 'Salesman performance (role-scoped, date/branch filter)' })
  salesmanPerformance(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.salesmanPerformance(user, from, to, branchId);
  }

  @Get('best-selling-products')
  @ApiOperation({ summary: 'Best-selling products (role-scoped, date/branch filter)' })
  bestSellingProducts(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.bestSellingProducts(user, from, to, branchId);
  }

  @Get('stock-valuation')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT')  // cost data — salesman nahi
  @ApiOperation({ summary: 'Stock valuation — kitna paisa stock mein (cost pe)' })
  stockValuation(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.stockValuation(user, branchId);
  }
}