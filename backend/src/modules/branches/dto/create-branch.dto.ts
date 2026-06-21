import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'Saddar Branch' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Saddar, Rawalpindi', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}