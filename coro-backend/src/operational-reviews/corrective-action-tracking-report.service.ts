import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CoroActorType, CorrectiveActionPermission, OperationalReviewStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OperationalReviewsService, ReviewActor } from './operational-reviews.service';

const iso = (value: Date | null) => value?.toISOString() ?? null;

@Injectable()
export class CorrectiveActionTrackingReportService {
  constructor(private readonly prisma: PrismaService, private readonly reviews: OperationalReviewsService) {}

  private safe(record: { id: string; reportVersion: number; snapshotAt: Date; status: string; createdAt: Date; renderData: Prisma.JsonValue }) {
    const data = record.renderData as { actions?: unknown[] };
    return { id: record.id, reportVersion: record.reportVersion, snapshotAt: record.snapshotAt, status: record.status, actionCount: data.actions?.length ?? 0, createdAt: record.createdAt };
  }

  private async authorize(reviewId: string, actor: ReviewActor) {
    if (!actor.sub) throw new ForbiddenException('Utilisateur client requis');
    const review = await this.reviews.authorizeReport(reviewId, actor);
    if (review.status !== OperationalReviewStatus.FINALIZED) throw new BadRequestException('REX finalise requis');
    return review;
  }

  async list(reviewId: string, actor: ReviewActor) {
    await this.authorize(reviewId, actor);
    const reports = await this.prisma.correctiveActionTrackingReport.findMany({ where: { organizationId: actor.organizationId, operationalReviewId: reviewId }, orderBy: { reportVersion: 'desc' } });
    return reports.map((report) => this.safe(report));
  }

  async get(reviewId: string, version: number, actor: ReviewActor) {
    await this.authorize(reviewId, actor);
    if (!Number.isSafeInteger(version) || version < 1) throw new NotFoundException('Rapport introuvable');
    const report = await this.prisma.correctiveActionTrackingReport.findFirst({ where: { organizationId: actor.organizationId, operationalReviewId: reviewId, reportVersion: version } });
    if (!report) throw new NotFoundException('Rapport introuvable');
    return this.safe(report);
  }

  async create(reviewId: string, clientIntentId: string, actor: ReviewActor) {
    if (!actor.sub || !clientIntentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientIntentId)) throw new BadRequestException('Intention UUID requise');
    const user = await this.prisma.clientUser.findFirst({ where: { id: actor.sub, organizationId: actor.organizationId, isActive: true }, select: { correctiveActionPermissions: true } });
    if (!user?.correctiveActionPermissions.includes(CorrectiveActionPermission.CORRECTIVE_ACTION_REPORT_GENERATE)) throw new ForbiddenException('Permission rapport de suivi requise');
    await this.authorize(reviewId, actor);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const report = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'corrective-tracking:' + reviewId}))`;
          const replay = await tx.correctiveActionTrackingReport.findUnique({ where: { organizationId_clientIntentId: { organizationId: actor.organizationId, clientIntentId } } });
          if (replay) {
            if (replay.operationalReviewId !== reviewId) throw new ConflictException('Intention deja utilisee pour un autre REX');
            return replay;
          }
          const review = await tx.operationalReview.findFirst({ where: { id: reviewId, organizationId: actor.organizationId, status: OperationalReviewStatus.FINALIZED }, select: {
            reference: true, version: true, title: true, confidentiality: true, finalizedAt: true,
            populationOperationalEventId: true, incidentEventId: true, exerciseReportId: true,
            recommendations: { select: { id: true, displayOrder: true, title: true, status: true, reviewFinding: { select: { displayOrder: true, title: true } } } },
          } });
          if (!review) throw new ConflictException('REX finalise introuvable');
          const recommendations = new Map(review.recommendations.map((item) => [item.id, item]));
          const actions = await tx.correctiveAction.findMany({ where: { organizationId: actor.organizationId, reviewRecommendationId: { in: [...recommendations.keys()] } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: {
            reviewRecommendationId: true, reference: true, title: true, description: true, priority: true, status: true, visibility: true,
            assigneeType: true, assigneeDisplayNameSnapshot: true, dueDate: true, createdAt: true, completedAt: true, verifiedAt: true, closedAt: true,
            completionComment: true, closureComment: true,
            evidence: { where: { status: { in: ['ACTIVE', 'WITHDRAWN'] } }, orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }], select: { status: true, type: true, title: true, submittedAt: true, fileSize: true, sha256: true } },
            verifications: { orderBy: { attemptNumber: 'asc' }, select: { attemptNumber: true, verdict: true, comment: true, verifiedAt: true, verifiedByType: true } },
          } });
          if (actions.some((action) => action.visibility !== review.confidentiality)) throw new ForbiddenException('Visibilite des actions incompatible avec le REX');
          const snapshotAt = new Date();
          const renderData = {
            schemaVersion: 1, snapshotAt: snapshotAt.toISOString(),
            review: { reference: review.reference, version: review.version, title: review.title, confidentiality: review.confidentiality, finalizedAt: iso(review.finalizedAt), sourceType: review.populationOperationalEventId ? 'POPULATION' : review.incidentEventId ? 'INCIDENT' : 'EXERCISE' },
            actions: actions.map((action) => {
              const source = recommendations.get(action.reviewRecommendationId!);
              return {
                reference: action.reference, title: action.title, description: action.description, priority: action.priority, status: action.status,
                source: { findingDisplayOrder: source?.reviewFinding.displayOrder ?? null, findingTitle: source?.reviewFinding.title ?? null, recommendationDisplayOrder: source?.displayOrder ?? null, recommendationTitle: source?.title ?? null, recommendationDecision: source?.status ?? null },
                assigneeType: action.assigneeType, assigneeDisplayName: action.assigneeDisplayNameSnapshot,
                dueDate: iso(action.dueDate), createdAt: action.createdAt.toISOString(), completedAt: iso(action.completedAt), verifiedAt: iso(action.verifiedAt), closedAt: iso(action.closedAt),
                completionComment: action.completionComment, closureComment: action.closureComment,
                withdrawnEvidenceCount: action.evidence.filter((item) => item.status === 'WITHDRAWN').length,
                evidence: action.evidence.filter((item) => item.status === 'ACTIVE').map((item) => ({ type: item.type, title: item.title, submittedAt: item.submittedAt.toISOString(), fileSize: item.fileSize, sha256: item.sha256 })),
                verifications: action.verifications.map((item) => ({ attemptNumber: item.attemptNumber, verdict: item.verdict, comment: item.comment, verifiedAt: item.verifiedAt.toISOString(), actorType: item.verifiedByType })),
              };
            }),
          };
          const latest = await tx.correctiveActionTrackingReport.aggregate({ where: { operationalReviewId: reviewId, reviewVersion: review.version, language: 'FR', format: 'PDF' }, _max: { reportVersion: true } });
          return tx.correctiveActionTrackingReport.create({ data: {
            organizationId: actor.organizationId, operationalReviewId: reviewId, reviewVersion: review.version, reportVersion: (latest._max.reportVersion ?? 0) + 1,
            clientIntentId, snapshotAt, generatedByType: CoroActorType.CLIENT_USER, generatedById: actor.sub, renderData,
          } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
        return this.safe(report);
      } catch (error: any) {
        if (error?.code === 'P2034' || error?.code === 'P2002') continue;
        throw error;
      }
    }
    throw new ConflictException('Capture concurrente. Reessayez avec la meme intention.');
  }
}
