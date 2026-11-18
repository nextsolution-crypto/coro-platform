import { NotFoundException } from '@nestjs/common';
import {
  ClientOperationalPermission,
  PlatformPermission,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProvenanceActor, provenanceActor } from './coro-actor-provenance';

/** Shared fail-closed authority check for internal and portal actors. */
export async function requireOperationalAccess(
  prisma: PrismaService,
  actor: ProvenanceActor,
  organizationId: string,
  buildingId: string,
  permission: PlatformPermission,
  hiddenMessage: string,
): Promise<void> {
  const authority = provenanceActor(actor);
  const deny = () => {
    throw new NotFoundException(hiddenMessage);
  };
  if (!authority.actorId || authority.organizationId !== organizationId) deny();
  const now = new Date();
  const client = authority.actorType === 'CLIENT_USER';
  const [identity, building, grant, assignment] = await Promise.all([
    client
      ? prisma.clientUser.findFirst({
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
      : prisma.user.findFirst({
          where: { id: authority.actorId, organizationId, isActive: true },
          select: { id: true },
        }),
    prisma.building.findFirst({
      where: { id: buildingId, organizationId, isActive: true },
      select: { id: true },
    }),
    client
      ? Promise.resolve({ id: 'canonical-client-permission' })
      : prisma.platformPermissionGrant.findFirst({
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
      ? prisma.clientOperationalBuildingAssignment.findFirst({
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
      : prisma.operationalLogBuildingAssignment.findFirst({
          where: {
            organizationId,
            buildingId,
            userId: authority.actorId,
            status: 'ACTIVE',
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
          select: { id: true },
        }),
  ]);
  if (!identity || !building || !grant || !assignment) deny();
}
