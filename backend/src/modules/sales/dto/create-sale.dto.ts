import {
  IsString, IsArray, ArrayMinSize, ValidateNested,
  IsNumber, Min, IsOptional, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Ek bikne wala item (sale line)
export class SaleLineInput {
  @ApiProperty({ example: 'stock-item-id', description: 'Kaunsa stock item bik raha hai' })
  @IsString()
  stockItemId: string;

  @ApiProperty({ example: 95000, description: 'Bechne ki price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 0, description: 'Discount (optional)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ example: 1, description: 'Quantity (accessories ke liye; laptop = 1)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

// Ek payment
export class PaymentInput {
  @ApiProperty({ example: 'cash', description: 'cash, card, ya transfer' })
  @IsString()
  method: string;

  @ApiProperty({ example: 95000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateSaleDto {
  @ApiProperty({ example: 'branch-main' })
  @IsString()
  branchId: string;

  @ApiProperty({ example: 'customer-id', required: false, description: 'Optional — abhi chhod sakte hain' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ type: [SaleLineInput] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek item zaroori hai' })
  @ValidateNested({ each: true })
  @Type(() => SaleLineInput)
  lines: SaleLineInput[];

  @ApiProperty({ type: [PaymentInput], required: false, description: 'Payments — udhaar ke liye khaali ya kam ho sakta hai' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentInput)
  payments?: PaymentInput[];
}