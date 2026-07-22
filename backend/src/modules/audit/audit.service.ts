import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPaginationParams, buildPaginatedResult } from '../../common/utils/paginate';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    page = 1,
    limit = 50,
    userId?: string,
    entityType?: string,
    from?: string,
    to?: string,
  ) {
    const { skip, take, page: p, limit: l } = getPaginationParams(page, limit);

    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) where.createdAt.gte = d;
      }
      if (to) {
        const d = new Date(to + 'T23:59:59');
        if (!isNaN(d.getTime())) where.createdAt.lte = d;
      }
      if (Object.keys(where.createdAt).length === 0) delete where.createdAt;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, userName: true, userRole: true, action: true,
          entityType: true, entityId: true, method: true, path: true,
          statusCode: true, createdAt: true,
          // requestBody yahan NAHI — list halka rakhna hai
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(logs, total, p, l);
  }

  async findOne(id: string, tenantId: string) {
    const log = await this.prisma.auditLog.findFirst({
      where: { id, tenantId },
    });
    if (!log) {
      throw new NotFoundException('Audit log nahi mila');
    }
    return log; // requestBody yahan included (poora record)
  }
}