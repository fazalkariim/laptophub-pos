import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)  // pehle login check, phir role check
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Saari branches dekhein' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Post()
  @Roles('SUPER_ADMIN')  // sirf Super Admin nayi branch bana sakta hai
  @ApiOperation({ summary: 'Nayi branch banayein (sirf Super Admin)' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }
}