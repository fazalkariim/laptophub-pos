import { Body, Controller, Get, Post, Param,Query, UseGuards,Patch ,UploadedFile, UseInterceptors  } from '@nestjs/common';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkImportV2Service } from './bulk-import-v2.service';
import { EditBatchRowDto } from './dto/edit-batch-row.dto';
import { Delete } from '@nestjs/common';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly bulkImportV2Service: BulkImportV2Service,
  ) {}

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
  @ApiOperation({
    summary: 'Stock adjust karein (damage, count theek karna)',
  })
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
        },
      },
    },
  })
  @ApiOperation({ summary: 'Bulk import — self-describing CSV/Excel' })
  async bulkImport(
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    return this.bulkImportV2Service.bulkImport(
      file.buffer,
      file.originalname,
      user,
    );
  }

  @Get('import-batches')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Upload history (list)' })
  listImportBatches() {
    return this.bulkImportV2Service.listBatches();
  }

  @Get('import-batches/:id')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Ek upload ka poora detail' })
  getImportBatch(@Param('id') id: string) {
    return this.bulkImportV2Service.getBatch(id);
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

  @Patch('import-batches/:id/rows/:rowNo')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Failed row edit karke retry karein' })
  editRow(
    @Param('id') id: string,
    @Param('rowNo') rowNo: string,
    @Body() dto: EditBatchRowDto,
    @CurrentUser() user: any,
  ) {
    return this.bulkImportV2Service.editAndRetryRow(id, parseInt(rowNo, 10), dto, user);
  }

  @Post('import-batches/:id/transfer')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Batch ke stock items transfer karein (visible columns ke saath)' })
  transferFromBatch(
    @Param('id') id: string,
    @Body() dto: { stockItemIds: string[]; destBranchId: string; visibleColumns?: string[]; note?: string },
    @CurrentUser() user: any,
  ) {
    return this.bulkImportV2Service.transferFromBatch(id, dto, user);
  }

  @Delete('import-batches/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Upload history delete karein (StockItem affect nahi hota)' })
  deleteBatch(@Param('id') id: string) {
    return this.bulkImportV2Service.deleteBatch(id);
  }
}