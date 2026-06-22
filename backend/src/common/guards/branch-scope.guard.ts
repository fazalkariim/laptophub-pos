import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class BranchScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User hona chahiye (JwtAuthGuard pehle chal chuka hoga)
    if (!user) {
      throw new ForbiddenException('Authentication zaroori hai');
    }

    // Super Admin (branchId null) — har branch allowed
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Manager/Salesman — request mein jo branchId aaya wo nikalo
    // (body, params, ya query — jahan bhi ho)
    const requestedBranchId =
      request.body?.branchId ||
      request.params?.branchId ||
      request.query?.branchId;

    // Agar request mein koi branchId nahi, to ye guard kuch nahi rokega
    // (aise routes jo branch-specific nahi)
    if (!requestedBranchId) {
      return true;
    }

    // User ki apni branch se match karo
    if (requestedBranchId !== user.branchId) {
      throw new ForbiddenException('Aap sirf apni branch par kaam kar sakte hain');
    }

    return true;
  }
}