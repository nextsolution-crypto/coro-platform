import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Prisma, type DocumentPdfExport } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { projectAccessWhere, type AdviserActor } from '../auth/project-access';
import { hashReviewSnapshot } from '../approval/document-review-integrity';
import { ExportService, type ExportOptions } from './export.service';

type RequestInput = ExportOptions & { idempotencyKey: string };
type Artifact = {
  language: 'fr' | 'en';
  storageKey: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
};

const LEASE_MS = 2 * 60_000;
const TEMPLATE_VERSION = 'organization-document/v1';
const GENERATOR_VERSION = 'puppeteer-pdf-lib/v1';

@Injectable()
export class DocumentPdfExportService {
  private readonly transactionOptions = { maxWait: 10_000, timeout: 15_000 };

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: ExportService,
    private readonly storage: StorageService,
  ) {}

  async request(projectId: string, input: RequestInput, actor: AdviserActor) {
    const normalized = this.normalize(input);
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${projectId}:${normalized.idempotencyKey}`}, 0))`;
      const authority = await this.resolveAuthority(tx, projectId, actor, true);
      const requestHash = this.hash({
        projectId,
        documentId: authority.review.documentId,
        reviewRequestId: authority.review.id,
        projectVersionId: authority.version.id,
        sourceHash: authority.review.contentHash,
        language: normalized.language,
        selectedModules: normalized.selectedModules,
        moduleOrder: normalized.moduleOrder,
      });
      const existing = await tx.documentPdfExport.findUnique({
        where: {
          projectId_idempotencyKey: {
            projectId,
            idempotencyKey: normalized.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.requestHash !== requestHash)
          throw new ConflictException(
            'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST',
          );
        const leaseExpired =
          existing.status === 'PROCESSING' &&
          (!existing.generationLeaseUntil ||
            existing.generationLeaseUntil.getTime() <= Date.now());
        if (
          existing.status === 'AVAILABLE' ||
          (existing.status === 'PROCESSING' && !leaseExpired)
        )
          return { row: existing, shouldProcess: false };
        return {
          row: await tx.documentPdfExport.update({
            where: { id: existing.id },
            data: {
              status: 'PROCESSING',
              failureCode: null,
              failedAt: null,
              generationStartedAt: new Date(),
              generationLeaseUntil: new Date(Date.now() + LEASE_MS),
            },
          }),
          shouldProcess: true,
        };
      }
      return {
        row: await tx.documentPdfExport.create({
          data: {
            projectId,
            organizationId: actor.organizationId,
            documentId: authority.review.documentId,
            reviewRequestId: authority.review.id,
            projectVersionId: authority.version.id,
            requestedById: actor.userId,
            idempotencyKey: normalized.idempotencyKey,
            requestHash,
            sourceHash: authority.review.contentHash,
            language: normalized.language,
            options: {
              selectedModules: normalized.selectedModules,
              moduleOrder: normalized.moduleOrder,
            },
            templateVersion: TEMPLATE_VERSION,
            generatorVersion: GENERATOR_VERSION,
            generationLeaseUntil: new Date(Date.now() + LEASE_MS),
          },
        }),
        shouldProcess: true,
      };
    }, this.transactionOptions);
    // A rendering/storage failure is a durable FAILED result, not a lost HTTP
    // request.  Returning the persisted state lets the client present an
    // explicit error and invoke the governed retry endpoint with the same
    // export authority and idempotency record.
    if (reservation.shouldProcess)
      await this.process(reservation.row.id).catch(() => undefined);
    return this.get(projectId, reservation.row.id, actor);
  }

  async retry(projectId: string, exportId: string, actor: AdviserActor) {
    const claimed = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`document-pdf:${exportId}`}, 0))`;
      const row = await tx.documentPdfExport.findFirst({
        where: {
          id: exportId,
          projectId,
          organizationId: actor.organizationId,
        },
      });
      if (!row) throw new NotFoundException('Export introuvable');
      await this.assertProjectRead(tx, projectId, actor);
      const leaseExpired =
        row.status === 'PROCESSING' &&
        (!row.generationLeaseUntil ||
          row.generationLeaseUntil.getTime() <= Date.now());
      if (row.status === 'AVAILABLE') return { row, shouldProcess: false };
      if (row.status === 'PROCESSING' && !leaseExpired)
        return { row, shouldProcess: false };
      return {
        row: await tx.documentPdfExport.update({
          where: { id: row.id },
          data: {
            status: 'PROCESSING',
            failureCode: null,
            failedAt: null,
            generationStartedAt: new Date(),
            generationLeaseUntil: new Date(Date.now() + LEASE_MS),
          },
        }),
        shouldProcess: true,
      };
    }, this.transactionOptions);
    if (claimed.shouldProcess)
      await this.process(claimed.row.id).catch(() => undefined);
    return this.get(projectId, exportId, actor);
  }

  async get(projectId: string, exportId: string, actor: AdviserActor) {
    await this.assertProjectRead(this.prisma, projectId, actor);
    const row = await this.prisma.documentPdfExport.findFirst({
      where: { id: exportId, projectId, organizationId: actor.organizationId },
    });
    if (!row) throw new NotFoundException('Export introuvable');
    return this.publicResult(row);
  }

  async download(
    projectId: string,
    exportId: string,
    language: string,
    actor: AdviserActor,
  ) {
    await this.assertProjectRead(this.prisma, projectId, actor);
    const row = await this.prisma.documentPdfExport.findFirst({
      where: {
        id: exportId,
        projectId,
        organizationId: actor.organizationId,
        status: 'AVAILABLE',
      },
    });
    if (!row) throw new NotFoundException('Export disponible introuvable');
    const artifact = this.artifacts(row).find(
      (candidate) => candidate.language === language.toLowerCase(),
    );
    if (!artifact) throw new NotFoundException('Langue exportée introuvable');
    const bytes = await this.storage.downloadPrivate(artifact.storageKey);
    const actual = this.hashBuffer(bytes);
    if (
      bytes.length !== artifact.sizeBytes ||
      !this.safeEqual(actual, artifact.sha256)
    )
      throw new ConflictException('DOCUMENT_PDF_INTEGRITY_INVALID');
    return { bytes, fileName: artifact.fileName, sha256: artifact.sha256 };
  }

  private async process(exportId: string) {
    const row = await this.prisma.documentPdfExport.findUniqueOrThrow({
      where: { id: exportId },
      include: { reviewRequest: true, projectVersion: true },
    });
    try {
      const actor = await this.prisma.user.findUnique({
        where: { id: row.requestedById },
      });
      if (!actor?.isActive) throw new Error('REQUESTER_INACTIVE');
      const authority = await this.resolveAuthority(
        this.prisma,
        row.projectId,
        {
          userId: actor.id,
          organizationId: actor.organizationId,
          role: actor.role,
        },
        true,
      );
      if (
        authority.review.id !== row.reviewRequestId ||
        authority.version.id !== row.projectVersionId ||
        authority.review.contentHash !== row.sourceHash
      )
        throw new Error('APPROVED_SOURCE_CHANGED');
      let artifacts = this.artifacts(row);
      if (artifacts.length) {
        await this.verifyStagedArtifacts(artifacts);
      } else {
        const options = row.options as {
          selectedModules: number[];
          moduleOrder: number[];
        };
        const rendered = await this.renderer.generateApprovedSnapshotPdf(
          authority.review.snapshot,
          {
            ...options,
            language: row.language as 'fr' | 'en' | 'both',
            isPreview: false,
          },
        );
        artifacts = [];
        for (const language of ['fr', 'en'] as const) {
          const bytes = rendered[language];
          if (!bytes) continue;
          const sha256 = this.hashBuffer(bytes);
          const storageKey = `tenant-${this.safeKey(row.organizationId)}/document-pdf-exports/${this.safeKey(row.projectId)}/${this.safeKey(row.id)}/${language}-${sha256}.pdf`;
          await this.storeVerified(bytes, storageKey);
          artifacts.push({
            language,
            storageKey,
            fileName: this.fileName(authority.project, language),
            sizeBytes: bytes.length,
            sha256,
          });
        }
        if (artifacts.length === 0) throw new Error('EMPTY_PDF_RESULT');
        const staged = await this.prisma.documentPdfExport.updateMany({
          where: {
            id: exportId,
            status: 'PROCESSING',
            requestHash: row.requestHash,
          },
          data: { artifacts: artifacts as unknown as Prisma.InputJsonValue },
        });
        if (staged.count !== 1) throw new Error('EXPORT_STAGING_CONFLICT');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`document-pdf:${exportId}`}, 0))`;
        await this.resolveAuthority(
          tx,
          row.projectId,
          {
            userId: actor.id,
            organizationId: actor.organizationId,
            role: actor.role,
          },
          true,
        );
        const updated = await tx.documentPdfExport.updateMany({
          where: {
            id: exportId,
            status: 'PROCESSING',
            requestHash: row.requestHash,
          },
          data: {
            status: 'AVAILABLE',
            artifacts: artifacts as unknown as Prisma.InputJsonValue,
            generatedAt: new Date(),
            generationLeaseUntil: null,
            failureCode: null,
          },
        });
        if (updated.count !== 1) throw new Error('EXPORT_PUBLICATION_CONFLICT');
        await tx.auditLog.create({
          data: {
            action: 'DOCUMENT_PDF_EXPORTED',
            entityType: 'DOCUMENT_PDF_EXPORT',
            entityId: exportId,
            projectId: row.projectId,
            organizationId: row.organizationId,
            userId: row.requestedById,
            description: 'Export PDF approuvé disponible',
            metadata: {
              reviewRequestId: row.reviewRequestId,
              projectVersionId: row.projectVersionId,
              sourceHash: row.sourceHash,
              artifacts: artifacts.map(
                ({ storageKey: _storageKey, ...artifact }) => artifact,
              ),
            },
          },
        });
      }, this.transactionOptions);
    } catch (error) {
      await this.prisma.documentPdfExport
        .updateMany({
          where: { id: exportId, status: 'PROCESSING' },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            generationLeaseUntil: null,
            failureCode: this.failureCode(error),
          },
        })
        .catch(() => undefined);
      throw error;
    }
  }

  private async resolveAuthority(
    tx: Prisma.TransactionClient | PrismaService,
    projectId: string,
    actor: AdviserActor,
    requireMutable: boolean,
  ) {
    const project = await tx.project.findFirst({
      where: {
        id: projectId,
        ...(requireMutable
          ? { isActive: true, status: { in: ['VALIDATED', 'EXPORTED'] } }
          : {}),
        ...projectAccessWhere(actor),
      },
      include: { building: true },
    });
    if (!project) throw new ForbiddenException('PROJECT_NOT_EXPORTABLE');
    const review = await tx.documentReviewRequest.findFirst({
      where: {
        projectId,
        organizationId: actor.organizationId,
        status: 'APPROVED',
        decisionVersion: { not: null },
      },
      orderBy: { decidedAt: 'desc' },
    });
    if (!review?.decisionVersion)
      throw new ConflictException('APPROVED_REVIEW_REQUIRED');
    if (hashReviewSnapshot(review.snapshot) !== review.contentHash)
      throw new ConflictException('APPROVED_SNAPSHOT_INTEGRITY_INVALID');
    const version = await tx.projectVersion.findUnique({
      where: {
        projectId_versionNumber: {
          projectId,
          versionNumber: review.decisionVersion,
        },
      },
    });
    const versionSnapshot = version?.snapshot as any;
    if (
      !version ||
      versionSnapshot?.reviewRequestId !== review.id ||
      versionSnapshot?.contentHash !== review.contentHash
    )
      throw new ConflictException('APPROVED_VERSION_PROVENANCE_INVALID');
    if ((review.snapshot as any)?.schemaVersion !== 2)
      throw new ConflictException('APPROVED_SNAPSHOT_UNSUPPORTED');
    return { project, review, version };
  }

  private async assertProjectRead(
    tx: Prisma.TransactionClient | PrismaService,
    projectId: string,
    actor: AdviserActor,
  ) {
    const project = await tx.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
  }

  private normalize(input: RequestInput) {
    const idempotencyKey = String(input.idempotencyKey || '').trim();
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey))
      throw new ConflictException('IDEMPOTENCY_KEY_INVALID');
    if (!['fr', 'en', 'both'].includes(input.language))
      throw new ConflictException('EXPORT_LANGUAGE_INVALID');
    const selectedModules = [...new Set(input.selectedModules ?? [])].filter(
      (value) => Number.isInteger(value) && value >= 1 && value <= 8,
    );
    const moduleOrder = (input.moduleOrder ?? []).filter((value) =>
      selectedModules.includes(value),
    );
    if (
      !selectedModules.length ||
      moduleOrder.length !== selectedModules.length ||
      new Set(moduleOrder).size !== selectedModules.length
    )
      throw new ConflictException('EXPORT_MODULE_SELECTION_INVALID');
    return {
      idempotencyKey,
      language: input.language,
      selectedModules,
      moduleOrder,
    };
  }

  private publicResult(row: DocumentPdfExport) {
    return {
      id: row.id,
      projectId: row.projectId,
      status: row.status,
      language: row.language,
      sourceHash: row.sourceHash,
      reviewRequestId: row.reviewRequestId,
      projectVersionId: row.projectVersionId,
      templateVersion: row.templateVersion,
      generatorVersion: row.generatorVersion,
      generatedAt: row.generatedAt,
      failureCode: row.failureCode,
      artifacts: this.artifacts(row).map(
        ({ storageKey: _storageKey, ...artifact }) => ({
          ...artifact,
          downloadUrl: `/projects/${row.projectId}/export/requests/${row.id}/download/${artifact.language}`,
        }),
      ),
    };
  }

  private artifacts(row: DocumentPdfExport): Artifact[] {
    return Array.isArray(row.artifacts)
      ? (row.artifacts as unknown as Artifact[])
      : [];
  }
  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
  private hashBuffer(value: Buffer) {
    return createHash('sha256').update(value).digest('hex');
  }
  private safeEqual(left: string, right: string) {
    return (
      left.length === right.length &&
      timingSafeEqual(Buffer.from(left), Buffer.from(right))
    );
  }
  private safeKey(value: string) {
    if (!/^[A-Za-z0-9._-]+$/.test(value))
      throw new Error('INVALID_STORAGE_KEY_PART');
    return value;
  }
  private failureCode(error: unknown) {
    return error instanceof Error
      ? error.message.slice(0, 100)
      : 'UNKNOWN_EXPORT_FAILURE';
  }
  private fileName(project: any, language: 'fr' | 'en') {
    const clean = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return `${clean(project.documentType || 'DOCUMENT')}---${clean(project.building?.name || project.name || 'Projet')}-${project.year}-${language.toUpperCase()}.pdf`;
  }
  private async storeVerified(bytes: Buffer, storageKey: string) {
    try {
      await this.storage.uploadPrivateImmutable(
        bytes,
        storageKey,
        'application/pdf',
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== 'PRIVATE_OBJECT_ALREADY_EXISTS'
      )
        throw error;
      const existing = await this.storage.downloadPrivate(storageKey);
      if (
        existing.length !== bytes.length ||
        !this.safeEqual(this.hashBuffer(existing), this.hashBuffer(bytes))
      )
        throw new Error('PRIVATE_OBJECT_IMMUTABLE_CONFLICT');
    }
  }
  private async verifyStagedArtifacts(artifacts: Artifact[]) {
    for (const artifact of artifacts) {
      const bytes = await this.storage.downloadPrivate(artifact.storageKey);
      if (
        bytes.length !== artifact.sizeBytes ||
        !this.safeEqual(this.hashBuffer(bytes), artifact.sha256)
      )
        throw new Error('STAGED_DOCUMENT_PDF_INTEGRITY_INVALID');
    }
  }
}
