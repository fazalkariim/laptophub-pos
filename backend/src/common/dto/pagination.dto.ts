import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({ example: 1, required: false, description: 'Kaunsa page (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, description: 'Per page kitne (default 20, max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)  // ek page mein max 100 (koi 10000 na maang le)
  limit?: number = 20;
}