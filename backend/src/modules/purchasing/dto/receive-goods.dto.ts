import {
  IsString, IsArray, ArrayMinSize, ValidateNested, IsOptional, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Ek PO line ke against kya receive hua
export class ReceiveLineInput {
  @ApiProperty({ example: 'po-line-id-yahan', description: 'Kaunsi PO line ka maal' })
  @IsString()
  poLineId: string;

  @ApiProperty({
    example: ['SN-A1', 'SN-A2'],
    required: false,
    description: 'Serial wale items ke serials (laptops)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serials?: string[];

  @ApiProperty({
    example: 0,
    required: false,
    description: 'Accessories ke liye quantity (serial nahi to ye)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ example: 'po-id-yahan' })
  @IsString()
  poId: string;

  @ApiProperty({ type: [ReceiveLineInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineInput)
  lines: ReceiveLineInput[];
}