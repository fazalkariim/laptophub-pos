import { IsString, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkScanDto {
  @ApiProperty({ example: 'branch-main' })
  @IsString()
  branchId: string;

  @ApiProperty({ example: 'product-id-yahan' })
  @IsString()
  productId: string;

  @ApiProperty({
    example: ['SN001', 'SN002', 'SN003'],
    description: 'Scan kiye gaye serial numbers ka array',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek serial zaroori hai' })
  @IsString({ each: true })
  serials: string[];
}