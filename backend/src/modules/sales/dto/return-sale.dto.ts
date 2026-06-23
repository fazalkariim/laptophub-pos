import { IsString, IsArray, ArrayMinSize, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnSaleDto {
  @ApiProperty({ example: 'sale-id-yahan', description: 'Kaunsi sale return ho rahi hai' })
  @IsString()
  saleId: string;

  @ApiProperty({
    example: ['stock-item-id-1'],
    description: 'Kaunse items wapas aaye (stock item ids). Saare ya kuch.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek item return karein' })
  @IsString({ each: true })
  stockItemIds: string[];

  @ApiProperty({ example: 'Customer ko pasand nahi aaya', description: 'Return ka reason' })
  @IsString()
  @MinLength(3, { message: 'Return reason zaroori hai' })
  reason: string;
}