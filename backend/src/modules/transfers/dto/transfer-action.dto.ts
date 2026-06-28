import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Receive / reject / cancel ke liye — sirf transferId (aur optional reason)
export class TransferActionDto {
  @ApiProperty({ example: 'transfer-id-yahan' })
  @IsString()
  transferId: string;

  @ApiProperty({ example: 'Damage ho gaya tha', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}