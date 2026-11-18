import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, OperationalShiftStatus } from '@prisma/client';
import {
  ensureProvenanceActor,
  provenanceActor,
  type ProvenanceActor,
} from '../auth/coro-actor-provenance';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOperationalShiftDto,
  HandoverDecisionDto,
  OpenShiftDto,
  PrepareHandoverDto,
  ShiftListQueryDto,
  ShiftTransitionDto,
} from './dto/operational-shifts.dto';
import { operationalShiftsEnabled } from './operational-shifts.config';
import { OperationalShiftsAccessService } from './operational-shifts-access.service';
import {
  operationalDirectivesEnabled,
  operationalFollowUpsEnabled,
} from '../operational-directives/operational-directives.config';

const SHIFT_INCLUDE = {
  responsibleUser: { select: { id: true, firstName: true, lastName: true } },
  participants: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.OperationalShiftInclude;

@Injectable()
export class OperationalShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: OperationalShiftsAccessService,
  ) {}

  private enabled(): void {
    if (!operationalShiftsEnabled()) {
      throw new NotFoundException('Gestion des quarts indisponible.');
    }
  }

  async create(
    organizationId: string,
    dto: CreateOperationalShiftDto,
    actor: ProvenanceActor,
  ) {
    this.enabled();
    await this.access.require(
      actor,
      organizationId,
      dto.buildingId,
      'OPERATIONAL_SHIFT_OPEN',
    );
    const start = new Date(dto.plannedStartAt);
    const end = new Date(dto.plannedEndAt);
    if (end <= start)
      throw new BadRequestException('La fin planifiée doit suivre le début.');

    return this.prisma.$transaction(
      async (tx) => {
        const authority = await ensureProvenanceActor(tx, actor);
        await this.lockScope(
          tx,
          organizationId,
          dto.buildingId,
          dto.securityPost,
        );
        const prior = await tx.operationalShift.findUnique({
          where: {
            organizationId_creationIdempotencyKey: {
              organizationId,
              creationIdempotencyKey: dto.idempotencyKey,
            },
          },
          include: SHIFT_INCLUDE,
        });
        if (prior) return prior;

        const building = await tx.building.findFirst({
          where: { id: dto.buildingId, organizationId, isActive: true },
          select: { timeZone: true, timeZoneVerified: true },
        });
        if (!building?.timeZoneVerified) {
          throw new BadRequestException(
            'Le fuseau horaire du bâtiment doit être vérifié.',
          );
        }
        const userIds = [
          ...new Set([
            dto.responsibleUserId,
            ...dto.participants.map((p) => p.userId),
          ]),
        ];
        const assigned =
          authority.actorType === 'USER'
            ? await tx.operationalLogBuildingAssignment.count({
                where: {
                  organizationId,
                  buildingId: dto.buildingId,
                  userId: { in: userIds },
                  status: 'ACTIVE',
                  effectiveFrom: { lte: start },
                  OR: [
                    { effectiveUntil: null },
                    { effectiveUntil: { gt: start } },
                  ],
                },
              })
            : await tx.clientOperationalBuildingAssignment.count({
                where: {
                  organizationId,
                  buildingId: dto.buildingId,
                  clientUserId: { in: userIds },
                  status: 'ACTIVE',
                  effectiveFrom: { lte: start },
                  OR: [
                    { effectiveUntil: null },
                    { effectiveUntil: { gt: start } },
                  ],
                },
              });
        if (assigned !== userIds.length) {
          throw new BadRequestException(
            'Chaque participant doit être actif et affecté au bâtiment.',
          );
        }
        const identityCount =
          authority.actorType === 'USER'
            ? await tx.user.count({
                where: {
                  id: { in: userIds },
                  organizationId,
                  isActive: true,
                },
              })
            : await tx.clientUser.count({
                where: {
                  id: { in: userIds },
                  organizationId,
                  isActive: true,
                },
              });
        if (identityCount !== userIds.length) {
          throw new BadRequestException(
            'Chaque participant doit être une identité active du tenant.',
          );
        }
        await Promise.all(
          userIds.map((actorId) =>
            tx.coroActorIdentity.upsert({
              where: {
                organizationId_actorType_actorId: {
                  organizationId,
                  actorType: authority.actorType,
                  actorId,
                },
              },
              create: {
                organizationId,
                actorType: authority.actorType,
                actorId,
                userId: authority.actorType === 'USER' ? actorId : null,
                clientUserId:
                  authority.actorType === 'CLIENT_USER' ? actorId : null,
              },
              update: {},
            }),
          ),
        );
        const overlap = await tx.operationalShift.findFirst({
          where: {
            organizationId,
            buildingId: dto.buildingId,
            securityPost: dto.securityPost,
            responsibleActorType: authority.actorType,
            responsibleActorId: dto.responsibleUserId,
            status: { in: ['PLANNED', 'OPEN', 'HANDOVER_PENDING'] },
            plannedStartAt: { lt: end },
            plannedEndAt: { gt: start },
          },
          select: { id: true },
        });
        if (overlap)
          throw new ConflictException(
            'Un quart incompatible chevauche cette période.',
          );

        const shift = await tx.operationalShift.create({
          data: {
            organizationId,
            buildingId: dto.buildingId,
            securityPost: dto.securityPost.trim(),
            teamName: dto.teamName?.trim(),
            responsibleUserId:
              authority.actorType === 'USER' ? dto.responsibleUserId : null,
            responsibleActorType: authority.actorType,
            responsibleActorId: dto.responsibleUserId,
            plannedStartAt: start,
            plannedEndAt: end,
            buildingTimeZone: building.timeZone,
            instructionsSnapshot: dto.instructionsSnapshot as
              | Prisma.InputJsonValue
              | undefined,
            notes: dto.notes?.trim(),
            creationIdempotencyKey: dto.idempotencyKey,
            createdByUserId:
              authority.actorType === 'USER' ? authority.actorId : null,
            createdByActorType: authority.actorType,
            createdByActorId: authority.actorId,
            participants: {
              create: [
                {
                  userId:
                    authority.actorType === 'USER'
                      ? dto.responsibleUserId
                      : null,
                  participantActorType: authority.actorType,
                  participantActorId: dto.responsibleUserId,
                  buildingId: dto.buildingId,
                  role: 'RESPONSIBLE',
                },
                ...dto.participants
                  .filter((p) => p.userId !== dto.responsibleUserId)
                  .map((p) => ({
                    buildingId: dto.buildingId,
                    userId: authority.actorType === 'USER' ? p.userId : null,
                    participantActorType: authority.actorType,
                    participantActorId: p.userId,
                    role: p.role,
                  })),
              ],
            },
            history: {
              create: {
                buildingId: dto.buildingId,
                action: 'SHIFT_PLANNED',
                toStatus: 'PLANNED',
                actorUserId:
                  authority.actorType === 'USER' ? authority.actorId : null,
                actorType: authority.actorType,
                actorId: authority.actorId,
                idempotencyKey: dto.idempotencyKey,
              },
            },
          },
          include: SHIFT_INCLUDE,
        });
        return shift;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async list(
    organizationId: string,
    query: ShiftListQueryDto,
    actor: ProvenanceActor,
  ) {
    this.enabled();
    await this.access.require(
      actor,
      organizationId,
      query.buildingId,
      'OPERATIONAL_SHIFT_READ',
    );
    return this.prisma.operationalShift.findMany({
      where: {
        organizationId,
        buildingId: query.buildingId,
        ...(query.status
          ? { status: query.status as OperationalShiftStatus }
          : {}),
      },
      include: SHIFT_INCLUDE,
      orderBy: [{ plannedStartAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
    });
  }

  async get(organizationId: string, id: string, actor: ProvenanceActor) {
    this.enabled();
    const shift = await this.find(organizationId, id);
    await this.access.require(
      actor,
      organizationId,
      shift.buildingId,
      'OPERATIONAL_SHIFT_READ',
    );
    return this.prisma.operationalShift.findUnique({
      where: { id_organizationId: { id, organizationId } },
      include: {
        ...SHIFT_INCLUDE,
        history: { orderBy: { occurredAt: 'asc' } },
        logEntries: { orderBy: { eventAt: 'desc' }, take: 100 },
        outgoingHandovers: {
          include: { actions: { orderBy: { occurredAt: 'asc' } } },
        },
      },
    });
  }

  async open(
    organizationId: string,
    id: string,
    dto: OpenShiftDto,
    actor: ProvenanceActor,
  ) {
    const shift = await this.find(organizationId, id);
    const authority = provenanceActor(actor);
    await this.requireParticipant(organizationId, shift.id, authority);
    const directiveSnapshot = operationalDirectivesEnabled()
      ? await this.prisma.operationalDirective.findMany({
          where: {
            organizationId,
            buildingId: shift.buildingId,
            status: 'PUBLISHED',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: {
            id: true,
            currentVersionNumber: true,
            title: true,
            priority: true,
            acknowledgementRequired: true,
            receipts: {
              where: {
                recipientActorType: authority.actorType,
                recipientActorId: authority.actorId,
              },
              select: { status: true, versionId: true },
            },
          },
        })
      : [];
    return this.transition(
      organizationId,
      id,
      dto,
      actor,
      'PLANNED',
      'OPEN',
      'SHIFT_OPENED',
      'OPERATIONAL_SHIFT_OPEN',
      {
        actualStartAt: new Date(),
        openingSnapshot: {
          ...(dto.openingSnapshot ?? {}),
          applicableDirectiveReferences: directiveSnapshot,
          capturedAt: new Date().toISOString(),
        },
      },
    );
  }

  async prepareHandover(
    organizationId: string,
    id: string,
    dto: PrepareHandoverDto,
    actor: ProvenanceActor,
  ) {
    this.enabled();
    const shift = await this.find(organizationId, id);
    await this.access.require(
      actor,
      organizationId,
      shift.buildingId,
      'OPERATIONAL_HANDOVER_PREPARE',
    );
    const authority = provenanceActor(actor);
    await this.requireParticipant(organizationId, shift.id, authority);
    if (shift.status !== 'OPEN')
      throw new ConflictException(
        'Seul un quart ouvert peut préparer une relève.',
      );
    if (dto.incomingShiftId) {
      const incoming = await this.prisma.operationalShift.findFirst({
        where: {
          id: dto.incomingShiftId,
          organizationId,
          buildingId: shift.buildingId,
        },
        select: { id: true },
      });
      if (!incoming)
        throw new BadRequestException(
          'Le quart entrant doit appartenir au même bâtiment.',
        );
    }
    if (dto.incomingUserId) {
      const [identity, assignment] = await Promise.all([
        authority.actorType === 'USER'
          ? this.prisma.user.findFirst({
              where: {
                id: dto.incomingUserId,
                organizationId,
                isActive: true,
              },
              select: { id: true },
            })
          : this.prisma.clientUser.findFirst({
              where: {
                id: dto.incomingUserId,
                organizationId,
                isActive: true,
              },
              select: { id: true },
            }),
        authority.actorType === 'USER'
          ? this.prisma.operationalLogBuildingAssignment.findFirst({
              where: {
                organizationId,
                buildingId: shift.buildingId,
                userId: dto.incomingUserId,
                status: 'ACTIVE',
                effectiveFrom: { lte: new Date() },
                OR: [
                  { effectiveUntil: null },
                  { effectiveUntil: { gt: new Date() } },
                ],
              },
              select: { id: true },
            })
          : this.prisma.clientOperationalBuildingAssignment.findFirst({
              where: {
                organizationId,
                buildingId: shift.buildingId,
                clientUserId: dto.incomingUserId,
                status: 'ACTIVE',
                effectiveFrom: { lte: new Date() },
                OR: [
                  { effectiveUntil: null },
                  { effectiveUntil: { gt: new Date() } },
                ],
              },
              select: { id: true },
            }),
      ]);
      if (!identity || !assignment) this.access.deny();
    }
    const directiveReferences = operationalDirectivesEnabled()
      ? await this.prisma.operationalDirective.findMany({
          where: {
            organizationId,
            buildingId: shift.buildingId,
            status: 'PUBLISHED',
          },
          select: {
            id: true,
            currentVersionNumber: true,
            title: true,
            priority: true,
            updatedAt: true,
          },
        })
      : [];
    const followUpReferences = operationalFollowUpsEnabled()
      ? await this.prisma.operationalFollowUp.findMany({
          where: {
            organizationId,
            buildingId: shift.buildingId,
            status: {
              in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'],
            },
          },
          select: {
            id: true,
            sourceType: true,
            sourceId: true,
            status: true,
            responsibleUserId: true,
            dueAt: true,
            lockVersion: true,
          },
        })
      : [];
    const governedSnapshot = {
      ...dto.snapshot,
      directiveReferences,
      followUpReferences,
      capturedAt: new Date().toISOString(),
    };
    const snapshotHash = createHash('sha256')
      .update(JSON.stringify(governedSnapshot))
      .digest('hex');
    return this.prisma.$transaction(
      async (tx) => {
        await ensureProvenanceActor(tx, actor);
        if (dto.incomingUserId) {
          await tx.coroActorIdentity.upsert({
            where: {
              organizationId_actorType_actorId: {
                organizationId,
                actorType: authority.actorType,
                actorId: dto.incomingUserId,
              },
            },
            create: {
              organizationId,
              actorType: authority.actorType,
              actorId: dto.incomingUserId,
              userId:
                authority.actorType === 'USER' ? dto.incomingUserId : null,
              clientUserId:
                authority.actorType === 'CLIENT_USER'
                  ? dto.incomingUserId
                  : null,
            },
            update: {},
          });
        }
        const existing = await tx.operationalHandover.findUnique({
          where: {
            organizationId_creationIdempotencyKey: {
              organizationId,
              creationIdempotencyKey: dto.idempotencyKey,
            },
          },
          include: { actions: true },
        });
        if (existing) return existing;
        const updated = await tx.operationalShift.updateMany({
          where: {
            id,
            organizationId,
            status: 'OPEN',
            lockVersion: dto.lockVersion,
          },
          data: { status: 'HANDOVER_PENDING', lockVersion: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            'Le quart a été modifié; actualisez avant de continuer.',
          );
        const handover = await tx.operationalHandover.create({
          data: {
            organizationId,
            buildingId: shift.buildingId,
            outgoingShiftId: id,
            incomingShiftId: dto.incomingShiftId,
            outgoingUserId:
              authority.actorType === 'USER' ? authority.actorId : null,
            outgoingActorType: authority.actorType,
            outgoingActorId: authority.actorId,
            incomingUserId:
              authority.actorType === 'USER' ? dto.incomingUserId : null,
            incomingActorType: dto.incomingUserId
              ? authority.actorType
              : undefined,
            incomingActorId: dto.incomingUserId,
            status: 'SUBMITTED',
            snapshot: governedSnapshot,
            snapshotHash,
            creationIdempotencyKey: dto.idempotencyKey,
            submittedAt: new Date(),
            actions: {
              create: {
                buildingId: shift.buildingId,
                type: 'SUBMITTED',
                actorUserId:
                  authority.actorType === 'USER' ? authority.actorId : null,
                actorType: authority.actorType,
                actorId: authority.actorId,
                reason: dto.reason,
                idempotencyKey: dto.idempotencyKey,
              },
            },
          },
          include: { actions: true },
        });
        await tx.operationalShiftHistory.create({
          data: {
            organizationId,
            buildingId: shift.buildingId,
            shiftId: id,
            action: 'HANDOVER_SUBMITTED',
            fromStatus: 'OPEN',
            toStatus: 'HANDOVER_PENDING',
            actorUserId:
              authority.actorType === 'USER' ? authority.actorId : null,
            actorType: authority.actorType,
            actorId: authority.actorId,
            reason: dto.reason,
            idempotencyKey: `${dto.idempotencyKey}:shift`,
          },
        });
        return handover;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async decideHandover(
    organizationId: string,
    handoverId: string,
    dto: HandoverDecisionDto,
    actor: ProvenanceActor,
  ) {
    this.enabled();
    const handover = await this.prisma.operationalHandover.findFirst({
      where: { id: handoverId, organizationId },
    });
    if (!handover) this.access.deny();
    await this.access.require(
      actor,
      organizationId,
      handover.buildingId,
      'OPERATIONAL_HANDOVER_ACKNOWLEDGE',
    );
    const authority = provenanceActor(actor);
    if (
      handover.outgoingActorType === authority.actorType &&
      handover.outgoingActorId === authority.actorId
    )
      throw new BadRequestException(
        'La relève doit être décidée par l’entrant réel.',
      );
    if (
      handover.incomingActorId &&
      (handover.incomingActorType !== authority.actorType ||
        handover.incomingActorId !== authority.actorId)
    ) {
      this.access.deny();
    }
    if (!handover.incomingActorId && handover.incomingShiftId) {
      await this.requireParticipant(
        organizationId,
        handover.incomingShiftId,
        authority,
      );
    }
    if (
      ['REFUSED', 'CLARIFICATION_REQUESTED'].includes(dto.decision) &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException(
        'Un motif est obligatoire pour cette décision.',
      );
    }
    return this.prisma.$transaction(
      async (tx) => {
        await ensureProvenanceActor(tx, actor);
        const prior = await tx.operationalHandoverAction.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (prior)
          return tx.operationalHandover.findUnique({
            where: { id_organizationId: { id: handoverId, organizationId } },
            include: { actions: true },
          });
        const updated = await tx.operationalHandover.updateMany({
          where: {
            id: handoverId,
            organizationId,
            lockVersion: dto.lockVersion,
            status: 'SUBMITTED',
          },
          data: {
            status: dto.decision,
            incomingUserId:
              authority.actorType === 'USER' ? authority.actorId : null,
            incomingActorType: authority.actorType,
            incomingActorId: authority.actorId,
            decidedAt: new Date(),
            lockVersion: { increment: 1 },
          },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            'La relève a déjà été décidée ou modifiée.',
          );
        await tx.operationalHandoverAction.create({
          data: {
            organizationId,
            buildingId: handover.buildingId,
            handoverId,
            type: dto.decision,
            actorUserId:
              authority.actorType === 'USER' ? authority.actorId : null,
            actorType: authority.actorType,
            actorId: authority.actorId,
            reason: dto.reason,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        return tx.operationalHandover.findUnique({
          where: { id_organizationId: { id: handoverId, organizationId } },
          include: { actions: { orderBy: { occurredAt: 'asc' } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async close(
    organizationId: string,
    id: string,
    dto: ShiftTransitionDto,
    actor: ProvenanceActor,
  ) {
    const shift = await this.find(organizationId, id);
    if (shift.status !== 'HANDOVER_PENDING')
      throw new ConflictException(
        'La relève doit être préparée avant la fermeture.',
      );
    const accepted = await this.prisma.operationalHandover.count({
      where: { outgoingShiftId: id, organizationId, status: 'ACKNOWLEDGED' },
    });
    if (!accepted) {
      await this.access.require(
        actor,
        organizationId,
        shift.buildingId,
        'OPERATIONAL_SHIFT_EXCEPTION_CLOSE',
      );
      if (!dto.reason?.trim())
        throw new BadRequestException(
          'Une fermeture supervisée exige un motif.',
        );
    } else {
      await this.access.require(
        actor,
        organizationId,
        shift.buildingId,
        'OPERATIONAL_SHIFT_EDIT_OWN',
      );
      await this.requireParticipant(
        organizationId,
        shift.id,
        provenanceActor(actor),
      );
    }
    return this.transitionKnown(
      organizationId,
      shift,
      dto,
      actor,
      'HANDOVER_PENDING',
      'CLOSED',
      'SHIFT_CLOSED',
      {
        actualEndAt: new Date(),
        closedByUserId:
          provenanceActor(actor).actorType === 'USER'
            ? provenanceActor(actor).actorId
            : null,
        closedByActorType: provenanceActor(actor).actorType,
        closedByActorId: provenanceActor(actor).actorId,
        closeReason: dto.reason,
      },
    );
  }

  async cancel(
    organizationId: string,
    id: string,
    dto: ShiftTransitionDto,
    actor: ProvenanceActor,
  ) {
    const shift = await this.find(organizationId, id);
    if (!dto.reason?.trim())
      throw new BadRequestException('Le motif d’annulation est obligatoire.');
    await this.access.require(
      actor,
      organizationId,
      shift.buildingId,
      'OPERATIONAL_SHIFT_SUPERVISE',
    );
    if (!['PLANNED', 'OPEN'].includes(shift.status))
      throw new ConflictException('Ce quart ne peut plus être annulé.');
    return this.transitionKnown(
      organizationId,
      shift,
      dto,
      actor,
      shift.status,
      'CANCELLED',
      'SHIFT_CANCELLED',
      {
        actualEndAt: new Date(),
        cancelledByUserId:
          provenanceActor(actor).actorType === 'USER'
            ? provenanceActor(actor).actorId
            : null,
        cancelledByActorType: provenanceActor(actor).actorType,
        cancelledByActorId: provenanceActor(actor).actorId,
        cancellationReason: dto.reason,
      },
    );
  }

  private async transition(
    organizationId: string,
    id: string,
    dto: ShiftTransitionDto,
    actor: ProvenanceActor,
    from: OperationalShiftStatus,
    to: OperationalShiftStatus,
    action: string,
    permission: 'OPERATIONAL_SHIFT_OPEN',
    data: Prisma.OperationalShiftUncheckedUpdateManyInput,
  ) {
    this.enabled();
    const shift = await this.find(organizationId, id);
    await this.access.require(
      actor,
      organizationId,
      shift.buildingId,
      permission,
    );
    return this.transitionKnown(
      organizationId,
      shift,
      dto,
      actor,
      from,
      to,
      action,
      data,
    );
  }

  private async transitionKnown(
    organizationId: string,
    shift: { id: string; buildingId: string; status: OperationalShiftStatus },
    dto: ShiftTransitionDto,
    actor: ProvenanceActor,
    from: OperationalShiftStatus,
    to: OperationalShiftStatus,
    action: string,
    data: Prisma.OperationalShiftUncheckedUpdateManyInput,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const authority = await ensureProvenanceActor(tx, actor);
        const prior = await tx.operationalShiftHistory.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (prior)
          return tx.operationalShift.findUnique({
            where: { id_organizationId: { id: shift.id, organizationId } },
            include: SHIFT_INCLUDE,
          });
        const updated = await tx.operationalShift.updateMany({
          where: {
            id: shift.id,
            organizationId,
            status: from,
            lockVersion: dto.lockVersion,
          },
          data: { ...data, status: to, lockVersion: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            'Le quart a été modifié; actualisez avant de continuer.',
          );
        await tx.operationalShiftHistory.create({
          data: {
            organizationId,
            buildingId: shift.buildingId,
            shiftId: shift.id,
            action,
            fromStatus: from,
            toStatus: to,
            actorUserId:
              authority.actorType === 'USER' ? authority.actorId : null,
            actorType: authority.actorType,
            actorId: authority.actorId,
            reason: dto.reason,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        return tx.operationalShift.findUnique({
          where: { id_organizationId: { id: shift.id, organizationId } },
          include: SHIFT_INCLUDE,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async find(organizationId: string, id: string) {
    const shift = await this.prisma.operationalShift.findFirst({
      where: { id, organizationId },
    });
    if (!shift) this.access.deny();
    return shift;
  }

  private async requireParticipant(
    organizationId: string,
    shiftId: string,
    authority: {
      actorType: 'USER' | 'CLIENT_USER';
      actorId: string;
    },
  ) {
    const participant = await this.prisma.operationalShiftParticipant.findFirst(
      {
        where: {
          organizationId,
          shiftId,
          participantActorType: authority.actorType,
          participantActorId: authority.actorId,
          status: { notIn: ['REPLACED', 'ABSENT'] },
        },
        select: { id: true },
      },
    );
    if (!participant) this.access.deny();
  }

  private async lockScope(
    tx: Prisma.TransactionClient,
    organizationId: string,
    buildingId: string,
    post: string,
  ) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:${buildingId}:${post}`}, 0))`;
  }
}
