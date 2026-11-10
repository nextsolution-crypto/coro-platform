import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisplayPermission,
  DisplayPlanPublicationStatus,
  Prisma,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SpatialAuthorizationService,
  SpatialActor,
} from '../spatial/spatial-authorization.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateDisplayPlanPublicationDto,
  DisplayPlanListQueryDto,
  DisplayPlanMutationDto,
  PublishDisplayPlanDto,
} from './dto/display-plan.dto';
import { DisplayPlanRendererService } from './display-plan-renderer.service';

type Publication = Prisma.DisplayPlanPublicationGetPayload<
  Record<string, never>
>;

@Injectable()
export class DisplayPlanPublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly authorization: SpatialAuthorizationService,
    private readonly audit: AdminAuditService,
    private readonly renderer: DisplayPlanRendererService,
  ) {}

  async createDraft(
    organizationId: string,
    buildingId: string,
    dto: CreateDisplayPlanPublicationDto,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_CREATE,
    );
    const context = await this.loadSourceAndSpatial(
      organizationId,
      buildingId,
      dto,
    );
    await this.verifySourceBytes(context.source);

    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, `${organizationId}:${buildingId}:${dto.locationId}`);
      const existing = await tx.displayPlanPublication.findUnique({
        where: {
          organizationId_buildingId_creationRequestId: {
            organizationId,
            buildingId,
            creationRequestId: dto.requestId,
          },
        },
      });
      if (existing) return existing;
      const latest = await tx.displayPlanPublication.findFirst({
        where: { locationId: dto.locationId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const created = await tx.displayPlanPublication.create({
        data: {
          id: randomUUID(),
          organizationId,
          buildingId,
          floorId: dto.floorId,
          zoneId: dto.zoneId ?? null,
          locationId: dto.locationId,
          projectFileId: context.source.id,
          creationRequestId: dto.requestId,
          sourceVersion: context.source.version,
          sourceSha256: context.source.sha256!,
          sourceApprovedById: context.source.approvedById!,
          sourceApprovedAt: context.source.approvedAt!,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          orientation: dto.orientation,
          language: dto.language,
          renderParameters: this.renderParameters(context.location),
          createdById: actor.userId,
        },
      });
      await this.event(
        tx,
        created,
        dto.requestId,
        'CREATED',
        null,
        'DRAFT',
        actor.userId,
      );
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'DISPLAY_PLAN_CREATED',
        targetType: 'DisplayPlanPublication',
        targetId: created.id,
        organizationId,
        afterData: this.auditSnapshot(created),
      });
      return created;
    });
  }

  async generatePreview(
    organizationId: string,
    buildingId: string,
    publicationId: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_CREATE,
    );
    const publication = await this.load(
      publicationId,
      organizationId,
      buildingId,
    );
    if (publication.status !== 'DRAFT')
      throw new ConflictException('Seul un brouillon peut être rendu.');
    this.assertLock(publication, dto.expectedLockVersion);
    const { source, location } = await this.loadCurrentAuthority(publication);
    const bytes = await this.verifySourceBytes(source);
    const rendered = this.renderer.render({
      source: bytes,
      mimeType: source.mimeType,
      youAreHereX: location.youAreHereX!,
      youAreHereY: location.youAreHereY!,
      orientationDegrees: location.orientationDegrees!,
    });
    const variantVersion = publication.variantVersion + 1;
    const variantSha256 = this.hash(rendered.bytes);
    const storageKey = `tenant-${organizationId}/display-plan-publications/${publication.id}/variant-${variantVersion}-${variantSha256}.svg`;
    await this.storage.uploadPrivateImmutable(
      rendered.bytes,
      storageKey,
      rendered.mimeType,
    );

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.displayPlanPublication.updateMany({
        where: {
          id: publication.id,
          status: 'DRAFT',
          lockVersion: dto.expectedLockVersion,
        },
        data: {
          variantVersion,
          variantStorageKey: storageKey,
          variantSha256,
          variantMimeType: rendered.mimeType,
          widthPixels: rendered.width,
          heightPixels: rendered.height,
          renderParameters: this.renderParameters(location),
          reviewedById: null,
          reviewedAt: null,
          approvedById: null,
          approvedAt: null,
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Brouillon modifié concurremment.');
      const updated = await tx.displayPlanPublication.findUniqueOrThrow({
        where: { id: publication.id },
      });
      await this.event(
        tx,
        updated,
        dto.requestId,
        'PREVIEW_GENERATED',
        'DRAFT',
        'DRAFT',
        actor.userId,
        dto.reason,
      );
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'DISPLAY_PLAN_PREVIEW_GENERATED',
        targetType: 'DisplayPlanPublication',
        targetId: updated.id,
        organizationId,
        reason: this.reason(dto.reason),
        afterData: this.auditSnapshot(updated),
      });
      return updated;
    });
  }

  submit(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    return this.transition(
      organizationId,
      buildingId,
      id,
      dto,
      actor,
      DisplayPermission.DISPLAY_PLAN_CREATE,
      'DRAFT',
      'REVIEW',
      'SUBMITTED',
      (row) => {
        if (!row.variantSha256)
          throw new ConflictException(
            'Une variante doit être générée avant la revue.',
          );
        return {};
      },
    );
  }

  markReviewed(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    return this.transition(
      organizationId,
      buildingId,
      id,
      dto,
      actor,
      DisplayPermission.DISPLAY_PLAN_REVIEW,
      'REVIEW',
      'REVIEW',
      'REVIEWED',
      (row) => {
        if (row.createdById === actor.userId)
          throw new ForbiddenException(
            "L'auteur ne peut pas réviser seul sa variante.",
          );
        return { reviewedById: actor.userId, reviewedAt: new Date() };
      },
    );
  }

  reject(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    return this.transition(
      organizationId,
      buildingId,
      id,
      dto,
      actor,
      DisplayPermission.DISPLAY_PLAN_REVIEW,
      'REVIEW',
      'DRAFT',
      'REJECTED',
      () => ({
        reviewedById: null,
        reviewedAt: null,
        approvedById: null,
        approvedAt: null,
      }),
    );
  }

  approve(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    return this.transition(
      organizationId,
      buildingId,
      id,
      dto,
      actor,
      DisplayPermission.DISPLAY_PLAN_APPROVE,
      'REVIEW',
      'APPROVED',
      'APPROVED',
      async (row) => {
        if (row.createdById === actor.userId)
          throw new ForbiddenException(
            "L'auteur ne peut pas approuver sa publication.",
          );
        if (row.reviewedById === actor.userId)
          throw new ForbiddenException(
            "Le réviseur ne peut pas approuver la publication qu'il a révisée.",
          );
        if (!row.reviewedById || !row.variantSha256)
          throw new ConflictException(
            'La revue humaine et la variante sont obligatoires.',
          );
        await this.assertCurrentAuthority(row);
        return { approvedById: actor.userId, approvedAt: new Date() };
      },
    );
  }

  async publish(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: PublishDisplayPlanDto,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
    );
    const publication = await this.load(id, organizationId, buildingId);
    if (publication.status !== 'APPROVED')
      throw new ConflictException('La publication doit être approuvée.');
    this.assertLock(publication, dto.expectedLockVersion);
    await this.assertCurrentAuthority(publication);
    const validFrom = dto.validFrom
      ? this.date(dto.validFrom, 'validFrom')
      : new Date();
    const validUntil = dto.validUntil
      ? this.date(dto.validUntil, 'validUntil')
      : null;
    if (validUntil && validUntil <= validFrom)
      throw new BadRequestException('validUntil doit suivre validFrom.');

    return this.prisma.$transaction(async (tx) => {
      await this.lock(
        tx,
        `${organizationId}:${buildingId}:${publication.locationId}`,
      );
      const current = await tx.displayPlanPublication.findUniqueOrThrow({
        where: { id },
      });
      if (
        current.status !== 'APPROVED' ||
        current.lockVersion !== dto.expectedLockVersion
      )
        throw new ConflictException('Publication modifiée concurremment.');
      await this.assertTransactionalAuthority(tx, current);
      const active = await tx.displayPlanPublication.findMany({
        where: {
          locationId: publication.locationId,
          status: 'PUBLISHED',
          id: { not: id },
        },
      });
      const now = new Date();
      for (const previous of active) {
        await tx.displayPlanPublication.update({
          where: { id: previous.id },
          data: {
            status: 'SUPERSEDED',
            supersededAt: now,
            supersededById: id,
            lockVersion: { increment: 1 },
          },
        });
        await this.event(
          tx,
          previous,
          `${dto.requestId}:supersede:${previous.id}`,
          'SUPERSEDED',
          'PUBLISHED',
          'SUPERSEDED',
          actor.userId,
          dto.reason,
          { supersededById: id },
        );
      }
      const updated = await tx.displayPlanPublication.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedById: actor.userId,
          publishedAt: now,
          validFrom,
          validUntil,
          lockVersion: { increment: 1 },
        },
      });
      await this.event(
        tx,
        updated,
        dto.requestId,
        'PUBLISHED',
        'APPROVED',
        'PUBLISHED',
        actor.userId,
        dto.reason,
      );
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'DISPLAY_PLAN_PUBLISHED',
        targetType: 'DisplayPlanPublication',
        targetId: id,
        organizationId,
        reason: this.reason(dto.reason),
        afterData: this.auditSnapshot(updated),
      });
      return updated;
    });
  }

  suspend(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    return this.transition(
      organizationId,
      buildingId,
      id,
      dto,
      actor,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
      'PUBLISHED',
      'SUSPENDED',
      'SUSPENDED',
      () => ({
        suspendedById: actor.userId,
        suspendedAt: new Date(),
        suspensionReason: this.reason(dto.reason),
      }),
    );
  }

  resume(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    return this.transition(
      organizationId,
      buildingId,
      id,
      dto,
      actor,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
      'SUSPENDED',
      'PUBLISHED',
      'RESUMED',
      async (row) => {
        await this.assertCurrentAuthority(row);
        return {
          suspendedById: null,
          suspendedAt: null,
          suspensionReason: null,
        };
      },
    );
  }

  revoke(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    return this.revokeInternal(organizationId, buildingId, id, dto, actor);
  }

  private async revokeInternal(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_REVOKE,
    );
    const row = await this.load(id, organizationId, buildingId);
    if (['REVOKED', 'SUPERSEDED'].includes(row.status)) {
      if (row.status === 'REVOKED') return row;
      throw new ConflictException(
        'Une publication remplacée demeure historique.',
      );
    }
    return this.transition(
      organizationId,
      buildingId,
      id,
      dto,
      actor,
      DisplayPermission.DISPLAY_PLAN_REVOKE,
      row.status,
      'REVOKED',
      'REVOKED',
      () => ({
        revokedById: actor.userId,
        revokedAt: new Date(),
        revocationReason: this.reason(dto.reason),
      }),
    );
  }

  async get(
    organizationId: string,
    buildingId: string,
    id: string,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_READ,
    );
    return this.load(id, organizationId, buildingId);
  }

  async list(
    organizationId: string,
    buildingId: string,
    query: DisplayPlanListQueryDto,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_READ,
    );
    const where = {
      organizationId,
      buildingId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.floorId ? { floorId: query.floorId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.displayPlanPublication.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.displayPlanPublication.count({ where }),
    ]);
    return { items, total, offset: query.offset, limit: query.limit };
  }

  async history(
    organizationId: string,
    buildingId: string,
    id: string,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_AUDIT_READ,
    );
    await this.load(id, organizationId, buildingId);
    return this.prisma.displayPlanPublicationEvent.findMany({
      where: { publicationId: id, organizationId, buildingId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async downloadVariant(
    organizationId: string,
    buildingId: string,
    id: string,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_READ,
    );
    const row = await this.load(id, organizationId, buildingId);
    if (!row.variantStorageKey || !row.variantSha256 || !row.variantMimeType)
      throw new NotFoundException('Variante absente.');
    const bytes = await this.storage.downloadPrivate(row.variantStorageKey);
    if (this.hash(bytes) !== row.variantSha256)
      throw new ConflictException('Intégrité de la variante invalide.');
    return { bytes, mimeType: row.variantMimeType, sha256: row.variantSha256 };
  }

  async downloadPlayerVariant(
    organizationId: string,
    buildingId: string,
    locationId: string,
    publicationId: string,
    actor: SpatialActor,
  ) {
    const contract = await this.playerContract(
      organizationId,
      buildingId,
      locationId,
      actor,
    );
    if (contract.publicationId !== publicationId)
      throw new NotFoundException('Publication Player inactive.');
    const row = await this.load(publicationId, organizationId, buildingId);
    const bytes = await this.storage.downloadPrivate(row.variantStorageKey!);
    if (this.hash(bytes) !== contract.variantSha256)
      throw new ConflictException('Intégrité de la variante Player invalide.');
    return {
      bytes,
      mimeType: contract.mimeType!,
      sha256: contract.variantSha256,
    };
  }

  async playerContract(
    organizationId: string,
    buildingId: string,
    locationId: string,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_READ,
    );
    const now = new Date();
    const row = await this.prisma.displayPlanPublication.findFirst({
      where: {
        organizationId,
        buildingId,
        locationId,
        status: 'PUBLISHED',
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        location: { status: 'ACTIVE' },
        floor: { status: 'ACTIVE' },
        projectFile: {
          lifecycleState: 'APPROVED',
          approvedAt: { not: null },
          approvedById: { not: null },
          revokedAt: null,
          supersededAt: null,
          effectiveAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
    });
    if (!row || !row.variantSha256 || !row.variantStorageKey)
      throw new NotFoundException('Aucune publication active.');
    await this.assertCurrentAuthority(row);
    return {
      publicationId: row.id,
      publicationVersion: row.versionNumber,
      status: row.status,
      documentVersion: row.sourceVersion,
      sourceSha256: row.sourceSha256,
      variantVersion: row.variantVersion,
      variantSha256: row.variantSha256,
      mimeType: row.variantMimeType,
      width: row.widthPixels,
      height: row.heightPixels,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      publishedAt: row.publishedAt,
      revokedAt: row.revokedAt,
      organizationId,
      buildingId,
      floorId: row.floorId,
      zoneId: row.zoneId,
      locationId: row.locationId,
      renderParameters: row.renderParameters,
      downloadPath: `/organizations/${organizationId}/buildings/${buildingId}/display-plan-publications/player-contract/${row.locationId}/variant/${row.id}`,
    };
  }

  private async transition(
    organizationId: string,
    buildingId: string,
    id: string,
    dto: DisplayPlanMutationDto,
    actor: SpatialActor,
    permission: DisplayPermission,
    from: DisplayPlanPublicationStatus,
    to: DisplayPlanPublicationStatus,
    action: string,
    changes: (
      row: Publication,
    ) =>
      | Prisma.DisplayPlanPublicationUpdateManyMutationInput
      | Promise<Prisma.DisplayPlanPublicationUpdateManyMutationInput>,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      permission,
    );
    const row = await this.load(id, organizationId, buildingId);
    const existing = await this.prisma.displayPlanPublicationEvent.findUnique({
      where: {
        publicationId_requestId: {
          publicationId: id,
          requestId: dto.requestId,
        },
      },
    });
    if (existing) return row;
    if (row.status !== from)
      throw new ConflictException(
        `Transition ${from} → ${to} interdite depuis ${row.status}.`,
      );
    this.assertLock(row, dto.expectedLockVersion);
    const data = await changes(row);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.displayPlanPublication.updateMany({
        where: {
          id,
          organizationId,
          buildingId,
          status: from,
          lockVersion: dto.expectedLockVersion,
        },
        data: { ...data, status: to, lockVersion: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new ConflictException('Publication modifiée concurremment.');
      const updated = await tx.displayPlanPublication.findUniqueOrThrow({
        where: { id },
      });
      await this.event(
        tx,
        updated,
        dto.requestId,
        action,
        from,
        to,
        actor.userId,
        dto.reason,
      );
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: `DISPLAY_PLAN_${action}`,
        targetType: 'DisplayPlanPublication',
        targetId: id,
        organizationId,
        reason: this.reason(dto.reason),
        beforeData: this.auditSnapshot(row),
        afterData: this.auditSnapshot(updated),
      });
      return updated;
    });
  }

  private async loadSourceAndSpatial(
    organizationId: string,
    buildingId: string,
    dto: CreateDisplayPlanPublicationDto,
  ) {
    const now = new Date();
    const [source, location] = await Promise.all([
      this.prisma.projectFile.findFirst({
        where: {
          id: dto.projectFileId,
          organizationId,
          buildingId,
          version: dto.sourceVersion,
          category: 'plans_evacuation',
          lifecycleState: 'APPROVED',
          approvedAt: { not: null },
          approvedById: { not: null },
          sha256: { not: null },
          revokedAt: null,
          supersededAt: null,
          effectiveAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      this.prisma.displayLocation.findFirst({
        where: {
          id: dto.locationId,
          organizationId,
          buildingId,
          floorId: dto.floorId,
          zoneId: dto.zoneId ?? null,
          status: 'ACTIVE',
          floor: { status: 'ACTIVE' },
          ...(dto.zoneId ? { zone: { status: 'ACTIVE' } } : {}),
        },
      }),
    ]);
    if (!source)
      throw new BadRequestException(
        'Le ProjectFile approuvé exact est introuvable ou inadmissible.',
      );
    if (
      !location ||
      location.youAreHereX == null ||
      location.youAreHereY == null ||
      location.orientationDegrees == null
    )
      throw new BadRequestException(
        "L'emplacement actif doit posséder un repère et une orientation approuvés.",
      );
    return { source, location };
  }

  private async loadCurrentAuthority(row: Publication) {
    const now = new Date();
    const [source, location] = await Promise.all([
      this.prisma.projectFile.findFirst({
        where: {
          id: row.projectFileId,
          organizationId: row.organizationId,
          buildingId: row.buildingId,
          version: row.sourceVersion,
          sha256: row.sourceSha256,
          lifecycleState: 'APPROVED',
          revokedAt: null,
          supersededAt: null,
          effectiveAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      this.prisma.displayLocation.findFirst({
        where: {
          id: row.locationId,
          organizationId: row.organizationId,
          buildingId: row.buildingId,
          floorId: row.floorId,
          zoneId: row.zoneId,
          status: 'ACTIVE',
          floor: { status: 'ACTIVE' },
        },
      }),
    ]);
    if (!source)
      throw new ConflictException(
        "L'autorité documentaire a changé ou n'est plus approuvée.",
      );
    if (
      !location ||
      location.youAreHereX == null ||
      location.youAreHereY == null ||
      location.orientationDegrees == null
    )
      throw new ConflictException("L'autorité spatiale n'est plus publiable.");
    return { source, location };
  }

  private async assertTransactionalAuthority(
    tx: Prisma.TransactionClient,
    row: Publication,
  ) {
    const now = new Date();
    const [source, location] = await Promise.all([
      tx.projectFile.findFirst({
        where: {
          id: row.projectFileId,
          organizationId: row.organizationId,
          buildingId: row.buildingId,
          version: row.sourceVersion,
          sha256: row.sourceSha256,
          lifecycleState: 'APPROVED',
          approvedAt: { not: null },
          approvedById: { not: null },
          revokedAt: null,
          supersededAt: null,
          effectiveAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      tx.displayLocation.findFirst({
        where: {
          id: row.locationId,
          organizationId: row.organizationId,
          buildingId: row.buildingId,
          floorId: row.floorId,
          zoneId: row.zoneId,
          status: 'ACTIVE',
          floor: { status: 'ACTIVE' },
          ...(row.zoneId ? { zone: { status: 'ACTIVE' } } : {}),
        },
      }),
    ]);
    if (!source || !location)
      throw new ConflictException(
        "L'autorité documentaire ou spatiale a changé avant publication.",
      );
  }

  private async assertCurrentAuthority(row: Publication) {
    const { source } = await this.loadCurrentAuthority(row);
    await this.verifySourceBytes(source);
    if (!row.variantStorageKey || !row.variantSha256)
      throw new ConflictException('Variante approuvable absente.');
    const variant = await this.storage.downloadPrivate(row.variantStorageKey);
    if (this.hash(variant) !== row.variantSha256)
      throw new ConflictException('Variante altérée.');
  }

  private async verifySourceBytes(source: {
    storageKey: string;
    sha256: string | null;
  }) {
    const bytes = await this.storage.downloadPrivate(source.storageKey);
    if (!source.sha256 || this.hash(bytes) !== source.sha256)
      throw new ConflictException('Intégrité du ProjectFile invalide.');
    return bytes;
  }

  private load(id: string, organizationId: string, buildingId: string) {
    return this.prisma.displayPlanPublication
      .findFirst({ where: { id, organizationId, buildingId } })
      .then((row) => {
        if (!row)
          throw new NotFoundException('Publication Display introuvable.');
        return row;
      });
  }

  private renderParameters(location: {
    youAreHereX: number | null;
    youAreHereY: number | null;
    orientationDegrees: number | null;
  }): Prisma.InputJsonValue {
    return {
      profile: 'TABLOID_11X17',
      fit: 'CONTAIN',
      youAreHere: {
        x: location.youAreHereX,
        y: location.youAreHereY,
        orientationDegrees: location.orientationDegrees,
      },
      renderer: 'CORO_SVG_OVERLAY_V1',
    };
  }

  private async event(
    tx: Prisma.TransactionClient,
    row: Publication,
    requestId: string,
    action: string,
    fromStatus: DisplayPlanPublicationStatus | null,
    toStatus: DisplayPlanPublicationStatus,
    actorUserId: string,
    reason?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await tx.displayPlanPublicationEvent.create({
      data: {
        publicationId: row.id,
        organizationId: row.organizationId,
        buildingId: row.buildingId,
        requestId,
        action,
        fromStatus,
        toStatus,
        actorUserId,
        reason: reason ? this.reason(reason) : null,
        sourceVersion: row.sourceVersion,
        sourceSha256: row.sourceSha256,
        variantVersion: row.variantVersion,
        variantSha256: row.variantSha256,
        metadata,
      },
    });
  }

  private auditSnapshot(row: Publication): Prisma.InputJsonValue {
    return {
      status: row.status,
      versionNumber: row.versionNumber,
      sourceVersion: row.sourceVersion,
      sourceSha256: row.sourceSha256,
      variantVersion: row.variantVersion,
      variantSha256: row.variantSha256,
      locationId: row.locationId,
      lockVersion: row.lockVersion,
    };
  }

  private assertLock(row: Publication, expected: number) {
    if (row.lockVersion !== expected)
      throw new ConflictException('Version concurrente de la publication.');
  }

  private reason(value: string) {
    const reason = value.trim();
    if (reason.length < 8)
      throw new BadRequestException('Une raison de 8 caractères est requise.');
    return reason;
  }

  private date(value: string, field: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
      throw new BadRequestException(`${field} invalide.`);
    return parsed;
  }

  private hash(bytes: Buffer) {
    return createHash('sha256').update(bytes).digest('hex');
  }

  private lock(tx: Prisma.TransactionClient, key: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}
