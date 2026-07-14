import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetWithTokenDto {
  @ApiProperty({ example: 'abc123token...' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6, { message: 'Password kam se kam 6 characters ka ho' })  // change-password jaisा hi
  newPassword: string;
}