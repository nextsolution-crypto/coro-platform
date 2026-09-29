import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import {
  ORGANIZATION_ACCESS_KEY,
  OrganizationAccessMode,
} from './organization-access.decorator';

type OrganizationActor = {
  role: string;
  organizationId?: string;
};

type OrganizationRequest = {
  user?: OrganizationActor;
  clientUser?: OrganizationActor;
};

@Injectable()
export class OrganizationStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrganizationRequest>();
    const actor = request.user ?? request.clientUser;
    if (!actor) return true;
    if (actor.role === 'SUPER_ADMIN') return true;

    const organizationId = actor.organizationId;
    if (!organizationId) return true;

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { isActive: true },
    });
    if (!organization) {
      throw new ForbiddenException('Organisation associée introuvable.');
    }
    if (organization.isActive) return true;

    const mode =
      this.reflector.getAllAndOverride<OrganizationAccessMode>(
        ORGANIZATION_ACCESS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? OrganizationAccessMode.NORMAL;

    if (
      mode === OrganizationAccessMode.OPERATIONAL_CONTINUITY ||
      mode === OrganizationAccessMode.EVIDENCE_READ
    ) {
      return true;
    }

    throw new ForbiddenException(
      'Organisation suspendue : cette fonction normale est temporairement indisponible.',
    );
  }
}
