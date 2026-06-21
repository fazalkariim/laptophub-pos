import { SetMetadata } from '@nestjs/common';

// Route par @Roles('SUPER_ADMIN') laga kar batate hain ke kaunse roles allowed hain.
// Ye sirf ek "tag" lagata hai; asal check RolesGuard karta hai.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);