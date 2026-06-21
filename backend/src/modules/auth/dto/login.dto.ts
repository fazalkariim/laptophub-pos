import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@laptophub.com' })
  @IsEmail({}, { message: 'Valid email zaroori hai' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'Password kam se kam 6 characters ka ho' })
  password: string;
}