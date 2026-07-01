import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Query } from '@nestjs/common';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

 @Get()
  @ApiOperation({ summary: 'Saare products (paginated)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.catalogService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ek product dekhein' })
  findOne(@Param('id') id: string) {
    return this.catalogService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Naya product banayein' })
  create(@Body() dto: CreateProductDto) {
    return this.catalogService.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')
  @ApiOperation({ summary: 'Product update karein' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalogService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Product delete karein (sirf Super Admin)' })
  remove(@Param('id') id: string) {
    return this.catalogService.remove(id);
  }
}