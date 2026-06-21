import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Authorization header se token nikaalo: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // "Bearer " ke baad wala hissa

      try {
        // Token ko verify aur decode karo
        const payload = this.jwtService.verify(token);
        // tenantId aur branchId memory box mein daal do
        this.tenantContext.set(payload.tenantId, payload.branchId ?? null);
      } catch (e) {
        // Token galat/expire — yahan kuch nahi karte.
        // Guard isko baad mein reject kar dega.
      }
    }

    next(); // request aage badhne do
  }
}