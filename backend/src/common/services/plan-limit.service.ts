import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPlanLimits } from '../config/plans';

@Injectable()
export class PlanLimitService {
  constructor(private readonly prisma: PrismaService) {}

  // Branch banane se pehle check — limit tak to nahi pahunche?
  async checkBranchLimit(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) return; // safety

    const limits = getPlanLimits(tenant.plan);
    if (limits.maxBranches === -1) return; // unlimited — koi check nahi

    const currentCount = await this.prisma.branch.count({ where: { tenantId } });
    if (currentCount >= limits.maxBranches) {
      throw new ForbiddenException(
        `Aapke "${tenant.plan}" plan mein sirf ${limits.maxBranches} branch ki ijazat hai. ` +
        `Zyada ke liye plan upgrade karein.`,
      );
    }
  }

  // User banane se pehle check
  async checkUserLimit(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) return;

    const limits = getPlanLimits(tenant.plan);
    if (limits.maxUsers === -1) return; // unlimited

    const currentCount = await this.prisma.user.count({ where: { tenantId } });
    if (currentCount >= limits.maxUsers) {
      throw new ForbiddenException(
        `Aapke "${tenant.plan}" plan mein sirf ${limits.maxUsers} users ki ijazat hai. ` +
        `Zyada ke liye plan upgrade karein.`,
      );
    }
  }
}