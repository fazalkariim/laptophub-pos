import { IsString, IsOptional, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStockDto {
  @ApiProperty({ example: 'branch-main', description: 'Kis branch mein stock add karna hai' })
  @IsString()
  branchId: string;

  @ApiProperty({ example: 'product-id-yahan', description: 'Catalog ka product' })
  @IsString()
  productId: string;

  @ApiProperty({
    example: 'SN123456789',
    required: false,
    description: 'Laptop ke liye serial; accessory ke liye khaali chhodein',
  })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({
    example: 1,
    description: 'Laptop = 1; accessory = jitni quantity (jaise 50)',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 85000, required: false, description: 'Cost price (optional)' })
  @IsOptional()
  costPrice?: number;
}