import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { projectAccessWhere } from '../auth/project-access';
import type { WorkManagementActor } from '../auth/work-management-access';
import { OPEN_BOOKING_STATUSES } from '../bookings/booking-status';
import { ActivityTaskListsService } from '../activities/activity-task-lists.service';
import { MandateServicesService } from './mandate-services.service';
import { MandateOperationsPreviewService } from './mandate-operations-preview.service';
import {
  ApplyMandateOperationsDto,
  MandateOperationDecisionAction,
} from './mandate-operations-apply.dto';

type Decision = ApplyMandateOperationsDto['decisions'][number];
type AppliedItem = {
  mandateServiceId: string;
  action: MandateOperationDecisionAction;
  activityId: string;
  created: boolean;
  sourceActivityId: string | null;
};
type StoredResult = { applied: AppliedItem[] };

function canonicalDecision(decision: Decision) {
  return {
    mandateServiceId: decision.mandateServiceId,
    action: decision.action,
    activityId: decision.activityId ?? null,
  };
}

export function mandateApplyPayloadHash(
  projectId: string,
  dto: ApplyMandateOperationsDto,
) {
  const decisions = dto.decisions
    .map(canonicalDecision)
    .sort(
      (a, b) =>
        a.mandateServiceId.localeCompare(b.mandateServiceId) ||
        a.action.localeCompare(b.action) ||
        (a.activityId ?? '').localeCompare(b.activityId ?? ''),
    );
  return createHash('sha256')
    .update(
      JSON.stringify({
        projectId,
        expectedRevision: dto.expectedRevision,
        decisions,
      }),
    )
    .digest('hex');
}

export function assertDistinctMandateDecisions(decisions: Decision[]) {
  const services = decisions.map((item) => item.mandateServiceId);
  if (new Set(services).size !== services.length) {
    throw new BadRequestException(
      'Une seule décision est permise par service commercial',
    );
  }
  const activities = decisions
    .filter((item) => item.activityId)
    .map((item) => item.activityId!);
  if (new Set(activities).size !== activities.length) {
    throw new BadRequestException(
      'Une même activité ne peut pas être adoptée ou remplacée deux fois',
    );
  }
  for (const decision of decisions) {
    const requiresActivity =
      decision.action !== MandateOperationDecisionAction.CREATE_ACTIVITY;
    if (requiresActivity !== Boolean(decision.activityId)) {
      throw new BadRequestException(
        requiresActivity
          ? 'activityId est requis pour cette décision'
          : 'activityId est interdit pour CREATE_ACTIVITY',
      );
    }
  }
}

export function assertReplacementIdentity(
  newActivityId: string,
  sourceActivityId: string,
) {
  if (newActivityId === sourceActivityId)
    throw new ConflictException(
      'Une activité ne peut pas se remplacer elle-même',
    );
}

