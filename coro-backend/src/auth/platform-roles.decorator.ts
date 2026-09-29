import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const PLATFORM_ROLES_KEY = 'platformRoles';

export const PlatformRoles = (...roles: UserRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, roles);

export const SuperAdminOnly = () => PlatformRoles(UserRole.SUPER_ADMIN);
