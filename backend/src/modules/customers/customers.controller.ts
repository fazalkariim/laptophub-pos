import { Body, Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

 @Get()
  @ApiOperation({ summary: 'Saare customers (paginated)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.customersService.findAll(pagination.page, pagination.limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Customer dhoondo (naam ya contact se)' })
  search(@Query('q') query: string) {
    return this.customersService.search(query ?? '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ek customer' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Naya customer (duplicate par warning)' })
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: any) {
    return this.customersService.create(dto, user);
  }
}