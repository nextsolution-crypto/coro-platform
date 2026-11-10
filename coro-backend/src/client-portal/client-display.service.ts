import { createHash, randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisplayPermission, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  ClientDisplayListQueryDto,
  SubmitDisplayCorrectionDto,
} from './dto/client-display.dto';

export type ClientDisplayActor = {
  sub: string;
  organizationId: string;
  clientId: string;
  buildingIds: string[];
  displayBuildingIds: string[];
  displayPermissions: DisplayPermission[];
};

@Injectable()
export class ClientDisplayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private requirePermission(
    actor: ClientDisplayActor,
    permission: DisplayPermission,
  ) {
    if (!actor.displayPermissions.includes(permission))
      throw new ForbiddenException('Permission CORO Display requise.');
  }

  private scopedBuildings(actor: ClientDisplayActor) {
    const broad = new Set(actor.buildingIds);
    return actor.displayBuildingIds.filter((id) => broad.has(id));
  }

  private requireBuilding(actor: ClientDisplayActor, buildingId: string) {
    if (!this.scopedBuildings(actor).includes(buildingId))
      throw new ForbiddenException('Bâtiment CORO Display non autorisé.');
  }

  async workspace(actor: ClientDisplayActor, query: ClientDisplayListQueryDto) {
    this.requirePermission(actor, DisplayPermission.DISPLAY_CLIENT_PLAN_READ);
    const buildingIds = this.scopedBuildings(actor);
    if (query.buildingId) this.requireBuilding(actor, query.buildingId);
    const scoped = query.buildingId ? [query.buildingId] : buildingIds;
    if (!scoped.length)
      return {
        buildings: [],
        plans: [],
        observations: { submitted: 0, active: 0, closed: 0 },
      };

    const [buildings, plans, observations] = await Promise.all([
      this.prisma.building.findMany({
        where: {
          id: { in: scoped },
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          province: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.displayPlanPublication.findMany({
        where: {
          organizationId: actor.organizationId,
          buildingId: { in: scoped },
          status: { in: ['APPROVED', 'PUBLISHED'] },
          variantStorageKey: { not: null },
          variantSha256: { not: null },
          location: { status: 'ACTIVE' },
          floor: { status: 'ACTIVE' },
          ...(query.search
            ? {
                projectFile: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              }
            : {}),
        },
        select: {
          id: true,
          buildingId: true,
          floorId: true,
          zoneId: true,
          locationId: true,
          versionNumber: true,
          sourceVersion: true,
          variantVersion: true,
          status: true,
          widthPixels: true,
          heightPixels: true,
          orientation: true,
          language: true,
          approvedAt: true,
          publishedAt: true,
          updatedAt: true,
          building: { select: { name: true } },
          floor: { select: { name: true, code: true } },
          zone: { select: { name: true, code: true } },
          location: { select: { label: true, code: true } },
          projectFile: { select: { name: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.displayCorrectionObservation.groupBy({
        by: ['status'],
        where: {
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          buildingId: { in: scoped },
          submittedByClientUserId: actor.sub,
        },
        _count: { _all: true },
      }),
    ]);
    const count = (states: string[]) =>
      observations
        .filter((row) => states.includes(row.status))
        .reduce((sum, row) => sum + row._count._all, 0);
    return {
      buildings,
      plans: plans.map((plan) => ({
        ...plan,
        publishedOnDisplay: plan.status === 'PUBLISHED',
        previewPath: `/client-portal/display/plans/${plan.id}/preview`,
      })),
      observations: {
        submitted: count(['SUBMITTED']),
        active: count([
          'UNDER_REVIEW',
          'MORE_INFO_REQUIRED',
          'ACCEPTED',
          'CORRECTION_IN_PROGRESS',
        ]),
        closed: count(['REJECTED', 'RESOLVED', 'CLOSED']),
      },
    };
  }

  async preview(actor: ClientDisplayActor, publicationId: string) {
    this.requirePermission(actor, DisplayPermission.DISPLAY_CLIENT_PREVIEW);
    const row = await this.prisma.displayPlanPublication.findFirst({
      where: {
        id: publicationId,
        organizationId: actor.organizationId,
        buildingId: { in: this.scopedBuildings(actor) },
        status: { in: ['APPROVED', 'PUBLISHED'] },
        variantStorageKey: { not: null },
        variantSha256: { not: null },
      },
      select: {
        variantStorageKey: true,
        variantSha256: true,
        variantMimeType: true,
      },
    });
    if (!row?.variantStorageKey || !row.variantSha256)
      throw new NotFoundException('Rendu autorisé introuvable.');
    const bytes = await this.storage.downloadPrivate(row.variantStorageKey);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== row.variantSha256)
      throw new NotFoundException('Rendu privé indisponible.');
    return {
      bytes,
      mimeType: row.variantMimeType ?? 'image/png',
      sha256: digest,
    };
  }

  async locations(actor: ClientDisplayActor, buildingId: string) {
    this.requirePermission(
      actor,
      DisplayPermission.DISPLAY_CLIENT_LOCATION_READ,
    );
    this.requireBuilding(actor, buildingId);
    return this.prisma.buildingFloor.findMany({
      where: {
        organizationId: actor.organizationId,
        buildingId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        levelNumber: true,
        zones: {
          where: { status: 'ACTIVE' },
          select: { id: true, code: true, name: true },
        },
        displayLocations: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            zoneId: true,
            code: true,
            label: true,
            description: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async submit(actor: ClientDisplayActor, dto: SubmitDisplayCorrectionDto) {
    this.requirePermission(
      actor,
      DisplayPermission.DISPLAY_CLIENT_OBSERVATION_SUBMIT,
    );
    this.requireBuilding(actor, dto.buildingId);
    if ((dto.normalizedX == null) !== (dto.normalizedY == null))
      throw new ForbiddenException(
        'Les deux coordonnées normalisées sont requises ensemble.',
      );
    const existing = await this.prisma.displayCorrectionObservation.findUnique({
      where: {
        submittedByClientUserId_submissionRequestId: {
          submittedByClientUserId: actor.sub,
          submissionRequestId: dto.requestId,
        },
      },
    });
    if (existing) return existing;
    const plan = await this.prisma.displayPlanPublication.findFirst({
      where: {
        id: dto.publicationId,
        organizationId: actor.organizationId,
        buildingId: dto.buildingId,
        locationId: dto.locationId,
        status: { in: ['APPROVED', 'PUBLISHED'] },
        variantSha256: { not: null },
        location: { status: 'ACTIVE' },
      },
    });
    if (!plan?.variantSha256)
      throw new NotFoundException('Plan ou emplacement autorisé introuvable.');
    const reference = `DSP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.$transaction(async (tx) => {
      const observation = await tx.displayCorrectionObservation.create({
        data: {
          reference,
          organizationId: actor.organizationId,
          clientId: actor.clientId,
          buildingId: dto.buildingId,
          floorId: plan.floorId,
          locationId: dto.locationId,
          publicationId: plan.id,
          publicationVersion: plan.versionNumber,
          variantVersion: plan.variantVersion,
          variantSha256: plan.variantSha256!,
          category: dto.category,
          description: dto.description.trim(),
          suggestedPriority: dto.suggestedPriority,
          normalizedX: dto.normalizedX,
          normalizedY: dto.normalizedY,
          submittedByClientUserId: actor.sub,
          submissionRequestId: dto.requestId,
        },
      });
      await tx.displayCorrectionObservationEvent.create({
        data: {
          observationId: observation.id,
          organizationId: actor.organizationId,
          buildingId: dto.buildingId,
          status: 'SUBMITTED',
          action: 'CLIENT_SUBMITTED',
          actorClientUserId: actor.sub,
          metadata: {
            criticalSuggested: dto.suggestedPriority === 'CRITICAL',
          } as Prisma.InputJsonValue,
        },
      });
      return observation;
    });
  }

  async observations(actor: ClientDisplayActor) {
    this.requirePermission(
      actor,
      DisplayPermission.DISPLAY_CLIENT_OBSERVATION_READ,
    );
    return this.prisma.displayCorrectionObservation.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: actor.clientId,
        buildingId: { in: this.scopedBuildings(actor) },
        submittedByClientUserId: actor.sub,
      },
      select: {
        id: true,
        reference: true,
        buildingId: true,
        publicationId: true,
        publicationVersion: true,
        category: true,
        description: true,
        suggestedPriority: true,
        status: true,
        normalizedX: true,
        normalizedY: true,
        clientVisibleResponse: true,
        submittedAt: true,
        updatedAt: true,
        resolvedAt: true,
        building: { select: { name: true } },
        publication: { select: { projectFile: { select: { name: true } } } },
      },
      orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
    });
  }
}
