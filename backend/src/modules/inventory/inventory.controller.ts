import { Body, Controller, Get, Post, Param,Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { BulkScanDto } from './dto/bulk-scan.dto';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BadRequestException } from '@nestjs/common';


@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)  // ← BranchScopeGuard add hua
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Ek branch ka stock dekhein' })
  findByBranch(@Param('branchId') branchId: string) {
    return this.inventoryService.findByBranch(branchId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Stock add karein (manual intake)' })
  addStock(@Body() dto: CreateStockDto, @CurrentUser() user: any) {
    return this.inventoryService.addStock(dto, user);
  }
  @Post('adjustments')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Stock adjust karein (damage, count theek karna)' })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: any) {
    return this.inventoryService.adjust(dto, user);
  }
  @Post('bulk/scan')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Batch serial scan se bulk intake' })
  bulkScan(@Body() dto: BulkScanDto, @CurrentUser() user: any) {
    return this.inventoryService.bulkScan(dto, user);
  }

  @Post('bulk/import')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV ya Excel file',
        },
        branchId: {
          type: 'string',
          example: 'branch-main',
        },
        productId: {
          type: 'string',
          example: 'YAHAN-PRODUCT-ID',
        },
      },
    },
  })
  @ApiOperation({ summary: 'CSV/Excel file se bulk intake' })
  bulkImport(
    @UploadedFile() file: any,
    @Body('branchId') branchId: string,
    @Body('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('File upload karein');
    }
    return this.inventoryService.bulkImport(branchId, productId, file.buffer, user);
  }

  @Get('branch/:branchId/low-stock')
  @ApiOperation({ summary: 'Low-stock items dekhein' })
  lowStock(
    @Param('branchId') branchId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.inventoryService.lowStock(
      branchId,
      threshold ? parseInt(threshold, 10) : 5,
    );
  }
}