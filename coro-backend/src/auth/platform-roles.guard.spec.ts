import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PlatformRolesGuard } from './platform-roles.guard';

describe('PlatformRolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) =>
      key === 'platformRoles' ? [UserRole.SUPER_ADMIN] : undefined,
    ),
  } as unknown as Reflector;
  const authority = {
    requireFounderAuthority: jest.fn().mockResolvedValue(undefined),
    requirePermission: jest.fn().mockResolvedValue(undefined),
  };
  const guard = new PlatformRolesGuard(reflector, authority as never);

  const context = (role?: UserRole) =>
    ({
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { userId: 'user-1', role } : undefined,
          params: {},
        }),
      }),
    }) as unknown as ExecutionContext;

  it.each([undefined, UserRole.OPERATOR, UserRole.ADMIN])(
    'refuse le rôle %s sur un endpoint SUPER_ADMIN',
    async (role) =>
      expect(guard.canActivate(context(role))).rejects.toThrow(
        ForbiddenException,
      ),
  );

  it('autorise le Founder vérifié sur un endpoint SUPER_ADMIN', async () => {
    await expect(
      guard.canActivate(context(UserRole.SUPER_ADMIN)),
    ).resolves.toBe(true);
    expect(authority.requireFounderAuthority).toHaveBeenCalledWith({
      userId: 'user-1',
      role: UserRole.SUPER_ADMIN,
    });
  });

  it('ne modifie pas les endpoints sans exigence de rôle', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(undefined);
    await expect(guard.canActivate(context(UserRole.OPERATOR))).resolves.toBe(
      true,
    );
  });
});
