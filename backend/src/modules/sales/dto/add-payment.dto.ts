import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPaymentDto {
  @ApiProperty({ example: 'sale-id-yahan', description: 'Kis sale pe payment add karni hai' })
  @IsString()
  saleId: string;

  @ApiProperty({ example: 'cash', description: 'cash, card, ya transfer' })
  @IsString()
  method: string;

  @ApiProperty({ example: 40000, description: 'Kitna paisa aaya' })
  @IsNumber()
  @Min(1, { message: 'Amount 0 se zyada ho' })
  amount: number;
}