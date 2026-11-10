import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisplayPermission } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  SpatialActor,
  SpatialAuthorizationService,
} from '../spatial/spatial-authorization.service';
import { StorageService } from '../storage/storage.service';
import {
  DisplayPdfEngineService,
  DisplayPdfRejectedError,
} from './display-pdf-engine.service';
import { DisplayPlanRendererService } from './display-plan-renderer.service';

type ClaimedJob = {
  id: string;
  publicationId: string;
  organizationId: string;
  buildingId: string;
};

@Injectable()
export class DisplayPdfRenderJobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly authorization: SpatialAuthorizationService,
    private readonly engine: DisplayPdfEngineService,
    private readonly overlay: DisplayPlanRendererService,
  ) {}

  async enqueue(
    organizationId: string,
    buildingId: string,
    publicationId: string,
    requestId: string,
    actor: SpatialActor,
    pageNumber = 1,
    targetDpi = 300,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_PLAN_CREATE,
    );
    const publication = await this.prisma.displayPlanPublication.findFirst({
      where: { id: publicationId, organizationId, buildingId, status: 'DRAFT' },
      include: { projectFile: true },
    });
    if (!publication)
      throw new NotFoundException('Brouillon Display introuvable.');
    const source = publication.projectFile;
    if (
      source.mimeType !== 'application/pdf' ||
      source.lifecycleState !== 'APPROVED' ||
      source.sha256 !== publication.sourceSha256 ||
      source.version !== publication.sourceVersion ||
      source.revokedAt ||
      source.supersededAt
    )
      throw new ConflictException(
        "L'autorité PDF approuvée n'est plus admissible.",
      );
    return this.prisma.displayPdfRenderJob.upsert({
      where: { publicationId_requestId: { publicationId, requestId } },
      update: {},
      create: {
        id: randomUUID(),
        publicationId,
        organizationId,
        buildingId,
        requestId,
        requestedById: actor.userId,
        sourceProjectFileId: source.id,
        sourceVersion: source.version,
        sourceSha256: source.sha256,
        sourceStorageKey: source.storageKey,
        sourceMimeType: source.mimeType,
        pageNumber,
        targetDpi,
      },
    });
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
    const job = await this.prisma.displayPdfRenderJob.findFirst({
      where: { id, organizationId, buildingId },
    });
    if (!job) throw new NotFoundException('Travail PDF introuvable.');
    return job;
  }

  async recoverAbandoned(staleBefore = new Date(Date.now() - 2 * 60_000)) {
    return this.prisma.displayPdfRenderJob.updateMany({
      where: {
        status: 'PROCESSING',
        heartbeatAt: { lt: staleBefore },
        attempts: { lt: 3 },
      },
      data: {
        status: 'PENDING',
        claimedBy: null,
        claimedAt: null,
        heartbeatAt: null,
        nextAttemptAt: new Date(),
      },
    });
  }

  async processNext(workerId: string): Promise<boolean> {
    const claimed = await this.claim(workerId);
    if (!claimed) return false;
    try {
      await this.process(claimed.id);
    } catch (error) {
      await this.fail(claimed.id, error);
    }
    return true;
  }

  private async claim(workerId: string): Promise<ClaimedJob | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ClaimedJob[]>`
        SELECT "id", "publicationId", "organizationId", "buildingId"
        FROM "DisplayPdfRenderJob"
        WHERE "status" = 'PENDING' AND "nextAttemptAt" <= NOW() AND "attempts" < "maxAttempts"
        ORDER BY "createdAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1`;
      const row = rows[0];
      if (!row) return null;
      await tx.displayPdfRenderJob.update({
        where: { id: row.id },
        data: {
          status: 'PROCESSING',
          claimedBy: workerId,
          claimedAt: new Date(),
          heartbeatAt: new Date(),
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      return row;
    });
  }

  private async process(id: string) {
    const job = await this.prisma.displayPdfRenderJob.findUniqueOrThrow({
      where: { id },
      include: {
        publication: { include: { projectFile: true, location: true } },
      },
    });
    const publication = job.publication;
    const sourceAuthority = publication.projectFile;
    if (
      publication.status !== 'DRAFT' ||
      sourceAuthority.lifecycleState !== 'APPROVED' ||
      sourceAuthority.revokedAt ||
      sourceAuthority.supersededAt ||
      sourceAuthority.sha256 !== job.sourceSha256 ||
      sourceAuthority.version !== job.sourceVersion
    )
      throw new DisplayPdfRejectedError(
        'AUTHORITY_CHANGED',
        "L'autorité documentaire a changé.",
      );
    const source = await this.storage.downloadPrivate(job.sourceStorageKey);
    if (this.hash(source) !== job.sourceSha256)
      throw new DisplayPdfRejectedError(
        'SOURCE_HASH_MISMATCH',
        'Intégrité de la source invalide.',
      );
    const raster = await this.engine.render(
      source,
      job.pageNumber,
      job.targetDpi,
    );
    const rasterSha = this.hash(raster.bytes);
    const rasterKey = `tenant-${job.organizationId}/display-plan-publications/${publication.id}/pdf-raster-${job.id}-${rasterSha}.png`;
    await this.storage.uploadPrivateImmutable(
      raster.bytes,
      rasterKey,
      'image/png',
    );
    const rendered = this.overlay.render({
      source: raster.bytes,
      mimeType: 'image/png',
      youAreHereX: publication.location.youAreHereX!,
      youAreHereY: publication.location.youAreHereY!,
      orientationDegrees: publication.location.orientationDegrees!,
    });
    const variantSha = this.hash(rendered.bytes);
    const variantVersion = publication.variantVersion + 1;
    const variantKey = `tenant-${job.organizationId}/display-plan-publications/${publication.id}/variant-${variantVersion}-${variantSha}.svg`;
    await this.storage.uploadPrivateImmutable(
      rendered.bytes,
      variantKey,
      rendered.mimeType,
    );

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.displayPlanPublication.updateMany({
        where: {
          id: publication.id,
          status: 'DRAFT',
          lockVersion: publication.lockVersion,
          sourceSha256: job.sourceSha256,
        },
        data: {
          variantVersion,
          variantStorageKey: variantKey,
          variantSha256: variantSha,
          variantMimeType: rendered.mimeType,
          widthPixels: raster.width,
          heightPixels: raster.height,
          reviewedById: null,
          reviewedAt: null,
          approvedById: null,
          approvedAt: null,
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new DisplayPdfRejectedError(
          'CONCURRENT_CHANGE',
          'Publication modifiée concurremment.',
        );
      await tx.displayPdfRenderJob.update({
        where: { id },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          heartbeatAt: new Date(),
          engine: raster.engine,
          engineVersion: raster.engineVersion,
          outputStorageKey: rasterKey,
          outputSha256: rasterSha,
          outputMimeType: 'image/png',
          widthPixels: raster.width,
          heightPixels: raster.height,
          renderMetadata: {
            ...raster.parameters,
            pageCount: raster.pageCount,
            variantStorageKey: variantKey,
            variantSha256: variantSha,
          },
        },
      });
    });
  }

  private async fail(id: string, error: unknown) {
    const job = await this.prisma.displayPdfRenderJob.findUniqueOrThrow({
      where: { id },
    });
    const code =
      error instanceof DisplayPdfRejectedError ? error.code : 'WORKER_FAILURE';
    const detail =
      error instanceof Error
        ? error.message.slice(0, 500)
        : 'Erreur worker PDF.';
    const retryable = ![
      'AUTHORITY_CHANGED',
      'SOURCE_HASH_MISMATCH',
      'PDF_ACTIVE_CONTENT',
      'PDF_ENCRYPTED',
      'PDF_INVALID',
    ].includes(code);
    const retry = retryable && job.attempts < job.maxAttempts;
    await this.prisma.displayPdfRenderJob.update({
      where: { id },
      data: {
        status: retry ? 'PENDING' : 'FAILED',
        failureCode: code,
        failureDetail: detail,
        claimedBy: null,
        claimedAt: null,
        heartbeatAt: null,
        nextAttemptAt: retry
          ? new Date(Date.now() + 30_000 * job.attempts)
          : job.nextAttemptAt,
        completedAt: retry ? null : new Date(),
      },
    });
  }

  private hash(bytes: Buffer) {
    return createHash('sha256').update(bytes).digest('hex');
  }
}
