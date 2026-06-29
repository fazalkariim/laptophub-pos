import { IsString, IsNumber, Min, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 'branch-main', description: 'Kis branch ka kharch' })
  @IsString()
  branchId: string;

  @ApiProperty({ example: 'Rent', description: 'Category: Rent, Utilities, Salary, etc' })
  @IsString()
  @MinLength(2)
  category: string;

  @ApiProperty({ example: 50000, description: 'Kitna kharch' })
  @IsNumber()
  @Min(1, { message: 'Amount 0 se zyada ho' })
  amount: number;

  @ApiProperty({ example: '2026-06-25', required: false, description: 'Kharch ki date (na do to aaj)' })
  @IsOptional()
  @IsDateString({}, { message: 'Date sahi format mein ho (YYYY-MM-DD)' })
  date?: string;
}