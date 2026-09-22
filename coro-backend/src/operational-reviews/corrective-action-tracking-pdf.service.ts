import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CorrectiveActionPermission, CorrectiveActionTrackingReport, CorrectiveActionTrackingReportStatus, CoroActorType } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ReviewActor } from './operational-reviews.service';
import { CorrectiveActionTrackingReportService, safeTrackingReport } from './corrective-action-tracking-report.service';
import { CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION, CorrectiveActionTrackingReportRenderer, TrackingRenderData } from './corrective-action-tracking-report.renderer';

const LEASE_MS = 2 * 60 * 1000;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

@Injectable()
export class CorrectiveActionTrackingPdfService {
  private readonly renderer = new CorrectiveActionTrackingReportRenderer();
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService,
    private readonly tracking: CorrectiveActionTrackingReportService) {}

  private async accessible(reviewId: string, version: number, actor: ReviewActor) {
    const review = await this.tracking.authorize(reviewId, actor);
    if (!Number.isSafeInteger(version) || version < 1) throw new NotFoundException('Rapport de suivi introuvable');
    const report = await this.prisma.correctiveActionTrackingReport.findFirst({ where: { organizationId: actor.organizationId, operationalReviewId: reviewId, reportVersion: version, reviewVersion: review.version, language: 'FR', format: 'PDF' } });
    if (!report) throw new NotFoundException('Rapport de suivi introuvable');
    const snapshot = report.renderData as unknown as TrackingRenderData;
    if (snapshot.review?.confidentiality !== review.confidentiality || snapshot.review?.reference !== review.reference || snapshot.review?.version !== review.version) throw new ForbiddenException('Confidentialite du rapport incompatible');
    return report;
  }

  private async requireGenerate(actor: ReviewActor) {
    if (!actor.sub) throw new ForbiddenException('Utilisateur client requis');
    const user = await this.prisma.clientUser.findFirst({ where: { id: actor.sub, organizationId: actor.organizationId, isActive: true }, select: { correctiveActionPermissions: true } });
    if (!user?.correctiveActionPermissions.includes(CorrectiveActionPermission.CORRECTIVE_ACTION_REPORT_GENERATE)) throw new ForbiddenException('Permission rapport de suivi requise');
  }

  async materialize(reviewId: string, version: number, actor: ReviewActor) {
    await this.requireGenerate(actor);
    const authorized = await this.accessible(reviewId, version, actor);
    if (authorized.status === CorrectiveActionTrackingReportStatus.FINALIZED) return safeTrackingReport(authorized);
    const now = new Date();
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'tracking-pdf:' + authorized.id}))`;
      const report = await tx.correctiveActionTrackingReport.findFirst({ where: { id: authorized.id, organizationId: actor.organizationId, operationalReviewId: reviewId } });
      if (!report) throw new NotFoundException('Rapport de suivi introuvable');
      if (report.status === CorrectiveActionTrackingReportStatus.FINALIZED) return { report, owner: false };
      if (report.status === CorrectiveActionTrackingReportStatus.GENERATING) {
        if (report.leaseExpiresAt && report.leaseExpiresAt > now) throw new ConflictException('Generation deja en cours. Reessayez plus tard.');
        if (report.generatorVersion !== CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION) throw new ConflictException('Version du generateur indisponible pour cette reprise.');
        const updated = await tx.correctiveActionTrackingReport.update({ where: { id: report.id }, data: { leaseExpiresAt: new Date(now.getTime() + LEASE_MS) } });
        return { report: updated, owner: true };
      }
      if (report.status !== CorrectiveActionTrackingReportStatus.SNAPSHOT_READY) throw new ConflictException('Etat de rapport invalide.');
      const reference = (report.renderData as unknown as TrackingRenderData).review?.reference;
      if (!reference || !/^REX-[A-Za-z0-9-]+$/.test(reference)) throw new ConflictException('Snapshot documentaire incompatible.');
      const filename = `${reference}_Suivi-actions_R${report.reportVersion}_FR.pdf`;
      const updated = await tx.correctiveActionTrackingReport.update({ where: { id: report.id }, data: {
        status: CorrectiveActionTrackingReportStatus.GENERATING,
        snapshotCreatedByType: report.snapshotCreatedByType ?? report.generatedByType,
        snapshotCreatedById: report.snapshotCreatedById ?? report.generatedById,
        generatedByType: CoroActorType.CLIENT_USER, generatedById: actor.sub, generatedAt: now,
        generatorVersion: CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION,
        storageKey: `corrective-action-tracking-reports/${report.organizationId}/${reviewId}/${report.id}/${filename}`,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      } });
      return { report: updated, owner: true };
    });
    if (!reservation.owner) return safeTrackingReport(reservation.report);
    return this.materializeReserved(reservation.report);
  }

  private async materializeReserved(report: CorrectiveActionTrackingReport) {
    if (!report.storageKey || !report.generatedAt || !report.generatorVersion || !report.leaseExpiresAt) throw new ConflictException('Reservation PDF incomplete.');
    const expectedHash = report.reportSha256;
    const expectedSize = report.fileSize;
    if (expectedHash && expectedSize) {
      try {
        const existing = await this.storage.downloadPrivate(report.storageKey);
        if (existing.length !== expectedSize || sha256(existing) !== expectedHash) throw new ConflictException('Objet PDF prive divergent; aucun ecrasement autorise.');
        return this.finalize(report, expectedHash, expectedSize);
      } catch (error: any) {
        if (error instanceof ConflictException) throw error;
        if (error?.message !== 'PRIVATE_OBJECT_NOT_FOUND') throw new ConflictException('Stockage prive indisponible. Reessayez plus tard.');
      }
    }
    let bytes: Buffer;
    try {
      bytes = await this.renderer.render(report.renderData as unknown as TrackingRenderData, {
        reportVersion: report.reportVersion, generatedAt: report.generatedAt.toISOString(), generatorVersion: report.generatorVersion, generatedByType: report.generatedByType,
      });
    } catch {
      throw new ConflictException('Generation PDF indisponible. Le snapshot reste recuperable.');
    }
    if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) throw new BadRequestException('Le rapport depasse la taille maximale autorisee.');
    const hash = sha256(bytes);
    if ((expectedHash && expectedHash !== hash) || (expectedSize && expectedSize !== bytes.length)) throw new ConflictException('Rendu PDF divergent; aucun ecrasement autorise.');
    if (!expectedHash || !expectedSize) {
      const marked = await this.prisma.correctiveActionTrackingReport.updateMany({ where: {
        id: report.id, status: CorrectiveActionTrackingReportStatus.GENERATING, leaseExpiresAt: report.leaseExpiresAt,
        reportSha256: null, fileSize: null,
      }, data: { reportSha256: hash, fileSize: bytes.length } });
      if (marked.count !== 1) throw new ConflictException('Reservation de generation expiree.');
    }
    try { await this.storage.uploadPrivateImmutable(bytes, report.storageKey, 'application/pdf'); }
    catch (error: any) {
      if (error?.message !== 'PRIVATE_OBJECT_ALREADY_EXISTS') throw new ConflictException('Stockage prive indisponible. Reessayez plus tard.');
    }
    let stored: Buffer;
    try { stored = await this.storage.downloadPrivate(report.storageKey); }
    catch { throw new ConflictException('Verification du stockage prive indisponible.'); }
    if (stored.length !== bytes.length || sha256(stored) !== hash) throw new ConflictException('Objet PDF prive divergent; aucun ecrasement autorise.');
    return this.finalize(report, hash, bytes.length);
  }

  private async finalize(report: CorrectiveActionTrackingReport, hash: string, size: number) {
    const result = await this.prisma.correctiveActionTrackingReport.updateMany({ where: {
      id: report.id, status: CorrectiveActionTrackingReportStatus.GENERATING, leaseExpiresAt: report.leaseExpiresAt,
      reportSha256: hash, fileSize: size,
    }, data: { status: CorrectiveActionTrackingReportStatus.FINALIZED, finalizedAt: new Date() } });
    if (result.count !== 1) throw new ConflictException('Generation reprise par un autre operateur.');
    const finalized = await this.prisma.correctiveActionTrackingReport.findUniqueOrThrow({ where: { id: report.id } });
    return safeTrackingReport(finalized);
  }

  async download(reviewId: string, version: number, actor: ReviewActor) {
    const report = await this.accessible(reviewId, version, actor);
    if (report.status !== CorrectiveActionTrackingReportStatus.FINALIZED || !report.storageKey || !report.reportSha256 || !report.fileSize) throw new NotFoundException('Rapport PDF non disponible.');
    let bytes: Buffer;
    try { bytes = await this.storage.downloadPrivate(report.storageKey); }
    catch { throw new ConflictException("Le rapport n'a pas pu etre telecharge en raison d'un probleme d'integrite documentaire."); }
    if (bytes.length !== report.fileSize || sha256(bytes) !== report.reportSha256) throw new ConflictException("Le rapport n'a pas pu etre telecharge en raison d'un probleme d'integrite documentaire.");
    const reference = (report.renderData as unknown as TrackingRenderData).review.reference.replace(/[^A-Za-z0-9-]/g, '');
    return { bytes, filename: `${reference}_Suivi-actions_R${report.reportVersion}_FR.pdf` };
  }
}
