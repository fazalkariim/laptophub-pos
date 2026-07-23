import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantContextService } from '../../context/tenant-context.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PlanLimitService } from '../../common/services/plan-limit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly planLimit: PlanLimitService,
  ) {}

  // Saare users — sirf active, passwordHash kabhi nahi bhejenge
  findAll() {
    return this.tenantPrisma.client.user.findMany({
      where: { isActive: true } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Naya user banao
  async create(dto: CreateUserDto) {
    // Plan limit check — tenantId context se
    const tenantId = this.tenantContext.getTenantId();
    await this.planLimit.checkUserLimit(tenantId);

    // 1. Email pehle se to nahi?
    const existing = await this.tenantPrisma.client.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ye email pehle se istemaal mein hai');
    }

    // 2. Role rules — head office (Super Admin, Accountant) ka branch nahi hota
    const headOfficeRoles = [UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT];
    if (headOfficeRoles.includes(dto.role) && dto.branchId) {
      throw new BadRequestException('Is role (head office) ka koi branch nahi hota');
    }
    if (!headOfficeRoles.includes(dto.role) && !dto.branchId) {
      throw new BadRequestException('Is role ke liye branch zaroori hai');
    }

    // 3. Password hash
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 4. User banao (tenantId extension se khud lagega)
    const newUser = await this.tenantPrisma.client.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        branchId: dto.branchId ?? null,
      } as any,
    });

    // 5. passwordHash hata kar bhejo
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  // Helper — kya ye tenant ka aakhri active Super Admin hai?
  private async isLastActiveSuperAdmin(
    userId: string,
    role: string,
    isActive: boolean,
  ): Promise<boolean> {
    if (role !== 'SUPER_ADMIN' || !isActive) return false;
    const activeSuperAdmins = await this.tenantPrisma.client.user.count({
      where: { role: 'SUPER_ADMIN', isActive: true, id: { not: userId } },
    });
    return activeSuperAdmins === 0;
  }

  // Partial update — name, role, branchId, isActive
  async update(id: string, dto: UpdateUserDto, callingUser: any) {
    // 1. Target user
    const targetUser = await this.tenantPrisma.client.user.findFirst({
      where: { id },
    });
    if (!targetUser) {
      throw new NotFoundException('User nahi mila');
    }

    const isDeactivating = dto.isActive === false;

    // 2. Self-deactivation rok
    if (targetUser.id === callingUser.userId && isDeactivating) {
      throw new BadRequestException('Aap khud ko deactivate nahi kar sakte');
    }

    // 3. Aakhri active Super Admin rok
    if (targetUser.role === 'SUPER_ADMIN' && isDeactivating) {
      const isLast = await this.isLastActiveSuperAdmin(targetUser.id, 'SUPER_ADMIN', true);
      if (isLast) {
        throw new BadRequestException('Tenant ka aakhri Super Admin deactivate nahi ho sakta');
      }
    }

    // 4. Ek branch — ek hi active Branch Manager
    const finalRole = dto.role ?? targetUser.role;
    const finalBranchId = dto.branchId ?? targetUser.branchId;

    if (finalRole === 'BRANCH_MANAGER' && finalBranchId) {
      const existingManager = await this.tenantPrisma.client.user.findFirst({
        where: {
          role: 'BRANCH_MANAGER',
          branchId: finalBranchId,
          isActive: true,
          id: { not: targetUser.id },
        },
      });
      if (existingManager) {
        throw new BadRequestException('Is branch ka pehle se ek Branch Manager hai');
      }
    }

    // 5. Poore tenant mein ek hi active Accountant
    if (finalRole === 'ACCOUNTANT') {
      const existingAccountant = await this.tenantPrisma.client.user.findFirst({
        where: {
          role: 'ACCOUNTANT',
          isActive: true,
          id: { not: targetUser.id },
        },
      });
      if (existingAccountant) {
        throw new BadRequestException('Ek Accountant pehle se maujood hai');
      }
    }

    // 6. Update — sirf jo bheja gaya
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (isDeactivating) {
      updateData.refreshTokenHash = null;
    }

    const updated = await this.tenantPrisma.client.user.update({
      where: { id: targetUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return updated;
  }

  // Soft delete — user ko deactivate karo (hard delete KABHI nahi)
  async remove(id: string, callingUser: any) {
    const targetUser = await this.tenantPrisma.client.user.findFirst({
      where: { id },
    });
    if (!targetUser) {
      throw new NotFoundException('User nahi mila');
    }

    if (targetUser.id === callingUser.userId) {
      throw new BadRequestException('Aap khud ko delete nahi kar sakte');
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      const isLast = await this.isLastActiveSuperAdmin(targetUser.id, 'SUPER_ADMIN', true);
      if (isLast) {
        throw new BadRequestException('Tenant ka aakhri Super Admin delete nahi ho sakta');
      }
    }

    await this.tenantPrisma.client.user.update({
      where: { id: targetUser.id },
      data: {
        isActive: false,
        refreshTokenHash: null,
      } as any,
    });

    return { message: 'User delete kar diya gaya' };
  }
}