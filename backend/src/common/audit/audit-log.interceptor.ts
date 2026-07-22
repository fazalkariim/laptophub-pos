import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { getActionLabel, getEntityType } from './audit-actions';
import { redactBody } from './redact';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Audit-log ka apna read endpoint skip karo (khud ko log na kare)
    if (req.path?.startsWith('/audit-logs')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => this.logRequest(req, res, responseBody),
        error: () => this.logRequest(req, res, null), // errors bhi log karo (statusCode se pata chalega)
      }),
    );
  }

private logRequest(req: any, res: any, responseBody: any) {
    const user = req.user;

    // User hi nahi (public route) — skip
    if (!user) return;

    // Zaroori fields missing hain (jaise refresh-token guard ka user shape) — silently skip
    if (!user.tenantId || !user.role || !user.userId) {
      return;
    }

    // FIRE-AND-FORGET — await NAHI karna, real request ko block nahi karna
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
          } as any,
        });
      } catch (e) {
        console.error('AuditLog write failed:', (e as any).message);
      }
    })();
  }
}