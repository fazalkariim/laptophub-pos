import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'BRANCH_MANAGER')  // users list sirf admin/manager
  @ApiOperation({ summary: 'Saare users dekhein' })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles('SUPER_ADMIN')  // naya user sirf Super Admin bana sakta hai
  @ApiOperation({ summary: 'Naya user banayein (sirf Super Admin)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}