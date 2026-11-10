import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DisplayPermission,
  DisplayPlanPublicationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SpatialActor } from '../spatial/spatial-authorization.service';

const PERMISSIONS = Object.values(DisplayPermission);

@Injectable()
export class DisplayManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspace(organizationId: string, actor: SpatialActor) {
    if (!actor?.userId || actor.organizationId !== organizationId) {
      throw new ForbiddenException('Accès Display interdit.');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        id: actor.userId,
        organizationId,
        isActive: true,
        organization: { isActive: true },
      },
      select: { displayPermissions: true, displayBuildingIds: true },
    });
    if (
      !user?.displayPermissions.includes(DisplayPermission.DISPLAY_READ) ||
      user.displayBuildingIds.length === 0
    ) {
      throw new ForbiddenException(
        'Permission DISPLAY_READ et affectation à un bâtiment requises.',
      );
    }

    const buildingIds = user.displayBuildingIds;
    const can = (permission: DisplayPermission) =>
      user.displayPermissions.includes(permission);
    const [buildings, plans, sources, events] = await Promise.all([
      this.prisma.building.findMany({
        where: { id: { in: buildingIds }, organizationId, isActive: true },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          province: true,
          spatialFloors: {
            where: { status: 'ACTIVE' },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: {
              id: true,
              code: true,
              name: true,
              levelNumber: true,
              status: true,
              zones: {
                where: { status: 'ACTIVE' },
                orderBy: { name: 'asc' },
                select: {
                  id: true,
                  floorId: true,
                  code: true,
                  name: true,
                  status: true,
                },
              },
              displayLocations: {
                where: { status: 'ACTIVE' },
                orderBy: { label: 'asc' },
                select: {
                  id: true,
                  floorId: true,
                  zoneId: true,
                  code: true,
                  label: true,
                  status: true,
                  youAreHereX: true,
                  youAreHereY: true,
                  orientationDegrees: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      can(DisplayPermission.DISPLAY_PLAN_READ)
        ? this.prisma.displayPlanPublication.findMany({
            where: { organizationId, buildingId: { in: buildingIds } },
            orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
            select: {
              id: true,
              buildingId: true,
              floorId: true,
              zoneId: true,
              locationId: true,
              projectFileId: true,
              sourceVersion: true,
              sourceSha256: true,
              versionNumber: true,
              variantVersion: true,
              variantSha256: true,
              variantMimeType: true,
              widthPixels: true,
              heightPixels: true,
              orientation: true,
              language: true,
              status: true,
              lockVersion: true,
              createdAt: true,
              updatedAt: true,
              publishedAt: true,
              validFrom: true,
              validUntil: true,
              location: { select: { code: true, label: true } },
              building: { select: { name: true } },
              floor: { select: { name: true } },
              projectFile: {
                select: {
                  name: true,
                  version: true,
                  lifecycleState: true,
                  sha256: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      can(DisplayPermission.DISPLAY_PLAN_CREATE)
        ? this.prisma.projectFile.findMany({
            where: {
              organizationId,
              buildingId: { in: buildingIds },
              category: 'plans_evacuation',
              mimeType: 'application/pdf',
              lifecycleState: 'APPROVED',
              approvedAt: { not: null },
              approvedById: { not: null },
              sha256: { not: null },
              revokedAt: null,
              supersededAt: null,
              effectiveAt: { lte: new Date() },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: [{ approvedAt: 'desc' }, { id: 'asc' }],
            select: {
              id: true,
              projectId: true,
              buildingId: true,
              name: true,
              version: true,
              size: true,
              mimeType: true,
              sha256: true,
              approvedAt: true,
              approvedById: true,
            },
          })
        : Promise.resolve([]),
      can(DisplayPermission.DISPLAY_AUDIT_READ)
        ? this.prisma.displayPlanPublicationEvent.findMany({
            where: { organizationId, buildingId: { in: buildingIds } },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            take: 100,
            select: {
              id: true,
              publicationId: true,
              buildingId: true,
              action: true,
              fromStatus: true,
              toStatus: true,
              actorUserId: true,
              reason: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const locations = buildings.flatMap((building) =>
      building.spatialFloors.flatMap((floor) => floor.displayLocations),
    );
    const planRows = plans as Array<{
      status: DisplayPlanPublicationStatus;
      locationId: string;
    }>;
    const activeLocationIds = new Set(
      planRows
        .filter((plan) => plan.status === 'PUBLISHED')
        .map((plan) => plan.locationId),
    );
    const byStatus = Object.fromEntries(
      Object.values(DisplayPlanPublicationStatus).map((status) => [
        status,
        planRows.filter((plan) => plan.status === status).length,
      ]),
    );
    return {
      generatedAt: new Date().toISOString(),
      capabilities: Object.fromEntries(
        PERMISSIONS.map((permission) => [permission, can(permission)]),
      ),
      dashboard: {
        buildingCount: buildings.length,
        locationCount: locations.length,
        planCount: plans.length,
        plansByStatus: byStatus,
        anomalyCount: locations.filter(
          (location) => !activeLocationIds.has(location.id),
        ).length,
        devices: {
          available: false,
          count: null,
          reason: 'Aucune autorité de périphériques Display n’est enregistrée.',
        },
      },
      buildings,
      plans,
      eligiblePdfSources: sources,
      recentEvents: events,
    };
  }
}
