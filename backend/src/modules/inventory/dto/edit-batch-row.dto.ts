import { IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditBatchRowDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() location?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() lastScan?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() brand?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() trackingId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specs?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() costByVS?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() finalSale?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() buyer?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() date?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() saleAt?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() vendor?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() vendorTrackingId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() receivedOn?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() purchase?: number;
}