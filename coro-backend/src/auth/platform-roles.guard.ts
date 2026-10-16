import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from './platform-roles.decorator';
import { PlatformAuthorityService } from './platform-authority.service';
import {
  PLATFORM_PERMISSION_KEY,
  PLATFORM_TARGET_RESOURCE_KEY,
  PLATFORM_TARGET_ORGANIZATION_PARAM_KEY,
  PlatformTargetResource,
} from './platform-permission.decorator';
import { PlatformPermission } from '@prisma/client';

type PlatformRequest = {
  user?: { userId: string; role: UserRole };
  params?: Record<string, string>;
};

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authority: PlatformAuthorityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const { user } = context.switchToHttp().getRequest<PlatformRequest>();
    const permission = this.reflector.getAllAndOverride<PlatformPermission>(
      PLATFORM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (permission) {
      if (!user)
        throw new ForbiddenException('Accès administratif insuffisant.');
      const targetParam = this.reflector.getAllAndOverride<string>(
        PLATFORM_TARGET_ORGANIZATION_PARAM_KEY,
        [context.getHandler(), context.getClass()],
      );
      const request = context.switchToHttp().getRequest<PlatformRequest>();
      const targetResource =
        this.reflector.getAllAndOverride<PlatformTargetResource>(
          PLATFORM_TARGET_RESOURCE_KEY,
          [context.getHandler(), context.getClass()],
        );
      const resourceId = targetResource
        ? request.params?.[targetResource.param]
        : undefined;
      const resourceOrganizationId = resourceId
        ? await this.authority.resolveTargetOrganization(
            targetResource.kind,
            resourceId,
          )
        : undefined;
      await this.authority.requirePermission(
        user,
        permission,
        targetParam ? request.params?.[targetParam] : resourceOrganizationId,
      );
      return true;
    }
    if (!requiredRoles?.length) return true;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Accès administratif insuffisant.');
    }
    if (requiredRoles.includes(UserRole.SUPER_ADMIN)) {
      await this.authority.requireFounderAuthority(user);
    }
    return true;
  }
}
