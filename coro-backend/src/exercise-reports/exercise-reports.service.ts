import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExerciseDataSource,
  ExerciseFindingType,
  ExerciseReportStatus,
  ExerciseReportType,
  ExerciseTimelineEntryType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseReportDto } from './dto/create-exercise-report.dto';
import {
  ExerciseActionItemDto,
  ExerciseFindingDto,
  ExerciseParticipantDto,
  ExerciseRecommendationDto,
  ExerciseTimelineEntryDto,
  UpdateExerciseReportDto,
} from './dto/update-exercise-report.dto';

const ELIGIBLE_ACTIVITY_TYPES = new Map<string, ExerciseReportType>([
  ['exercice_table', ExerciseReportType.TABLETOP],
  ['exercice_evacuation', ExerciseReportType.EVACUATION],
]);

const reportInclude = {
  participants: { orderBy: { order: 'asc' as const } },
  timelineEntries: { orderBy: { order: 'asc' as const } },
  findings: { orderBy: { order: 'asc' as const } },
  recommendations: { orderBy: { order: 'asc' as const } },
  actionItems: { orderBy: { order: 'asc' as const } },
  activity: true,
  project: { select: { id: true, name: true } },
  building: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
} satisfies Prisma.ExerciseReportInclude;

interface AuthenticatedUser {
  userId: string;
  organizationId: string;
}

interface ScalarProvenance {
  origin?: string;
  sourceRef?: string;
  humanValidatedById?: string;
  humanValidatedAt?: string;
  humanModified?: boolean;
}

type ReportWithCollections = Prisma.ExerciseReportGetPayload<{
  include: {
    participants: true;
    timelineEntries: true;
    findings: true;
    recommendations: true;
    actionItems: true;
  };
}>;

