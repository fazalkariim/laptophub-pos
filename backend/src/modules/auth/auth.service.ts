import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // 1. Email se user dhoondo.
    //    Note: yahan hum raw prisma use kar rahe hain (tenant scoping ke bina)
    //    kyunke login ke waqt abhi tenant pata nahi — user khud apna tenant laata hai.
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });

    // 2. User nahi mila ya password galat — dono case mein same error
    //    (taake hacker ko pata na chale ke email exist karti hai ya nahi)
    if (!user) {
      throw new UnauthorizedException('Email ya password galat hai');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ya password galat hai');
    }

    // 3. JWT token banao — ismein user ki pehchaan chhupi hogi
    const payload = {
      sub: user.id,        // 'sub' = subject = user id (JWT standard)
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // 4. Token + basic user info wapas bhejo (passwordHash kabhi nahi!)
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
      },
    };
  }
}