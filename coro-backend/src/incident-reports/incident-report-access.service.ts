import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClientOperationalPermission,
  IncidentPermission,
  PlatformPermission,
} from '@prisma/client';
import type { ProvenanceActor } from '../auth/coro-actor-provenance';
import { provenanceActor } from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import { ClientFeatureEntitlementService } from '../capability-entitlements/client-feature-entitlement.service';

@Injectable()
export class IncidentReportAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFeatures: ClientFeatureEntitlementService,
  ) {}

  async require(
    actor: ProvenanceActor,
    organizationId: string,
    buildingId: string,
    permission: PlatformPermission,
    incidentEventId?: string | null,
  ): Promise<void> {
    const authority = provenanceActor(actor);
    if (!authority.actorId || authority.organizationId !== organizationId)
      this.deny();
    const now = new Date();
    const client = authority.actorType === 'CLIENT_USER';
    if (client) {
      await this.clientFeatures.require({
        authority,
        organizationId,
        buildingId,
        feature: 'INCIDENT_REPORTS',
        hiddenMessage: 'Rapport incident introuvable.',
      });
    }
    const [identity, building, grant, assignment, incidentAuthority] =
      await Promise.all([
        client
          ? this.prisma.clientUser.findFirst({
              where: {
                id: authority.actorId,
                organizationId,
                isActive: true,
                operationalPermissions: {
                  has: permission as unknown as ClientOperationalPermission,
                },
              },
              select: { id: true },
            })
          : this.prisma.user.findFirst({
              where: { id: authority.actorId, organizationId, isActive: true },
              select: { id: true },
            }),
        this.prisma.building.findFirst({
          where: { id: buildingId, organizationId, isActive: true },
          select: { id: true },
        }),
        client
          ? Promise.resolve({ id: 'client-canonical-permission' })
          : this.prisma.platformPermissionGrant.findFirst({
              where: {
                userId: authority.actorId,
                permission,
                status: 'ACTIVE',
                scope: 'ORGANIZATION',
                targetOrganizationId: organizationId,
                effectiveFrom: { lte: now },
              },
              select: { id: true },
            }),
        client
          ? this.prisma.clientOperationalBuildingAssignment.findFirst({
              where: {
                organizationId,
                buildingId,
                clientUserId: authority.actorId,
                status: 'ACTIVE',
                effectiveFrom: { lte: now },
                OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
              },
              select: { id: true },
            })
          : Promise.resolve({ id: 'internal-incident-assignment-below' }),
        this.prisma.incidentAuthorityAssignment.findFirst({
          where: {
            organizationId,
            buildingId,
            subjectType: authority.actorType,
            subjectId: authority.actorId,
            status: 'ACTIVE',
            permissions: { has: IncidentPermission.INCIDENT_READ },
            OR: [
              { incidentEventId: null },
              ...(incidentEventId ? [{ incidentEventId }] : []),
            ],
          },
          select: { id: true },
        }),
      ]);
    if (!identity || !building || !grant || !assignment || !incidentAuthority)
      this.deny();
  }

  private deny(): never {
    throw new NotFoundException('Rapport incident introuvable.');
  }
}
