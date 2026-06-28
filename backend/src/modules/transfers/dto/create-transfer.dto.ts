import { IsString, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({ example: 'branch-main', description: 'Kahan se bhej rahe hain' })
  @IsString()
  sourceBranchId: string;

  @ApiProperty({ example: 'branch-two', description: 'Kahan bhej rahe hain' })
  @IsString()
  destBranchId: string;

  @ApiProperty({ example: ['stock-item-id-1', 'stock-item-id-2'], description: 'Kaunse items bhej rahe hain' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek item' })
  @IsString({ each: true })
  stockItemIds: string[];

  @ApiProperty({ example: 'Branch 2 ko stock chahiye tha', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}