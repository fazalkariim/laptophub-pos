import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // Saare users — passwordHash kabhi nahi bhejenge
  findAll() {
    return this.tenantPrisma.client.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        // passwordHash: jaan boojh kar NAHI — secret hai
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Naya user banao
  async create(dto: CreateUserDto) {
    // 1. Email pehle se to nahi? (same tenant ke andar)
    const existing = await this.tenantPrisma.client.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ye email pehle se istemaal mein hai');
    }

    // 2. Role rules: SUPER_ADMIN ka branch null hona chahiye,
    //    baaki roles ka branch zaroori hai
    if (dto.role === UserRole.SUPER_ADMIN && dto.branchId) {
      throw new BadRequestException('Super Admin ka koi branch nahi hota');
    }
    if (dto.role !== UserRole.SUPER_ADMIN && !dto.branchId) {
      throw new BadRequestException('Is role ke liye branch zaroori hai');
    }

    // 3. Password hash karo — plain text kabhi store nahi
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 4. User banao (tenantId extension se khud lagega)
    const user = await this.tenantPrisma.client.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        branchId: dto.branchId ?? null,
      } as any,
    });

    // 5. Response se passwordHash hata kar bhejo
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}