@Injectable()
export class MandateOperationsApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commercial: MandateServicesService,
    private readonly previewService: MandateOperationsPreviewService,
    private readonly activityTaskLists: ActivityTaskListsService,
  ) {}

  async apply(
    projectId: string,
    actor: WorkManagementActor,
    dto: ApplyMandateOperationsDto,
  ) {
    assertDistinctMandateDecisions(dto.decisions);
    const payloadHash = mandateApplyPayloadHash(projectId, dto);
    try {
      return await this.prisma.$transaction(
        (tx) => this.applyTransaction(tx, projectId, actor, dto, payloadHash),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.replayAfterUniqueRace(projectId, actor, dto, payloadHash);
      }
      throw error;
    }
  }

  private async applyTransaction(
    tx: Prisma.TransactionClient,
    projectId: string,
    actor: WorkManagementActor,
    dto: ApplyMandateOperationsDto,
    payloadHash: string,
  ) {
    const project = await tx.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: {
        id: true,
        organizationId: true,
        documentType: true,
        mandate: { select: { id: true } },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (!project.mandate)
      throw new BadRequestException("Enregistrez d'abord la fiche du Mandat");
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ProjectMandate"
      WHERE "id" = ${project.mandate.id} AND "projectId" = ${project.id}
        AND "organizationId" = ${project.organizationId} FOR UPDATE`);

    const existing = await tx.mandateServiceOperation.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: project.organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (existing)
      return this.replay(
        tx,
        projectId,
        actor,
        existing.payloadHash,
        payloadHash,
        existing.commercialRevision,
        dto.idempotencyKey,
        existing.result as StoredResult,
      );

    const preview = await this.previewService.previewInTransaction(
      tx,
      projectId,
      actor,
      dto.expectedRevision,
    );
    const operationByService = new Map(
      preview.operations.map((item) => [item.serviceId, item]),
    );
    const services = await tx.projectMandateService.findMany({
      where: {
        projectMandateId: project.mandate.id,
        projectId,
        organizationId: project.organizationId,
        id: { in: dto.decisions.map((item) => item.mandateServiceId) },
      },
      include: { activityType: true },
    });
    if (services.length !== dto.decisions.length)
      throw new BadRequestException('Service commercial introuvable');
    const serviceById = new Map(services.map((item) => [item.id, item]));
    const applied: AppliedItem[] = [];

    for (const decision of dto.decisions) {
      const service = serviceById.get(decision.mandateServiceId)!;
      const operation = operationByService.get(service.id);
      if (!operation)
        throw new BadRequestException(
          'Décision absente de la projection opérationnelle',
        );
      if (decision.action === MandateOperationDecisionAction.CREATE_ACTIVITY) {
        if (
          operation.action !== 'CREATE_ACTIVITY' ||
          operation.reasonCode !== 'NO_ACTIVITY_EXISTS'
        ) {
          throw new ConflictException(
            'La création de cette activité n’est plus applicable',
          );
        }
        this.assertCreatable(service);
        const activityId = randomUUID();
        const activity = await this.createActivity(
          tx,
          project,
          actor,
          service,
          activityId,
          null,
          dto,
        );
        applied.push({
          mandateServiceId: service.id,
          action: decision.action,
          activityId: activity.id,
          created: true,
          sourceActivityId: null,
        });
      } else if (
        decision.action === MandateOperationDecisionAction.ADOPT_LEGACY_ACTIVITY
      ) {
        const candidate = operation.legacyCandidates.find(
          (item) => item.id === decision.activityId,
        );
        if (!candidate || service.commercialStatus !== 'ACTIVE') {
          throw new ConflictException(
            'Cette activité n’est plus une candidate legacy applicable',
          );
        }
        const updated = await tx.projectActivity.updateMany({
          where: {
            id: decision.activityId,
            projectId,
            organizationId: project.organizationId,
            sourceMandate: true,
            activityTypeId: service.activityTypeId,
            mandateServiceId: null,
          },
          data: { mandateServiceId: service.id },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            'Cette activité legacy a déjà été modifiée',
          );
        await this.audit(
          tx,
          project,
          actor,
          'MANDATE_SERVICE_LEGACY_ACTIVITY_ADOPTED',
          service.id,
          service.activityTypeId,
          decision.activityId!,
          null,
          dto,
        );
        applied.push({
          mandateServiceId: service.id,
          action: decision.action,
          activityId: decision.activityId!,
          created: false,
          sourceActivityId: null,
        });
      } else {
        this.assertCreatable(service);
        if (
          operation.action !== 'REQUIRES_DECISION' ||
          operation.reasonCode !== 'LATEST_ACTIVITY_CANCELLED' ||
          !operation.linkedActivities.some(
            (item) =>
              item.id === decision.activityId && item.status === 'annule',
          )
        ) {
          throw new ConflictException(
            'Le remplacement de cette activité n’est plus applicable',
          );
        }
        const source = await tx.projectActivity.findFirst({
          where: {
            id: decision.activityId,
            projectId,
            organizationId: project.organizationId,
            mandateServiceId: service.id,
            activityTypeId: service.activityTypeId,
            sourceMandate: true,
            status: 'annule',
          },
          select: { id: true },
        });
        if (!source)
          throw new ConflictException('Activité source annulée introuvable');
        const openBooking = await tx.booking.findFirst({
          where: {
            activityId: source.id,
            status: { in: OPEN_BOOKING_STATUSES },
          },
          select: { id: true },
        });
        if (openBooking)
          throw new ConflictException(
            'Une activité avec un Booking ouvert ne peut pas être remplacée',
          );
        await this.assertAcyclicReplacementChain(tx, source.id);
        const activityId = randomUUID();
        assertReplacementIdentity(activityId, source.id);
        const activity = await this.createActivity(
          tx,
          project,
          actor,
          service,
          activityId,
          source.id,
          dto,
        );
        applied.push({
          mandateServiceId: service.id,
          action: decision.action,
          activityId: activity.id,
          created: true,
          sourceActivityId: source.id,
        });
      }
    }

    const result: StoredResult = { applied };
    await tx.mandateServiceOperation.create({
      data: {
        organizationId: project.organizationId,
        projectId,
        projectMandateId: project.mandate.id,
        idempotencyKey: dto.idempotencyKey,
        payloadHash,
        commercialRevision: dto.expectedRevision,
        result: result as unknown as Prisma.InputJsonValue,
        createdById: actor.userId,
      },
    });
    const postPreview = await this.previewService.previewInTransaction(
      tx,
      projectId,
      actor,
      dto.expectedRevision,
    );
    return {
      commercialRevision: dto.expectedRevision,
      idempotencyKey: dto.idempotencyKey,
      replayed: false,
      applied,
      preview: postPreview,
    };
  }

  private assertCreatable(service: {
    commercialStatus: string;
    recurrenceMode: string;
    quantity: number;
    activityType: { isActive: boolean };
  }) {
    if (
      service.commercialStatus !== 'ACTIVE' ||
      service.recurrenceMode !== 'ONCE' ||
      service.quantity !== 1
    ) {
      throw new ConflictException(
        'Ce service requiert une politique de planification hors V1',
      );
    }
    if (!service.activityType.isActive)
      throw new ConflictException("Le type d'activité est archivé");
  }

  private async createActivity(
    tx: Prisma.TransactionClient,
    project: { id: string; organizationId: string },
    actor: WorkManagementActor,
    service: {
      id: string;
      activityTypeId: string;
      activityType: {
        code: string;
        nameFR: string;
        defaultDurationMinutes: number | null;
        clientBookableDefault: boolean;
      };
    },
    activityId: string,
    sourceActivityId: string | null,
    dto: Pick<ApplyMandateOperationsDto, 'idempotencyKey' | 'expectedRevision'>,
  ) {
    const minutes = service.activityType.defaultDurationMinutes;
    const activity = await tx.projectActivity.create({
      data: {
        id: activityId,
        projectId: project.id,
        organizationId: project.organizationId,
        activityTypeId: service.activityTypeId,
        mandateServiceId: service.id,
        replacementOfActivityId: sourceActivityId,
        type: service.activityType.code,
        label: service.activityType.nameFR,
        duration: minutes ? this.formatDuration(minutes) : '',
        mode: 'presentiel',
        status: 'a_faire',
        sourceMandate: true,
        isRecurring: false,
        dureeHeures: minutes ? minutes / 60 : null,
        clientVisible: true,
        clientBookable: service.activityType.clientBookableDefault,
      },
    });
    await this.activityTaskLists.instantiateMissingTaskListsForActivity(
      tx,
      project.id,
      activity.id,
      actor,
    );
    await this.audit(
      tx,
      project,
      actor,
      sourceActivityId
        ? 'MANDATE_SERVICE_REPLACEMENT_CREATED'
        : 'MANDATE_SERVICE_ACTIVITY_CREATED',
      service.id,
      service.activityTypeId,
      activity.id,
      sourceActivityId,
      dto,
    );
    return activity;
  }

  private async audit(
    tx: Prisma.TransactionClient,
    project: { id: string; organizationId: string },
    actor: WorkManagementActor,
    action: string,
    mandateServiceId: string,
    activityTypeId: string,
    activityId: string,
    sourceActivityId: string | null,
    dto: Pick<ApplyMandateOperationsDto, 'idempotencyKey' | 'expectedRevision'>,
  ) {
    await tx.auditLog.create({
      data: {
        action,
        entityType: 'ProjectActivity',
        entityId: activityId,
        projectId: project.id,
        organizationId: project.organizationId,
        userId: actor.userId,
        description: action,
        metadata: {
          mandateServiceId,
          activityTypeId,
          activityId,
          sourceActivityId,
          idempotencyKey: dto.idempotencyKey,
          commercialRevision: dto.expectedRevision,
          actor: actor.userId,
        },
      },
    });
  }

  private async assertAcyclicReplacementChain(
    tx: Prisma.TransactionClient,
    sourceId: string,
  ) {
    const visited = new Set<string>();
    let current: string | null = sourceId;
    while (current) {
      if (visited.has(current))
        throw new ConflictException('Cycle de remplacement détecté');
      visited.add(current);
      const row: { replacementOfActivityId: string | null } | null =
        await tx.projectActivity.findUnique({
          where: { id: current },
          select: { replacementOfActivityId: true },
        });
      current = row?.replacementOfActivityId ?? null;
    }
  }

  private async replay(
    tx: Prisma.TransactionClient,
    projectId: string,
    actor: WorkManagementActor,
    storedHash: string,
    requestedHash: string,
    commercialRevision: string,
    idempotencyKey: string,
    result: StoredResult,
  ) {
    if (storedHash !== requestedHash)
      throw new ConflictException(
        'Cette clé d’idempotence a déjà été utilisée',
      );
    const services = await tx.projectMandateService.findMany({
      where: { projectId, organizationId: actor.organizationId },
    });
    const currentRevision = this.commercial.computeRevision(services);
    const preview = await this.previewService.previewInTransaction(
      tx,
      projectId,
      actor,
      currentRevision,
    );
    return {
      commercialRevision,
      idempotencyKey,
      replayed: true,
      applied: result.applied,
      preview,
    };
  }

  private async replayAfterUniqueRace(
    projectId: string,
    actor: WorkManagementActor,
    dto: ApplyMandateOperationsDto,
    payloadHash: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.mandateServiceOperation.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: actor.organizationId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });
      if (!existing)
        throw new ConflictException('Conflit concurrent pendant l’application');
      return this.replay(
        tx,
        projectId,
        actor,
        existing.payloadHash,
        payloadHash,
        existing.commercialRevision,
        dto.idempotencyKey,
        existing.result as StoredResult,
      );
    });
  }

  private formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours ? `${hours}h` : ''}${remainder ? `${remainder}min` : ''}`;
  }
}
