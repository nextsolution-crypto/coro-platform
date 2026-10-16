import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlatformAuthorityService } from './platform-authority.service';

const requireLegacySuperAdmin = (actor?: { role?: UserRole }) => {
  if (actor?.role !== UserRole.SUPER_ADMIN)
    throw new ForbiddenException('Accès plateforme interdit.');
};

export const legacyPlatformAuthorityTestProvider = {
  provide: PlatformAuthorityService,
  useValue: {
    requirePermission: jest.fn(requireLegacySuperAdmin),
    requireFounderAuthority: jest.fn(requireLegacySuperAdmin),
  },
};
