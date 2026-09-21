import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CoroActorType, OperationalReviewReportStatus, OperationalReviewStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OperationalReviewsService, ReviewActor } from './operational-reviews.service';
import { OperationalReviewReportData, OperationalReviewReportRenderer, OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION } from './operational-review-report.renderer';

const LEASE_MS = 2 * 60 * 1000;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const iso = (value: Date | null) => value?.toISOString() ?? null;

@Injectable()
export class OperationalReviewReportService {
  private readonly renderer = new OperationalReviewReportRenderer();
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly reviews: OperationalReviewsService) {}

  private publicRecord(report: any, reference: string) {
    return {
      id: report.id, reference, reviewVersion: report.reviewVersion, reportVersion: report.reportVersion,
      format: report.format, language: report.language, status: report.status, generatedAt: report.generatedAt,
      generatorVersion: report.generatorVersion, fileSize: report.fileSize, reportSha256: report.reportSha256,
      finalizedAt: report.finalizedAt,
    };
  }

  async get(reviewId: string, actor: ReviewActor) {
    const review = await this.reviews.authorizeReport(reviewId, actor);
    const report = await this.prisma.operationalReviewReport.findFirst({
      where: { operationalReviewId: reviewId, organizationId: actor.organizationId, reviewVersion: review.version, reportVersion: 1, language: 'FR', format: 'PDF' },
    });
    return report ? this.publicRecord(report, review.reference) : null;
  }

  async generate(reviewId: string, actor: ReviewActor) {
    const authorized = await this.reviews.authorizeReport(reviewId, actor, true);
    if (authorized.status !== OperationalReviewStatus.FINALIZED) throw new BadRequestException('Un REX finalisé est requis pour générer son rapport.');
    const now = new Date();
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'rex-report:' + reviewId + ':' + authorized.version + ':FR:PDF'}))`;
      const review = await tx.operationalReview.findFirst({
        where: { id: reviewId, organizationId: actor.organizationId, status: OperationalReviewStatus.FINALIZED },
        select: { id: true, version: true, reference: true },
      });
      if (!review || review.version !== authorized.version) throw new ConflictException('Le REX finalisé a changé. Actualisez la page.');
      let report = await tx.operationalReviewReport.findFirst({ where: {
        operationalReviewId: reviewId, reviewVersion: review.version, reportVersion: 1, language: 'FR', format: 'PDF',
      } });
      if (report?.status === OperationalReviewReportStatus.FINALIZED) return { report, reference: review.reference, owner: false };
      if (report && report.leaseExpiresAt > now) return { report, reference: review.reference, owner: false };
      if (report) {
        report = await tx.operationalReviewReport.update({ where: { id: report.id }, data: { leaseExpiresAt: new Date(now.getTime() + LEASE_MS) } });
        return { report, reference: review.reference, owner: true };
      }
      const data = await this.loadHistoricalReviewReportData(tx, reviewId, actor.organizationId, now);
      const id = randomUUID();
      const filename = `${review.reference.replace(/[^A-Za-z0-9-]/g, '')}_v${review.version}_FR.pdf`;
      report = await tx.operationalReviewReport.create({ data: {
        id, organizationId: actor.organizationId, operationalReviewId: reviewId, reviewVersion: review.version,
        reportVersion: 1, format: 'PDF', language: 'FR', status: OperationalReviewReportStatus.GENERATING,
        generatedAt: now, generatedByType: CoroActorType.CLIENT_USER, generatedById: actor.sub,
        generatorVersion: OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION,
        storageKey: `operational-review-reports/${actor.organizationId}/${reviewId}/${id}/${filename}`,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS), renderData: data as unknown as Prisma.InputJsonValue,
      } });
      return { report, reference: review.reference, owner: true };
    });
    if (reservation.report.status === OperationalReviewReportStatus.FINALIZED) return this.publicRecord(reservation.report, reservation.reference);
    if (!reservation.owner) throw new ConflictException('Génération du rapport déjà en cours. Réessayez plus tard.');
    return this.materialize(reservation.report, reservation.reference);
  }

  private async loadHistoricalReviewReportData(tx: Prisma.TransactionClient, reviewId: string, organizationId: string, generatedAt: Date): Promise<OperationalReviewReportData> {
    const review = await tx.operationalReview.findFirst({
      where: { id: reviewId, organizationId, status: OperationalReviewStatus.FINALIZED },
      select: {
        reference: true, version: true, title: true, summary: true, confidentiality: true,
        organizationId: true, buildingId: true, populationOperationalEventId: true, incidentEventId: true, exerciseReportId: true,
        createdAt: true, submittedAt: true, finalizedAt: true,
        createdByType: true, submittedByType: true, finalizedByType: true,
        populationEvidenceRecord: { select: { reference: true, version: true } },
        findings: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], select: {
          category: true, title: true, description: true, severity: true, impact: true, status: true,
          recommendations: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], select: {
            title: true, description: true, rationale: true, priority: true, status: true, decisionComment: true, decidedAt: true,
          } },
        } },
      },
    });
    if (!review?.finalizedAt) throw new ConflictException('REX finalisé incomplet.');
    const [organization, building] = await Promise.all([
      tx.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
      review.buildingId ? tx.building.findUnique({ where: { id: review.buildingId }, select: { name: true } }) : null,
    ]);
    return {
      reference: review.reference, reviewVersion: review.version, title: review.title, summary: review.summary,
      confidentiality: review.confidentiality,
      sourceType: review.populationOperationalEventId ? 'POPULATION' : review.incidentEventId ? 'INCIDENT' : 'EXERCISE',
      evidenceReference: review.populationEvidenceRecord?.reference ?? null,
      evidenceVersion: review.populationEvidenceRecord?.version ?? null,
      organizationNameAtGeneration: organization?.name ?? null, buildingNameAtGeneration: building?.name ?? null,
      createdAt: review.createdAt.toISOString(), submittedAt: iso(review.submittedAt), finalizedAt: review.finalizedAt.toISOString(),
      createdByType: review.createdByType, submittedByType: review.submittedByType, finalizedByType: review.finalizedByType ?? 'SYSTEM',
      generatedAt: generatedAt.toISOString(), generatedByType: CoroActorType.CLIENT_USER,
      findings: review.findings.map((finding) => ({
        category: finding.category, title: finding.title, description: finding.description, severity: finding.severity,
        impact: finding.impact, status: finding.status,
        recommendations: finding.recommendations.map((recommendation) => ({ ...recommendation, decidedAt: iso(recommendation.decidedAt) })),
      })),
    };
  }

  private async materialize(report: any, reference: string) {
    const verifyStored = async (expectedHash: string, expectedSize: number) => {
      const stored = await this.storage.downloadPrivate(report.storageKey);
      if (stored.length !== expectedSize || sha256(stored) !== expectedHash) throw new ConflictException('Objet PDF privé divergent; aucun écrasement autorisé.');
      return stored;
    };
    if (report.reportSha256 && report.fileSize) {
      try {
        await verifyStored(report.reportSha256, report.fileSize);
        return this.finalize(report, reference, report.reportSha256, report.fileSize);
      } catch (error: any) {
        if (error?.message !== 'PRIVATE_OBJECT_NOT_FOUND') {
          if (error instanceof ConflictException) throw error;
          throw new ConflictException('Stockage privé du rapport indisponible. Réessayez plus tard.');
        }
      }
    }
    const bytes = await this.renderer.render(report.renderData as OperationalReviewReportData);
    if (bytes.length > MAX_PDF_BYTES) throw new BadRequestException('Le rapport dépasse la taille maximale autorisée.');
    const hash = sha256(bytes);
    const marked = await this.prisma.operationalReviewReport.updateMany({
      where: { id: report.id, status: OperationalReviewReportStatus.GENERATING, leaseExpiresAt: report.leaseExpiresAt },
      data: { reportSha256: hash, fileSize: bytes.length },
    });
    if (marked.count !== 1) throw new ConflictException('Réservation du rapport expirée. Relancez la génération.');
    try { await this.storage.uploadPrivateImmutable(bytes, report.storageKey, 'application/pdf'); }
    catch (error: any) {
      if (error?.message !== 'PRIVATE_OBJECT_ALREADY_EXISTS') throw new ConflictException('Stockage privé du rapport indisponible. Réessayez plus tard.');
      try { await verifyStored(hash, bytes.length); }
      catch { throw new ConflictException('Objet PDF privé divergent; aucun écrasement autorisé.'); }
    }
    return this.finalize(report, reference, hash, bytes.length);
  }

  private async finalize(report: any, reference: string, hash: string, size: number) {
    const result = await this.prisma.operationalReviewReport.updateMany({
      where: { id: report.id, status: OperationalReviewReportStatus.GENERATING, leaseExpiresAt: report.leaseExpiresAt, reportSha256: hash, fileSize: size },
      data: { status: OperationalReviewReportStatus.FINALIZED, finalizedAt: new Date() },
    });
    if (result.count !== 1) throw new ConflictException('Génération reprise par un autre opérateur. Actualisez le rapport.');
    const finalized = await this.prisma.operationalReviewReport.findUniqueOrThrow({ where: { id: report.id } });
    return this.publicRecord(finalized, reference);
  }

  async download(reviewId: string, actor: ReviewActor) {
    const review = await this.reviews.authorizeReport(reviewId, actor);
    const report = await this.prisma.operationalReviewReport.findFirst({ where: {
      operationalReviewId: reviewId, organizationId: actor.organizationId, reviewVersion: review.version,
      reportVersion: 1, language: 'FR', format: 'PDF', status: OperationalReviewReportStatus.FINALIZED,
    } });
    if (!report?.reportSha256 || !report.fileSize) throw new NotFoundException('Rapport REX finalisé introuvable.');
    let bytes: Buffer;
    try { bytes = await this.storage.downloadPrivate(report.storageKey); }
    catch { throw new ConflictException('Rapport privé temporairement indisponible.'); }
    if (bytes.length !== report.fileSize || sha256(bytes) !== report.reportSha256) throw new ConflictException('Intégrité du rapport PDF invalide.');
    const safeReference = review.reference.replace(/[^A-Za-z0-9-]/g, '');
    return { bytes, filename: `${safeReference}_v${report.reviewVersion}_FR.pdf` };
  }
}
