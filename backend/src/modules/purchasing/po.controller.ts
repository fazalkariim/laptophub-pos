import { Body, Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PoService } from './po.service';
import { CreatePoDto } from './dto/create-po.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PaySupplierDto } from './dto/pay-supplier.dto';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PoController {
  constructor(private readonly poService: PoService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Naya PO banayein (DRAFT)' })
  create(@Body() dto: CreatePoDto, @CurrentUser() user: any) {
    return this.poService.create(dto, user);
  }

  @Post(':id/send')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'PO ko SENT karein' })
  send(@Param('id') id: string) {
    return this.poService.send(id);
  }

  @Post('receive')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Goods receipt — PO ka maal receive karein' })
  receiveGoods(@Body() dto: ReceiveGoodsDto, @CurrentUser() user: any) {
    return this.poService.receiveGoods(dto, user);
  }

  @Post('pay-supplier')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Supplier ko payment (sirf Super Admin)' })
  paySupplier(@Body() dto: PaySupplierDto, @CurrentUser() user: any) {
    return this.poService.paySupplier(dto, user);
  }

  @Get('supplier/:supplierId/payables')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Supplier payables — kitna dena hai (sirf Super Admin)' })
  supplierPayables(@Param('supplierId') supplierId: string) {
    return this.poService.supplierPayables(supplierId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Saare POs' })
  findAll() {
    return this.poService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Ek PO' })
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }
}