import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { PlanLimitService } from '../../common/services/plan-limit.service';
import { TenantContextService } from '../../context/tenant-context.service';

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
    await this.planLimit.checkUserLimit(tenantId!);

    // 1. Email pehle se to nahi?
    const existing = await this.tenantPrisma.client.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ye email pehle se istemaal mein hai');
    }

   // Head-office roles (Super Admin, Accountant) — branch nahi hota
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
  // Soft delete — user ko deactivate karo (hard delete KABHI nahi)
  async remove(id: string, callingUser: any) {
    // 1. Target user — tenant-scoped
    const targetUser = await this.tenantPrisma.client.user.findFirst({
      where: { id },
    });
    if (!targetUser) {
      throw new NotFoundException('User nahi mila');
    }

    // 2. Self-delete rok
    if (targetUser.id === callingUser.userId) {
      throw new BadRequestException('Aap khud ko delete nahi kar sakte');
    }

    // 3. Aakhri active Super Admin rok
    if (targetUser.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await this.tenantPrisma.client.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });
      if (activeSuperAdmins <= 1) {
        throw new BadRequestException('Tenant ka aakhri Super Admin delete nahi ho sakta');
      }
    }

    // 4. Soft delete: isActive false + sessions revoke
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
