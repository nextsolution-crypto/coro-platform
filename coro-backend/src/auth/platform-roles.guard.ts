import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from './platform-roles.decorator';

type PlatformRequest = {
  user?: { role: UserRole };
};

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<PlatformRequest>();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Accès administratif insuffisant.');
    }
    return true;
  }
}
