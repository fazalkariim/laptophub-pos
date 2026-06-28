import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Tech Distributors Pvt Ltd' })
  @IsString()
  @MinLength(2, { message: 'Naam kam se kam 2 characters ka ho' })
  name: string;

  @ApiProperty({ example: '042-1234567', required: false })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiProperty({ example: '30 days credit', required: false, description: 'Payment terms' })
  @IsOptional()
  @IsString()
  terms?: string;
}