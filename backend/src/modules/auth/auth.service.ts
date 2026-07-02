import { Injectable, UnauthorizedException,NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { jwtConstants } from './constants';
import { SignupDto } from './dto/signup.dto';
import { ConflictException } from '@nestjs/common';

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

  // Public signup — naya business register kare (tenant + admin + branch auto)
  async signup(dto: SignupDto) {
    // Pehle check: ye email kisi bhi tenant mein pehle se to nahi?
    // (Signup ke liye email globally unique rakhna behtar hai, taake login clear rahe)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Ye email pehle se registered hai. Login karein.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // TRANSACTION: tenant + branch + admin user — sab ya to banें ya koi nahi
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Tenant banao
      const tenant = await tx.tenant.create({
        data: {
          name: dto.businessName,
          plan: 'free',      // naya tenant free plan pe (aage plans add karenge)
          status: 'active',
        },
      });

      // 2. Default branch banao
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Branch',  // default — baad mein rename kar sakta hai
        },
      });

      // 3. Admin user banao (Super Admin — branchId null, poore tenant ka malik)
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: null,        // Super Admin kisi ek branch ka nahi
          role: 'SUPER_ADMIN',
          email: dto.email,
          passwordHash,
          name: dto.ownerName,
          isActive: true,
        },
      });

      return { tenant, branch, user };
    });

    // Signup ke baad seedha login token de do (taake foran shuru kar sake)
    const payload = {
      sub: result.user.id,
      tenantId: result.tenant.id,
      branchId: result.user.branchId,
      role: result.user.role,
      email: result.user.email,
    };
    const tokens = await this.generateTokens(payload);
    await this.saveRefreshToken(result.user.id, tokens.refreshToken);

    return {
      message: 'Business register ho gaya! Aap login ho chuke hain.',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      business: {
        tenantId: result.tenant.id,
        name: result.tenant.name,
        plan: result.tenant.plan,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    };
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