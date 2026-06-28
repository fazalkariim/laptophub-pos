import {
  IsString, IsArray, ArrayMinSize, ValidateNested,
  IsNumber, IsInt, Min, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Ek PO line — kaunsa product, kitni quantity, kis cost pe
export class POLineInput {
  @ApiProperty({ example: 'product-id-yahan' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 10, description: 'Kitne order kar rahe' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 80000, description: 'Per unit cost price' })
  @IsNumber()
  @Min(0)
  costPrice: number;
}

export class CreatePoDto {
  @ApiProperty({ example: 'supplier-id-yahan' })
  @IsString()
  supplierId: string;

  @ApiProperty({ example: 'branch-main', description: 'Kis branch ke liye maal' })
  @IsString()
  destinationBranchId: string;

  @ApiProperty({ type: [POLineInput] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek line' })
  @ValidateNested({ each: true })
  @Type(() => POLineInput)
  lines: POLineInput[];

  @ApiProperty({ example: 'Urgent order', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}