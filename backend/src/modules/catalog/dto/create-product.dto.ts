import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Dell' })
  @IsString()
  @MinLength(1)
  brand: string;

  @ApiProperty({ example: 'XPS 15' })
  @IsString()
  @MinLength(1)
  model: string;

  @ApiProperty({ example: '16GB RAM, 512GB SSD, Intel i7', required: false })
  @IsOptional()
  @IsString()
  specs?: string;

  @ApiProperty({ example: 'Laptop' })
  @IsString()
  @MinLength(1)
  category: string;

  @ApiProperty({ example: 'DELL-XPS-15-001' })
  @IsString()
  @MinLength(1)
  sku: string;

  @ApiProperty({ example: '8901234567890', required: false })
  @IsOptional()
  @IsString()
  barcode?: string;
}