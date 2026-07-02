import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'Ali Electronics', description: 'Business ka naam (tenant)' })
  @IsString()
  @MinLength(2, { message: 'Business naam kam se kam 2 characters ka ho' })
  businessName: string;

  @ApiProperty({ example: 'ali@alielectronics.com', description: 'Admin ka email' })
  @IsEmail({}, { message: 'Sahi email daalein' })
  email: string;

  @ApiProperty({ example: 'securepass123', description: 'Admin ka password' })
  @IsString()
  @MinLength(6, { message: 'Password kam se kam 6 characters ka ho' })
  password: string;

  @ApiProperty({ example: 'Ali Khan', required: false, description: 'Admin ka naam' })
  @IsString()
  @MinLength(2)
  ownerName: string;
}