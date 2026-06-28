import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaySupplierDto {
  @ApiProperty({ example: 'po-id-yahan', description: 'Kis PO pe payment' })
  @IsString()
  poId: string;

  @ApiProperty({ example: 'bank transfer', description: 'cash, bank transfer, cheque' })
  @IsString()
  method: string;

  @ApiProperty({ example: 400000, description: 'Kitna pay kar rahe' })
  @IsNumber()
  @Min(1, { message: 'Amount 0 se zyada ho' })
  amount: number;
}