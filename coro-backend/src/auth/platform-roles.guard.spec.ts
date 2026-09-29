import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PlatformRolesGuard } from './platform-roles.guard';

describe('PlatformRolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(() => [UserRole.SUPER_ADMIN]),
  } as unknown as Reflector;
  const guard = new PlatformRolesGuard(reflector);

  const context = (role?: UserRole) =>
    ({
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  it.each([undefined, UserRole.OPERATOR, UserRole.ADMIN])(
    'refuse le rôle %s sur un endpoint SUPER_ADMIN',
    (role) =>
      expect(() => guard.canActivate(context(role))).toThrow(
        ForbiddenException,
      ),
  );

  it('autorise SUPER_ADMIN', () => {
    expect(guard.canActivate(context(UserRole.SUPER_ADMIN))).toBe(true);
  });

  it('ne modifie pas les endpoints sans exigence de rôle', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(undefined);
    expect(guard.canActivate(context(UserRole.OPERATOR))).toBe(true);
  });
});
