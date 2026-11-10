import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisplayPermission, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  ClientDisplayListQueryDto,
  ClientDisplayObservationListQueryDto,
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
  private authorizedPublicationWhere(
    actor: ClientDisplayActor,
    buildingIds: string[],
    now: Date,
  ): Prisma.DisplayPlanPublicationWhereInput {
    return {
      organizationId: actor.organizationId,
      buildingId: { in: buildingIds },
      OR: [
        { status: 'APPROVED' },
        {
          status: 'PUBLISHED',
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
      ],
      suspendedAt: null,
      revokedAt: null,
      supersededAt: null,
      variantStorageKey: { not: null },
      variantSha256: { not: null },
      location: { status: 'ACTIVE' },
      floor: { status: 'ACTIVE' },
      projectFile: {
        lifecycleState: 'APPROVED',
        approvedAt: { not: null },
        approvedById: { not: null },
        revokedAt: null,
        supersededAt: null,
        AND: [
          { OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
    };
  }
  private normalizeDescription(value: string) {
    const description = value.trim();
    if (description.length < 10 || description.length > 4000)
      throw new BadRequestException(
        'La description doit contenir entre 10 et 4000 caractères.',
      );
    const hasControlCharacter = [...description].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return (
        (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
      );
    });
    if (/[<>]/u.test(description) || hasControlCharacter)
      throw new BadRequestException(
        'Le texte HTML, les scripts et les caractères de contrôle sont interdits.',
      );
    return description;
  }

  async workspace(actor: ClientDisplayActor, query: ClientDisplayListQueryDto) {
    this.requirePermission(actor, DisplayPermission.DISPLAY_CLIENT_PLAN_READ);
    const buildingIds = this.scopedBuildings(actor);
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    if (query.buildingId) this.requireBuilding(actor, query.buildingId);
    const scoped = query.buildingId ? [query.buildingId] : buildingIds;
    if (!scoped.length)
      return {
        buildings: [],
        plans: [],
        observations: { submitted: 0, active: 0, closed: 0 },
        planPage: { total: 0, limit, offset },
      };
    const authority = this.authorizedPublicationWhere(
      actor,
      scoped,
      new Date(),
    );
    const publicationWhere: Prisma.DisplayPlanPublicationWhereInput =
      query.search
        ? {
            ...authority,
            projectFile: {
              ...(authority.projectFile as Prisma.ProjectFileWhereInput),
              name: { contains: query.search, mode: 'insensitive' },
            },
          }
        : authority;
    const [buildings, plans, planTotal, observations] = await Promise.all([
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
        where: publicationWhere,
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
        take: limit,
        skip: offset,
      }),
      this.prisma.displayPlanPublication.count({ where: publicationWhere }),
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
        publishedForDisplay: plan.status === 'PUBLISHED',
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
      planPage: { total: planTotal, limit, offset },
    };
  }

  async preview(actor: ClientDisplayActor, publicationId: string) {
    this.requirePermission(actor, DisplayPermission.DISPLAY_CLIENT_PREVIEW);
    const row = await this.prisma.displayPlanPublication.findFirst({
      where: {
        ...this.authorizedPublicationWhere(
          actor,
          this.scopedBuildings(actor),
          new Date(),
        ),
        id: publicationId,
      },
      select: {
        variantStorageKey: true,
        variantSha256: true,
        variantMimeType: true,
      },
    });
    if (!row?.variantStorageKey || !row.variantSha256)
      throw new NotFoundException('Rendu autorisé introuvable.');
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(
        row.variantMimeType ?? '',
      )
    )
      throw new NotFoundException('Format de rendu privé non autorisé.');
    const bytes = await this.storage.downloadPrivate(row.variantStorageKey);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== row.variantSha256)
      throw new ConflictException('Empreinte du rendu privé incorrecte.');
    return { bytes, mimeType: row.variantMimeType!, sha256: digest };
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
      throw new BadRequestException(
        'Les deux coordonnées normalisées sont requises ensemble.',
      );
    const description = this.normalizeDescription(dto.description);
    const where = {
      submittedByClientUserId_submissionRequestId: {
        submittedByClientUserId: actor.sub,
        submissionRequestId: dto.requestId,
      },
    };
    const existing = await this.prisma.displayCorrectionObservation.findUnique({
      where,
    });
    if (existing) return existing;
    const plan = await this.prisma.displayPlanPublication.findFirst({
      where: {
        ...this.authorizedPublicationWhere(actor, [dto.buildingId], new Date()),
        id: dto.publicationId,
        buildingId: dto.buildingId,
        locationId: dto.locationId,
      },
    });
    if (!plan?.variantSha256)
      throw new NotFoundException('Plan ou emplacement autorisé introuvable.');
    const variantSha256 = plan.variantSha256;
    const reference = `DSP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      return await this.prisma.$transaction(async (tx) => {
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
            variantSha256,
            category: dto.category,
            description,
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
              requiresPriorityReview: dto.suggestedPriority === 'CRITICAL',
              operationalEscalationConfigured: false,
            },
          },
        });
        return observation;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const retry = await this.prisma.displayCorrectionObservation.findUnique(
          { where },
        );
        if (retry) return retry;
      }
      throw error;
    }
  }

  async observations(
    actor: ClientDisplayActor,
    query: ClientDisplayObservationListQueryDto,
  ) {
    this.requirePermission(
      actor,
      DisplayPermission.DISPLAY_CLIENT_OBSERVATION_READ,
    );
    if (query.buildingId) this.requireBuilding(actor, query.buildingId);
    const where: Prisma.DisplayCorrectionObservationWhereInput = {
      organizationId: actor.organizationId,
      clientId: actor.clientId,
      buildingId: query.buildingId
        ? query.buildingId
        : { in: this.scopedBuildings(actor) },
      submittedByClientUserId: actor.sub,
    };
    const [items, total] = await Promise.all([
      this.prisma.displayCorrectionObservation.findMany({
        where,
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
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.displayCorrectionObservation.count({ where }),
    ]);
    return { items, total, limit: query.limit, offset: query.offset };
  }
}
