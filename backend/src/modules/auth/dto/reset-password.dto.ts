import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Super Admin kisi user ka password reset kare
export class ResetPasswordDto {
  @ApiProperty({ example: 'user-id-yahan', description: 'Kis user ka password reset' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'newpassword123', description: 'Naya password' })
  @IsString()
  @MinLength(6, { message: 'Naya password kam se kam 6 characters ka ho' })
  newPassword: string;
}