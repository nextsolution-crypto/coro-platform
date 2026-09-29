import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationAccessMode } from './organization-access.decorator';
import { OrganizationStatusGuard } from './organization-status.guard';

describe('OrganizationStatusGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const prisma = { organization: { findUnique: jest.fn() } };
  const guard = new OrganizationStatusGuard(
    reflector,
    prisma as unknown as PrismaService,
  );

  const context = (role: string, organizationId = 'org-1') =>
    ({
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { role, organizationId } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ isActive: false });
  });

  it.each(['OPERATOR', 'ADMIN'])('bloque %s en accès normal', async (role) => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(
      OrganizationAccessMode.NORMAL,
    );
    await expect(guard.canActivate(context(role))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it.each([
    OrganizationAccessMode.OPERATIONAL_CONTINUITY,
    OrganizationAccessMode.EVIDENCE_READ,
  ])('maintient le mode %s pour une organisation suspendue', async (mode) => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(mode);
    await expect(guard.canActivate(context('OPERATOR'))).resolves.toBe(true);
  });

  it('maintient SUPER_ADMIN sans dépendre de son organisation', async () => {
    await expect(guard.canActivate(context('SUPER_ADMIN'))).resolves.toBe(true);
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it('maintient les accès normaux d une organisation active', async () => {
    prisma.organization.findUnique.mockResolvedValue({ isActive: true });
    await expect(guard.canActivate(context('ADMIN'))).resolves.toBe(true);
  });
});
