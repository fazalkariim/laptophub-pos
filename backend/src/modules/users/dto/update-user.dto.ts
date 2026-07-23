import { IsOptional, IsString, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from './create-user.dto';
import { IsEnum } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'New Name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false, enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Sahi role choose karein' })
  role?: UserRole;

  @ApiProperty({ required: false, example: 'branch-two' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}