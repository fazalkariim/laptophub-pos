import { Body, Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReturnSaleDto } from './dto/return-sale.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { Query } from '@nestjs/common';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER', 'SALESMAN')  // sab bech sakte hain
  @ApiOperation({ summary: 'Nayi sale banayein' })
  createSale(@Body() dto: CreateSaleDto, @CurrentUser() user: any) {
    return this.salesService.createSale(dto, user);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Ek branch ki sales dekhein' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.salesService.findByBranch(branchId);
  }

  @Post('payments')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER', 'SALESMAN')  // koi bhi collect kar sakta hai
  @ApiOperation({ summary: 'Udhaar collect karein (existing sale pe payment)' })
  addPayment(@Body() dto: AddPaymentDto, @CurrentUser() user: any) {
    return this.salesService.addPayment(dto, user);
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Ek sale dekhein' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post('returns')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')  // manager approval — salesman nahi
  @ApiOperation({ summary: 'Sale return karein (manager approval zaroori)' })
  returnSale(@Body() dto: ReturnSaleDto, @CurrentUser() user: any) {
    return this.salesService.returnSale(dto, user);
  }

  @Get('customer/:customerId/warranties')
  @ApiOperation({ summary: 'Customer ki warranties (days left ke saath)' })
  customerWarranties(@Param('customerId') customerId: string) {
    return this.salesService.customerWarranties(customerId);
  }

  @Get('warranties/expiring/:branchId')
  @ApiOperation({ summary: 'Expiring warranties (follow-up ke liye)' })
  expiringWarranties(
    @Param('branchId') branchId: string,
    @Query('withinDays') withinDays?: string,
  ) {
    return this.salesService.expiringWarranties(
      branchId,
      withinDays ? parseInt(withinDays, 10) : 30,
    );
  }

  @Get('customer/:customerId/history')
  @ApiOperation({ summary: 'Customer ki purchase history + baqi paise' })
  customerHistory(@Param('customerId') customerId: string) {
    return this.salesService.customerHistory(customerId);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Sale ka receipt data (printing frontend pe)' })
  getReceipt(@Param('id') id: string) {
    return this.salesService.getReceipt(id);
  }
}