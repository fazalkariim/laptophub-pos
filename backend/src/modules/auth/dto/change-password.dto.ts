import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// User khud apna password badle
export class ChangePasswordDto {
  @ApiProperty({ example: 'oldpassword', description: 'Purana password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newpassword123', description: 'Naya password' })
  @IsString()
  @MinLength(6, { message: 'Naya password kam se kam 6 characters ka ho' })
  newPassword: string;
}