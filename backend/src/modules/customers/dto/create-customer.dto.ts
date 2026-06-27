import { IsString, IsOptional, MinLength, IsArray, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ali Khan' })
  @IsString()
  @MinLength(2, { message: 'Naam kam se kam 2 characters ka ho' })
  name: string;

  @ApiProperty({ example: '03001234567', required: false, description: 'Phone ya email' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiProperty({ example: 'individual', required: false, enum: ['individual', 'business'] })
  @IsOptional()
  @IsIn(['individual', 'business'], { message: 'Type individual ya business ho' })
  type?: string;

  @ApiProperty({ example: ['vip', 'regular'], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}