@Injectable()
export class ExerciseReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromActivity(
    activityId: string,
    dto: CreateExerciseReportDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.prisma.exerciseReport.findFirst({
      where: { activityId, organizationId: user.organizationId },
      include: reportInclude,
    });
    if (existing) return existing;
    if (dto.incidentEventId && dto.evacuationEventId) {
      throw new BadRequestException(
        "CORO ne peut pas prouver que l'incident et l'evacuation appartiennent au meme exercice; liez une seule source operationnelle.",
      );
    }

    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, organizationId: user.organizationId },
      include: {
        booking: true,
        project: {
          include: {
            organization: true,
            client: true,
            building: true,
            user: true,
          },
        },
      },
    });
    if (!activity) throw new NotFoundException('Activite introuvable');
    const reportType = ELIGIBLE_ACTIVITY_TYPES.get(activity.type);
    if (!reportType) {
      throw new BadRequestException(
        'Un rapport est disponible uniquement pour un exercice de table ou evacuation.',
      );
    }

    const bookingId = dto.bookingId ?? activity.bookingId;
    const booking = bookingId
      ? await this.prisma.booking.findFirst({
          where: {
            id: bookingId,
            projectId: activity.projectId,
            organizationId: user.organizationId,
          },
        })
      : activity.booking;
    if (bookingId && !booking) {
      throw new BadRequestException(
        'Reservation incompatible avec cette activite',
      );
    }

    const incident = dto.incidentEventId
      ? await this.prisma.incidentEvent.findFirst({
          where: {
            id: dto.incidentEventId,
            organizationId: user.organizationId,
            buildingId: activity.project.buildingId,
            isExercise: true,
          },
          include: { logs: { orderBy: { timestamp: 'asc' } } },
        })
      : null;
    if (dto.incidentEventId && !incident) {
      throw new BadRequestException(
        'Exercice Sentinelle incompatible avec cette activite',
      );
    }

    const evacuation = dto.evacuationEventId
      ? await this.prisma.evacuationEvent.findFirst({
          where: {
            id: dto.evacuationEventId,
            organizationId: user.organizationId,
            buildingId: activity.project.buildingId,
          },
        })
      : null;
    if (dto.evacuationEventId && !evacuation) {
      throw new BadRequestException(
        'Evenement evacuation incompatible avec cette activite',
      );
    }

    const adviserName =
      `${activity.project.user.firstName} ${activity.project.user.lastName}`.trim();
    const scheduledAt =
      booking?.reportedDate ?? booking?.requestedDate ?? activity.scheduledDate;
    const occurredAt = incident?.triggeredAt ?? evacuation?.triggeredAt ?? null;
    const participants = this.participantsFromIncident(incident?.teamSnapshot);
    const timelineEntries = this.timelineFromSources(incident, evacuation);
    const rex = this.rexContent(incident);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const report = await tx.exerciseReport.create({
            data: {
              organizationId: user.organizationId,
              projectId: activity.projectId,
              activityId: activity.id,
              clientId: activity.project.clientId,
              buildingId: activity.project.buildingId,
              bookingId: booking?.id,
              incidentEventId: incident?.id,
              evacuationEventId: evacuation?.id,
              type: reportType,
              activityLabel: activity.customLabel || activity.label,
              scheduledAt,
              occurredAt,
              startedAt: occurredAt,
              durationMinutes: this.resolveDurationMinutes(
                activity.dureeHeures,
                activity.duration,
                booking?.duration,
              ),
              zones: [],
              mandateName: activity.project.client.name,
              providerName:
                activity.project.user.companyName ||
                activity.project.organization.name,
              adviserName,
              buildingName: activity.project.building.name,
              buildingAddress: [
                activity.project.building.address,
                activity.project.building.city,
                activity.project.building.province,
                activity.project.building.postalCode,
              ]
                .filter(Boolean)
                .join(', '),
              scenario: incident?.description || activity.notes,
              preparedBy: adviserName,
              recipient:
                [
                  activity.project.client.contactFirstName,
                  activity.project.client.contactLastName,
                ]
                  .filter(Boolean)
                  .join(' ') || null,
              createdById: user.userId,
              fieldProvenance: this.initialFieldProvenance(
                incident ? 'INCIDENT' : evacuation ? 'EVACUATION' : null,
              ),
              participants: { create: participants },
              timelineEntries: { create: timelineEntries },
              findings: { create: rex.findings },
            },
          });

          const gap = rex.gapKey
            ? await tx.exerciseFinding.findUnique({
                where: {
                  reportId_key: { reportId: report.id, key: rex.gapKey },
                },
              })
            : null;
          let recommendationId: string | undefined;
          if (gap && incident?.rexRecommendations) {
            const recommendation = await tx.exerciseRecommendation.create({
              data: {
                reportId: report.id,
                findingId: gap.id,
                key: `rex-recommendation-${incident.id}`,
                text: incident.rexRecommendations,
                order: 0,
                source: ExerciseDataSource.REX,
                sourceRef: 'IncidentEvent.rexRecommendations',
              },
            });
            recommendationId = recommendation.id;
          }
          if (gap && incident?.rexCorrectiveActions) {
            await tx.exerciseActionItem.create({
              data: {
                reportId: report.id,
                findingId: gap.id,
                recommendationId,
                key: `rex-action-${incident.id}`,
                title: 'Action corrective issue du REX',
                description: incident.rexCorrectiveActions,
                order: 0,
                source: ExerciseDataSource.REX,
                sourceRef: 'IncidentEvent.rexCorrectiveActions',
              },
            });
          }
          return tx.exerciseReport.findUniqueOrThrow({
            where: { id: report.id },
            include: reportInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.prisma.exerciseReport.findFirst({
          where: { activityId, organizationId: user.organizationId },
          include: reportInclude,
        });
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  async getDraft(id: string, organizationId: string) {
    const report = await this.prisma.exerciseReport.findFirst({
      where: { id, organizationId },
      include: reportInclude,
    });
    if (!report) throw new NotFoundException('Rapport exercice introuvable');
    return report;
  }

  async updateDraft(
    id: string,
    dto: UpdateExerciseReportDto,
    user: AuthenticatedUser,
  ) {
    this.assertUniqueKeys(dto);
    return this.prisma.$transaction(
      async (tx) => {
        const report = await tx.exerciseReport.findFirst({
          where: { id, organizationId: user.organizationId },
          include: {
            participants: true,
            timelineEntries: true,
            findings: true,
            recommendations: true,
            actionItems: true,
          },
        });
        if (!report)
          throw new NotFoundException('Rapport exercice introuvable');

        const scalar = this.scalarUpdate(report, dto, user.userId);
        const claimed = await tx.exerciseReport.updateMany({
          where: {
            id,
            organizationId: user.organizationId,
            status: ExerciseReportStatus.DRAFT,
          },
          data: { ...scalar, updatedAt: new Date() },
        });
        if (claimed.count !== 1) {
          throw new ConflictException(
            'Seul un rapport en brouillon peut etre modifie',
          );
        }

        this.assertDesiredRelationships(report, dto);
        if (dto.participants !== undefined) {
          await this.syncParticipants(
            tx,
            id,
            report.participants,
            dto.participants,
            user.userId,
          );
        }
        if (dto.timelineEntries !== undefined) {
          await this.syncTimeline(
            tx,
            id,
            report.timelineEntries,
            dto.timelineEntries,
            user.userId,
          );
        }

        if (dto.findings !== undefined) {
          await this.upsertFindings(
            tx,
            id,
            report.findings,
            dto.findings,
            user.userId,
          );
        }
        if (dto.recommendations !== undefined) {
          await this.upsertRecommendations(
            tx,
            id,
            report,
            dto.recommendations,
            user.userId,
          );
        }
        if (dto.actionItems !== undefined) {
          await this.syncActions(tx, id, report, dto.actionItems, user.userId);
        }
        if (dto.recommendations !== undefined) {
          await this.deleteMissing(
            tx.exerciseRecommendation,
            id,
            dto.recommendations.map((v) => v.key),
          );
        }
        if (dto.findings !== undefined) {
          await this.deleteMissing(
            tx.exerciseFinding,
            id,
            dto.findings.map((v) => v.key),
          );
        }
        return tx.exerciseReport.findUniqueOrThrow({
          where: { id },
          include: reportInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private assertDesiredRelationships(
    report: ReportWithCollections,
    dto: UpdateExerciseReportDto,
  ) {
    const findingKeys = new Set(
      dto.findings?.map((item) => item.key) ??
        report.findings.map((item) => item.key),
    );
    const findingKeyById = new Map(
      report.findings.map((item) => [item.id, item.key]),
    );
    const desiredRecommendations =
      dto.recommendations?.map((item) => ({
        key: item.key,
        findingKey: item.findingKey,
      })) ??
      report.recommendations.map((item) => ({
        key: item.key,
        findingKey: findingKeyById.get(item.findingId) || '',
      }));
    for (const recommendation of desiredRecommendations) {
      if (!findingKeys.has(recommendation.findingKey)) {
        throw new BadRequestException(
          `La lacune ${recommendation.findingKey} ne peut pas etre supprimee tant qu'une recommandation la reference.`,
        );
      }
    }
    const recommendationKeys = new Set(
      desiredRecommendations.map((item) => item.key),
    );
    const recommendationKeyById = new Map(
      report.recommendations.map((item) => [item.id, item.key]),
    );
    const desiredActions =
      dto.actionItems ??
      report.actionItems.map((item) => ({
        key: item.key,
        findingKey: item.findingId
          ? findingKeyById.get(item.findingId)
          : undefined,
        recommendationKey: item.recommendationId
          ? recommendationKeyById.get(item.recommendationId)
          : undefined,
      }));
    for (const action of desiredActions) {
      if (action.findingKey && !findingKeys.has(action.findingKey)) {
        throw new BadRequestException(
          `La lacune ${action.findingKey} ne peut pas etre supprimee tant qu'une action la reference.`,
        );
      }
      if (
        action.recommendationKey &&
        !recommendationKeys.has(action.recommendationKey)
      ) {
        throw new BadRequestException(
          `La recommandation ${action.recommendationKey} ne peut pas etre supprimee tant qu'une action la reference.`,
        );
      }
    }
  }

  private async syncParticipants(
    tx: Prisma.TransactionClient,
    reportId: string,
    existing: ReportWithCollections['participants'],
    incoming: ExerciseParticipantDto[],
    userId: string,
  ) {
    const byKey = new Map(existing.map((item) => [item.key, item]));
    for (const item of incoming) {
      const previous = byKey.get(item.key);
      const changed = previous
        ? this.changed(previous, item, [
            'name',
            'status',
            'simulatedRole',
            'teamFunction',
            'observations',
            'order',
          ])
        : false;
      await tx.exerciseParticipant.upsert({
        where: { reportId_key: { reportId, key: item.key } },
        update: {
          name: item.name,
          status: item.status,
          simulatedRole: item.simulatedRole,
          teamFunction: item.teamFunction,
          observations: item.observations,
          order: item.order,
          validatedById: userId,
          validatedAt: new Date(),
          isHumanModified: previous?.isHumanModified || changed,
        },
        create: {
          reportId,
          key: item.key,
          name: item.name,
          status: item.status,
          simulatedRole: item.simulatedRole,
          teamFunction: item.teamFunction,
          observations: item.observations,
          order: item.order,
          source: ExerciseDataSource.MANUAL,
          confidence: item.confidence,
          sourceRef: item.sourceRef,
          validatedById: userId,
          validatedAt: new Date(),
        },
      });
    }
    await this.deleteMissing(
      tx.exerciseParticipant,
      reportId,
      incoming.map((v) => v.key),
    );
  }

  private async syncTimeline(
    tx: Prisma.TransactionClient,
    reportId: string,
    existing: ReportWithCollections['timelineEntries'],
    incoming: ExerciseTimelineEntryDto[],
    userId: string,
  ) {
    const byKey = new Map(existing.map((item) => [item.key, item]));
    for (const item of incoming) {
      const previous = byKey.get(item.key);
      const values = {
        occurredAt: this.dateOrNull(item.occurredAt),
        type: item.type,
        event: item.event,
        description: item.description,
        order: item.order,
      };
      const changed = previous
        ? this.changed(previous, values, [
            'occurredAt',
            'type',
            'event',
            'description',
            'order',
          ])
        : false;
      await tx.exerciseTimelineEntry.upsert({
        where: { reportId_key: { reportId, key: item.key } },
        update: {
          ...values,
          validatedById: userId,
          validatedAt: new Date(),
          isHumanModified: previous?.isHumanModified || changed,
        },
        create: {
          reportId,
          key: item.key,
          ...values,
          source: ExerciseDataSource.MANUAL,
          confidence: item.confidence,
          sourceRef: item.sourceRef,
          validatedById: userId,
          validatedAt: new Date(),
        },
      });
    }
    await this.deleteMissing(
      tx.exerciseTimelineEntry,
      reportId,
      incoming.map((v) => v.key),
    );
  }

  private async upsertFindings(
    tx: Prisma.TransactionClient,
    reportId: string,
    existing: ReportWithCollections['findings'],
    incoming: ExerciseFindingDto[],
    userId: string,
  ) {
    const byKey = new Map(existing.map((item) => [item.key, item]));
    for (const item of incoming) {
      const previous = byKey.get(item.key);
      const values = {
        type: item.type,
        title: item.title,
        description: item.description,
        priority: item.priority,
        impact: item.impact,
        order: item.order,
      };
      const changed = previous
        ? this.changed(previous, values, [
            'type',
            'title',
            'description',
            'priority',
            'impact',
            'order',
          ])
        : false;
      await tx.exerciseFinding.upsert({
        where: { reportId_key: { reportId, key: item.key } },
        update: {
          ...values,
          validatedById: userId,
          validatedAt: new Date(),
          isHumanModified: previous?.isHumanModified || changed,
        },
        create: {
          reportId,
          key: item.key,
          ...values,
          source: ExerciseDataSource.MANUAL,
          confidence: item.confidence,
          sourceRef: item.sourceRef,
          validatedById: userId,
          validatedAt: new Date(),
        },
      });
    }
  }

  private async upsertRecommendations(
    tx: Prisma.TransactionClient,
    reportId: string,
    report: ReportWithCollections,
    incoming: ExerciseRecommendationDto[],
    userId: string,
  ) {
    const findings = await tx.exerciseFinding.findMany({ where: { reportId } });
    const findingIds = new Map(findings.map((item) => [item.key, item.id]));
    const byKey = new Map(
      report.recommendations.map((item) => [item.key, item]),
    );
    for (const item of incoming) {
      const findingId = findingIds.get(item.findingKey);
      if (!findingId)
        throw new BadRequestException(`Lacune inconnue: ${item.findingKey}`);
      const previous = byKey.get(item.key);
      const values = {
        findingId,
        text: item.text,
        priority: item.priority,
        order: item.order,
      };
      const changed = previous
        ? this.changed(previous, values, [
            'findingId',
            'text',
            'priority',
            'order',
          ])
        : false;
      await tx.exerciseRecommendation.upsert({
        where: { reportId_key: { reportId, key: item.key } },
        update: {
          ...values,
          validatedById: userId,
          validatedAt: new Date(),
          isHumanModified: previous?.isHumanModified || changed,
        },
        create: {
          reportId,
          key: item.key,
          ...values,
          source: ExerciseDataSource.MANUAL,
          confidence: item.confidence,
          sourceRef: item.sourceRef,
          validatedById: userId,
          validatedAt: new Date(),
        },
      });
    }
  }

  private async syncActions(
    tx: Prisma.TransactionClient,
    reportId: string,
    report: ReportWithCollections,
    incoming: ExerciseActionItemDto[],
    userId: string,
  ) {
    const [findings, recommendations] = await Promise.all([
      tx.exerciseFinding.findMany({ where: { reportId } }),
      tx.exerciseRecommendation.findMany({ where: { reportId } }),
    ]);
    const findingIds = new Map(findings.map((item) => [item.key, item.id]));
    const recommendationIds = new Map(
      recommendations.map((item) => [item.key, item.id]),
    );
    const byKey = new Map(report.actionItems.map((item) => [item.key, item]));
    for (const item of incoming) {
      const findingId = item.findingKey
        ? findingIds.get(item.findingKey)
        : null;
      const recommendationId = item.recommendationKey
        ? recommendationIds.get(item.recommendationKey)
        : null;
      if (item.findingKey && !findingId)
        throw new BadRequestException(`Lacune inconnue: ${item.findingKey}`);
      if (item.recommendationKey && !recommendationId) {
        throw new BadRequestException(
          `Recommandation inconnue: ${item.recommendationKey}`,
        );
      }
      const previous = byKey.get(item.key);
      const values = {
        findingId,
        recommendationId,
        title: item.title,
        description: item.description,
        assignedTo: item.assignedTo,
        dueDate: this.dateOrNull(item.dueDate),
        priority: item.priority,
        order: item.order,
      };
      const changed = previous
        ? this.changed(previous, values, [
            'findingId',
            'recommendationId',
            'title',
            'description',
            'assignedTo',
            'dueDate',
            'priority',
            'order',
          ])
        : false;
      await tx.exerciseActionItem.upsert({
        where: { reportId_key: { reportId, key: item.key } },
        update: {
          ...values,
          validatedById: userId,
          validatedAt: new Date(),
          isHumanModified: previous?.isHumanModified || changed,
        },
        create: {
          reportId,
          key: item.key,
          ...values,
          source: ExerciseDataSource.MANUAL,
          confidence: item.confidence,
          sourceRef: item.sourceRef,
          validatedById: userId,
          validatedAt: new Date(),
        },
      });
    }
    await this.deleteMissing(
      tx.exerciseActionItem,
      reportId,
      incoming.map((v) => v.key),
    );
  }

  private async deleteMissing(
    delegate: { deleteMany(args: object): Promise<unknown> },
    reportId: string,
    keys: string[],
  ) {
    await delegate.deleteMany({
      where: keys.length ? { reportId, key: { notIn: keys } } : { reportId },
    });
  }

  private assertUniqueKeys(dto: UpdateExerciseReportDto) {
    for (const [name, values] of Object.entries({
      participants: dto.participants,
      timelineEntries: dto.timelineEntries,
      findings: dto.findings,
      recommendations: dto.recommendations,
      actionItems: dto.actionItems,
    })) {
      if (!values) continue;
      const keys = values.map((item) => item.key);
      if (new Set(keys).size !== keys.length) {
        throw new BadRequestException(
          `La collection ${name} contient des key dupliquees.`,
        );
      }
    }
  }

  private scalarUpdate(
    report: ReportWithCollections,
    dto: UpdateExerciseReportDto,
    userId: string,
  ) {
    const data: Prisma.ExerciseReportUpdateManyMutationInput = {};
    const provenance = this.readProvenance(report.fieldProvenance);
    const fields = [
      'scheduledAt',
      'occurredAt',
      'startedAt',
      'durationMinutes',
      'zones',
      'level',
      'difficulty',
      'scenario',
      'positiveIntro',
      'globalRating',
      'summaryTitle',
      'conclusion',
      'preparedBy',
      'recipient',
      'conclusionDate',
    ] as const;
    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(dto, field)) continue;
      const raw = dto[field];
      const value = [
        'scheduledAt',
        'occurredAt',
        'startedAt',
        'conclusionDate',
      ].includes(field)
        ? this.dateOrNull(raw as string | null | undefined)
        : raw;
      (data as Record<string, unknown>)[field] = value;
      const current = (report as unknown as Record<string, unknown>)[field];
      const previous = provenance[field];
      provenance[field] = {
        origin:
          typeof previous === 'string'
            ? previous
            : previous?.origin || 'MANUAL',
        sourceRef:
          typeof previous === 'object' ? previous.sourceRef : undefined,
        humanValidatedById: userId,
        humanValidatedAt: new Date().toISOString(),
        humanModified:
          typeof previous === 'object' && previous.humanModified
            ? true
            : this.valueChanged(current, value),
      };
    }
    data.fieldProvenance = provenance as Prisma.InputJsonValue;
    return data;
  }

  private initialFieldProvenance(
    operationalSource: 'INCIDENT' | 'EVACUATION' | null,
  ): Prisma.InputJsonValue {
    const coro = { origin: 'CORO' };
    const operationalRef =
      operationalSource === 'INCIDENT'
        ? 'IncidentEvent.triggeredAt'
        : 'EvacuationEvent.triggeredAt';
    return {
      activityLabel: coro,
      scheduledAt: coro,
      durationMinutes: coro,
      mandateName: coro,
      providerName: coro,
      adviserName: coro,
      buildingName: coro,
      buildingAddress: coro,
      scenario:
        operationalSource === 'INCIDENT'
          ? { origin: 'SENTINELLE', sourceRef: 'IncidentEvent.description' }
          : coro,
      occurredAt: operationalSource
        ? { origin: 'SENTINELLE', sourceRef: operationalRef }
        : { origin: 'MANUAL' },
      startedAt: operationalSource
        ? { origin: 'SENTINELLE', sourceRef: operationalRef }
        : { origin: 'MANUAL' },
      preparedBy: coro,
      recipient: coro,
    };
  }

  private readProvenance(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return {} as Record<string, ScalarProvenance | string>;
    return { ...(value as Prisma.JsonObject) } as Record<
      string,
      ScalarProvenance | string
    >;
  }

  private changed(left: object, right: object, fields: string[]) {
    return fields.some((field) =>
      this.valueChanged(
        (left as Record<string, unknown>)[field],
        (right as Record<string, unknown>)[field],
      ),
    );
  }

  private valueChanged(left: unknown, right: unknown) {
    const normalize = (value: unknown) =>
      value instanceof Date ? value.toISOString() : (value ?? null);
    return JSON.stringify(normalize(left)) !== JSON.stringify(normalize(right));
  }

  private dateOrNull(value: string | null | undefined) {
    return value ? new Date(value) : null;
  }

  private resolveDurationMinutes(
    hours: number | null,
    duration: string,
    bookingMinutes?: number | null,
  ) {
    if (bookingMinutes != null) return bookingMinutes;
    if (hours != null) return Math.round(hours * 60);
    const match = duration.match(/(?:(\d+)\s*h)?\s*(\d{1,2})?/i);
    if (!match || (!match[1] && !match[2])) return null;
    return Number(match[1] || 0) * 60 + Number(match[2] || 0);
  }

  private participantsFromIncident(snapshot: Prisma.JsonValue | undefined) {
    if (!Array.isArray(snapshot)) return [];
    return snapshot.flatMap((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return [];
      const member = value as Prisma.JsonObject;
      const roles = Array.isArray(member.roles) ? member.roles : [];
      const roleNames = roles.flatMap((role) =>
        role &&
        typeof role === 'object' &&
        !Array.isArray(role) &&
        typeof role.role === 'string'
          ? [role.role]
          : [],
      );
      const firstName =
        typeof member.firstName === 'string' ? member.firstName : '';
      const lastName =
        typeof member.lastName === 'string' ? member.lastName : '';
      return [
        {
          key: `sentinelle-team-${String(member.id || index)}`,
          name: `${firstName} ${lastName}`.trim() || `Participant ${index + 1}`,
          status: 'PRESENT',
          teamFunction: roleNames.join(', ') || null,
          order: index,
          source: ExerciseDataSource.SENTINELLE,
          sourceRef: 'IncidentEvent.teamSnapshot',
        },
      ];
    });
  }

  private timelineFromSources(
    incident: {
      logs: Array<{
        id: string;
        timestamp: Date;
        action: string;
        details: string | null;
      }>;
    } | null,
    evacuation: {
      id: string;
      triggeredAt: Date;
      resolvedAt: Date | null;
      notes: string | null;
    } | null,
  ) {
    if (incident)
      return incident.logs.map((log, index) => ({
        key: `incident-log-${log.id}`,
        occurredAt: log.timestamp,
        type:
          index === 0
            ? ExerciseTimelineEntryType.INPUT
            : ExerciseTimelineEntryType.RESPONSE,
        event: log.action,
        description: log.details,
        order: index,
        source: ExerciseDataSource.SENTINELLE,
        sourceRef: `IncidentLog:${log.id}`,
      }));
    if (!evacuation) return [];
    const entries: Array<{
      key: string;
      occurredAt: Date;
      type: ExerciseTimelineEntryType;
      event: string;
      description: string | null;
      order: number;
      source: ExerciseDataSource;
      sourceRef: string;
    }> = [
      {
        key: `evacuation-start-${evacuation.id}`,
        occurredAt: evacuation.triggeredAt,
        type: ExerciseTimelineEntryType.INPUT,
        event: 'Debut de evacuation',
        description: evacuation.notes,
        order: 0,
        source: ExerciseDataSource.SENTINELLE,
        sourceRef: `EvacuationEvent:${evacuation.id}`,
      },
    ];
    if (evacuation.resolvedAt)
      entries.push({
        key: `evacuation-end-${evacuation.id}`,
        occurredAt: evacuation.resolvedAt,
        type: ExerciseTimelineEntryType.RESPONSE,
        event: 'Fin de evacuation',
        description: evacuation.notes,
        order: 1,
        source: ExerciseDataSource.SENTINELLE,
        sourceRef: `EvacuationEvent:${evacuation.id}`,
      });
    return entries;
  }

  private rexContent(
    incident: {
      id: string;
      rexWentWell: string | null;
      rexToImprove: string | null;
    } | null,
  ) {
    if (!incident) return { findings: [], gapKey: null };
    const gapKey = incident.rexToImprove ? `rex-gap-${incident.id}` : null;
    const findings: Prisma.ExerciseFindingCreateWithoutReportInput[] = [];
    if (incident.rexWentWell)
      findings.push({
        key: `rex-positive-${incident.id}`,
        type: ExerciseFindingType.POSITIVE,
        description: incident.rexWentWell,
        order: 0,
        source: ExerciseDataSource.REX,
        sourceRef: 'IncidentEvent.rexWentWell',
      });
    if (incident.rexToImprove)
      findings.push({
        key: gapKey!,
        type: ExerciseFindingType.GAP,
        description: incident.rexToImprove,
        order: 1,
        source: ExerciseDataSource.REX,
        sourceRef: 'IncidentEvent.rexToImprove',
      });
    return { findings, gapKey };
  }
}
