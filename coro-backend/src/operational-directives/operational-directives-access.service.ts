import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperationalDirectivesAccessService {
  constructor(private readonly prisma: PrismaService) {}
  async require(actor: AdviserActor, organizationId: string, buildingId: string, permission: PlatformPermission) {
    if (!actor.userId || actor.organizationId !== organizationId) this.deny();
    const now = new Date();
    const [identity, building, grant, assignment] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: actor.userId, organizationId, isActive: true }, select: { id: true } }),
      this.prisma.building.findFirst({ where: { id: buildingId, organizationId, isActive: true }, select: { id: true } }),
      this.prisma.platformPermissionGrant.findFirst({ where: { userId: actor.userId, permission, status: 'ACTIVE', scope: 'ORGANIZATION', targetOrganizationId: organizationId, effectiveFrom: { lte: now } }, select: { id: true } }),
      this.prisma.operationalLogBuildingAssignment.findFirst({ where: { organizationId, buildingId, userId: actor.userId, status: 'ACTIVE', effectiveFrom: { lte: now }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] }, select: { id: true } }),
    ]);
    if (!identity || !building || !grant || !assignment) this.deny();
  }
  private deny(): never { throw new NotFoundException('Ressource operationnelle introuvable.'); }
}
