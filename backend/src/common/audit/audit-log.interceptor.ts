import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { getActionLabel, getEntityType, resolveBeforeLookup } from './audit-actions';
import { redactBody } from './redact';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // GET requests kabhi log nahi
    if (req.method === 'GET') {
      return next.handle();
    }

    // Audit-log ka apna endpoint skip
    if (req.path?.startsWith('/audit-logs')) {
      return next.handle();
    }

    // "Before" state — handler chalne se PEHLE fetch karo
    let beforeData: any = null;
    try {
      const lookup = resolveBeforeLookup(req.method, req.path, req.body);
      if (lookup) {
        const model = (this.prisma as any)[lookup.model];
        if (model) {
          const row = await model.findFirst({ where: { id: lookup.id } });
          beforeData = row ? redactBody(row) : null;
        }
      }
    } catch (e) {
      // Before-fetch fail ho to bhi request na ruke
      beforeData = null;
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => this.logRequest(req, res, responseBody, beforeData),
        error: () => this.logRequest(req, res, null, beforeData),
      }),
    );
  }

  private logRequest(req: any, res: any, responseBody: any, beforeData: any) {
    const user = req.user;
    if (!user) return;
    if (!user.tenantId || !user.role || !user.userId) return;

    // "After" state decide karo method ke hisaab se
    let afterData: any = null;
    if (req.method === 'POST' || req.method === 'PATCH') {
      afterData = responseBody ? redactBody(responseBody) : null;
    }
    // DELETE ke liye afterData hamesha null (kuch bacha hi nahi)

    (async () => {
      try {
        const entityType = getEntityType(req.path);
        const entityId = req.params?.id ?? responseBody?.id ?? null;

        await this.prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.userId,
            userName: user.name ?? user.email ?? null,
            userRole: user.role,
            method: req.method,
            path: req.originalUrl ?? req.path,
            action: getActionLabel(req.method, req.path),
            entityType,
            entityId,
            statusCode: res.statusCode,
            requestBody: redactBody(req.body),
            beforeData,
            afterData,
          } as any,
        });
      } catch (e) {
        console.error('AuditLog write failed:', (e as any).message);
      }
    })();
  }
}