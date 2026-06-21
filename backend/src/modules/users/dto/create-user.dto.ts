import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Allowed roles — schema ke Role enum se match karte hain
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  SALESMAN = 'SALESMAN',
}

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@laptophub.com' })
  @IsEmail({}, { message: 'Valid email zaroori hai' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'Password kam se kam 6 characters ka ho' })
  password: string;

  @ApiProperty({ example: 'Ali Khan' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: UserRole, example: UserRole.SALESMAN })
  @IsEnum(UserRole, { message: 'Role SUPER_ADMIN, BRANCH_MANAGER ya SALESMAN hona chahiye' })
  role: UserRole;

  @ApiProperty({ example: 'branch-main', required: false, description: 'Super Admin ke liye null chhod dein' })
  @IsOptional()
  @IsString()
  branchId?: string;
}