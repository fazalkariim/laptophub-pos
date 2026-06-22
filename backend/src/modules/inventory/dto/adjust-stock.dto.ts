import { IsString, IsInt, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ example: 'stock-item-id-yahan', description: 'Kaunsa stock item adjust karna hai' })
  @IsString()
  stockItemId: string;

  @ApiProperty({
    example: -2,
    description: 'Quantity change: kam karne ke liye negative (-2), badhane ke liye positive (+5)',
  })
  @IsInt()
  quantityChange: number;

  @ApiProperty({
    example: 'Damaged units',
    description: 'Adjustment ka reason (zaroori — audit ke liye)',
  })
  @IsString()
  @MinLength(3, { message: 'Reason zaroori hai (kam se kam 3 characters)' })
  reason: string;

  @ApiProperty({
    example: 'DAMAGED',
    required: false,
    description: 'Naya status agar badalna ho (jaise DAMAGED ke liye)',
  })
  @IsOptional()
  @IsString()
  newStatus?: string;
}