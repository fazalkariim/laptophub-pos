import { Injectable, UnauthorizedException,NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Email ya password galat hai');
    }
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ya password galat hai');
    }

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      email: user.email,
    };

    // Dono tokens banao + refresh hash save karo
    const tokens = await this.generateTokens(payload);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,  // ← naya
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
      },
    };
  }

  // Refresh — purane refresh token se naye tokens
  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    // Bheja gaya refresh token DB ke hash se match karta hai?
    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!valid) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    // Naye tokens banao (rotation — naya refresh bhi)
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      email: user.email,
    };
    const tokens = await this.generateTokens(payload);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // Logout — refresh token hash hatao (revoke)
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { message: 'Logout ho gaya' };
  }
  
  // User khud apna password badle (purana password verify karke)
  async changePassword(userId: string, dto: ChangePasswordDto) {
    // User laao (raw — kyunke login jaisा, tenant scoping ki zaroorat nahi yahan,
    // userId JWT se aaya hai jo already tenant-scoped hai)
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User nahi mila');
    }

    // Purana password sahi hai?
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Purana password galat hai');
    }

    // Naya password hash karke save karo
    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password badal diya gaya' };
  }

  // Super Admin kisi user ka password reset kare (purana password nahi chahiye)
  async resetPassword(dto: ResetPasswordDto, adminTenantId: string) {
    // User laao — confirm karo wo isi tenant ka hai (security)
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId: adminTenantId },
    });
    if (!user) {
      throw new NotFoundException('User nahi mila');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { message: `${user.email} ka password reset kar diya gaya` };
  }

 // Access + refresh dono tokens banao
  private async generateTokens(payload: any) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConstants.secret,
      expiresIn: jwtConstants.expiresIn as any,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: payload.sub },
      {
        secret: jwtConstants.refreshSecret,
        expiresIn: jwtConstants.refreshExpiresIn as any,
      },
    );
    return { accessToken, refreshToken };
  }

  // Refresh token ka hash DB mein save karo
  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }
}