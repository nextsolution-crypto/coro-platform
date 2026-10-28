import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PATH_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { WebAIAdminController } from './web-ai-admin.controller';

describe('WebAIAdminController security contract', () => {
  it('is mounted under the existing admin authority and requires SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(PATH_METADATA, WebAIAdminController)).toBe(
      'admin/v1/web-ai',
    );
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, WebAIAdminController),
    ).toEqual(['SUPER_ADMIN']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, WebAIAdminController),
    ).toHaveLength(2);
  });

  it.each([
    ['anonymous', undefined],
    [
      'organization administrator',
      { userId: 'org-admin', role: UserRole.ADMIN },
    ],
    [
      'customer manager',
      {
        userId: 'client-manager',
        role: 'CLIENT_MANAGER' as unknown as UserRole,
      },
    ],
  ])('refuses %s before dashboard data is returned', async (_label, user) => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce([UserRole.SUPER_ADMIN])
        .mockReturnValueOnce(undefined),
    };
    const authority = { requireFounderAuthority: jest.fn() };
    const guard = new PlatformRolesGuard(
      reflector as never,
      authority as never,
    );
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(authority.requireFounderAuthority).not.toHaveBeenCalled();
  });

  it('requires Founder authority even for a SUPER_ADMIN identity', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce([UserRole.SUPER_ADMIN])
        .mockReturnValueOnce(undefined),
    };
    const authority = {
      requireFounderAuthority: jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException('FOUNDER_AUTHORITY_REQUIRED'),
        ),
    };
    const guard = new PlatformRolesGuard(
      reflector as never,
      authority as never,
    );
    const user = { userId: 'super-admin', role: UserRole.SUPER_ADMIN };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow(
      'FOUNDER_AUTHORITY_REQUIRED',
    );
  });
});
