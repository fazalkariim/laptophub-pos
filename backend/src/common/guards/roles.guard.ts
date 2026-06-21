import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Route par kaunse roles required hain? (@Roles() se aaye tag se padho)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Agar route par koi @Roles() nahi laga, to sab allowed (sirf login zaroori)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // req.user JwtAuthGuard ne set kiya hota hai
    const { user } = context.switchToHttp().getRequest();

    // User ka role required roles mein hai?
    if (user && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('Aapko is kaam ki ijazat nahi hai');
  }
}