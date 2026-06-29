import { IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DateRangeDto {
  @ApiProperty({ example: '2026-06-01', required: false, description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'from date YYYY-MM-DD format mein honi chahiye' })
  from?: string;

  @ApiProperty({ example: '2026-06-30', required: false, description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'to date YYYY-MM-DD format mein honi chahiye' })
  to?: string;
}