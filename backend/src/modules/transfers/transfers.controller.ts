import { Body, Controller, Get,Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferActionDto } from './dto/transfer-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Stock transfer bhejein (IN_TRANSIT)' })
  create(@Body() dto: CreateTransferDto, @CurrentUser() user: any) {
    return this.transfersService.createTransfer(dto, user);
  }

  @Post('receive')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Transfer receive karein (dest branch)' })
  receive(@Body() dto: TransferActionDto, @CurrentUser() user: any) {
    return this.transfersService.receiveTransfer(dto, user);
  }

  @Post('reject')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Transfer reject karein (dest branch)' })
  reject(@Body() dto: TransferActionDto, @CurrentUser() user: any) {
    return this.transfersService.rejectTransfer(dto, user);
  }

  @Post('cancel')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Transfer cancel karein (source branch)' })
  cancel(@Body() dto: TransferActionDto, @CurrentUser() user: any) {
    return this.transfersService.cancelTransfer(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Saare transfers' })
  findAll() {
    return this.transfersService.findAll();
  }

  @Get('consolidated-stock')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Cross-branch stock view (sirf Super Admin)' })
  consolidated() {
    return this.transfersService.consolidatedStock();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Transfer detail' })
  findOne(@Param('id') id: string) {
    return this.transfersService.findOne(id);
  }
}