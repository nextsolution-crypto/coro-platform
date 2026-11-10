import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisplayCorrectionStatus,
  DisplayPermission,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SpatialActor } from '../spatial/spatial-authorization.service';
import {
  AssignDisplayObservationDto,
  DisplayObservationListQueryDto,
  MessageDisplayObservationDto,
  QualifyDisplayObservationDto,
  TransitionDisplayObservationDto,
} from './dto/display-observation-workflow.dto';

type Authority = {
  userId: string;
  buildingIds: string[];
  permissions: DisplayPermission[];
};

const TRANSITIONS: Record<DisplayCorrectionStatus, DisplayCorrectionStatus[]> =
  {
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['MORE_INFO_REQUIRED', 'ACCEPTED', 'REJECTED'],
    MORE_INFO_REQUIRED: ['UNDER_REVIEW'],
    ACCEPTED: ['CORRECTION_IN_PROGRESS', 'RESOLVED'],
    REJECTED: ['CLOSED'],
    CORRECTION_IN_PROGRESS: ['RESOLVED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
  };

const ACTIONS: Partial<Record<DisplayCorrectionStatus, string>> = {
  UNDER_REVIEW: 'OBSERVATION_REVIEW_STARTED',
  MORE_INFO_REQUIRED: 'OBSERVATION_INFO_REQUESTED',
  ACCEPTED: 'OBSERVATION_ACCEPTED',
  REJECTED: 'OBSERVATION_REJECTED',
  CORRECTION_IN_PROGRESS: 'OBSERVATION_CORRECTION_STARTED',
  RESOLVED: 'OBSERVATION_RESOLVED',
  CLOSED: 'OBSERVATION_CLOSED',
};

@Injectable()
export class DisplayObservationWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    actor: SpatialActor,
    query: DisplayObservationListQueryDto,
  ) {
    const authority = await this.authority(
      organizationId,
      actor,
      DisplayPermission.DISPLAY_OBSERVATION_READ,
    );
    const buildingIds = query.buildingId
      ? this.assertBuilding(authority, query.buildingId)
      : authority.buildingIds;
    const and: Prisma.DisplayCorrectionObservationWhereInput[] = [];
    if (query.priority) {
      and.push({
        OR: [
          { professionalPriority: query.priority },
          { professionalPriority: null, suggestedPriority: query.priority },
        ],
      });
    }
    if (query.from || query.to) {
      and.push({
        submittedAt: {
          ...(query.from ? { gte: this.date(query.from, 'from') } : {}),
          ...(query.to ? { lte: this.date(query.to, 'to') } : {}),
        },
      });
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      and.push({
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { building: { name: { contains: search, mode: 'insensitive' } } },
          { location: { label: { contains: search, mode: 'insensitive' } } },
          {
            publication: {
              projectFile: { name: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      });
    }
    const where: Prisma.DisplayCorrectionObservationWhereInput = {
      organizationId,
      buildingId: { in: buildingIds },
      ...(query.status ? { status: query.status } : {}),
      ...(query.publicationId ? { publicationId: query.publicationId } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      AND: and,
    };
    const base = { organizationId, buildingId: { in: authority.buildingIds } };
    const [items, total, grouped, critical, assignees] = await Promise.all([
      this.prisma.displayCorrectionObservation.findMany({
        where,
        orderBy: [
          { professionalPriority: 'desc' },
          { suggestedPriority: 'desc' },
          { updatedAt: 'desc' },
          { id: 'asc' },
        ],
        skip: query.offset,
        take: query.limit,
        include: {
          building: { select: { name: true } },
          floor: { select: { name: true } },
          location: { select: { label: true } },
          publication: { select: { projectFile: { select: { name: true } } } },
          submittedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.displayCorrectionObservation.count({ where }),
      this.prisma.displayCorrectionObservation.groupBy({
        by: ['status'],
        where: base,
        _count: { _all: true },
      }),
      this.prisma.displayCorrectionObservation.count({
        where: {
          ...base,
          status: { notIn: ['RESOLVED', 'CLOSED'] },
          OR: [
            { professionalPriority: 'CRITICAL' },
            { professionalPriority: null, suggestedPriority: 'CRITICAL' },
          ],
        },
      }),
      this.prisma.user.findMany({
        where: {
          organizationId,
          isActive: true,
          displayPermissions: {
            has: DisplayPermission.DISPLAY_OBSERVATION_READ,
          },
          displayBuildingIds: { hasSome: authority.buildingIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayBuildingIds: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);
    const byStatus = Object.fromEntries(
      Object.values(DisplayCorrectionStatus).map((status) => [status, 0]),
    );
    for (const row of grouped) byStatus[row.status] = row._count._all;
    return {
      items,
      total,
      offset: query.offset,
      limit: query.limit,
      dashboard: {
        byStatus,
        critical,
        open: Object.entries(byStatus)
          .filter(([status]) => status !== DisplayCorrectionStatus.CLOSED)
          .reduce((sum, [, count]) => sum + count, 0),
      },
      capabilities: Object.fromEntries(
        Object.values(DisplayPermission)
          .filter((permission) => permission.startsWith('DISPLAY_OBSERVATION_'))
          .map((permission) => [
            permission,
            authority.permissions.includes(permission),
          ]),
      ),
      assignees,
    };
  }

  async detail(
    organizationId: string,
    observationId: string,
    actor: SpatialActor,
  ) {
    const authority = await this.authority(
      organizationId,
      actor,
      DisplayPermission.DISPLAY_OBSERVATION_READ,
    );
    const observation =
      await this.prisma.displayCorrectionObservation.findFirst({
        where: {
          id: observationId,
          organizationId,
          buildingId: { in: authority.buildingIds },
        },
        include: {
          building: { select: { name: true } },
          floor: { select: { name: true } },
          location: { select: { label: true } },
          publication: {
            include: {
              projectFile: {
                select: { name: true, version: true, sha256: true },
              },
            },
          },
          submittedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
          messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          events: authority.permissions.includes(
            DisplayPermission.DISPLAY_OBSERVATION_AUDIT_READ,
          )
            ? { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }
            : false,
        },
      });
    if (!observation) throw new NotFoundException('Observation introuvable.');
    const userIds = [
      observation.qualifiedByUserId,
      observation.assignedUserId,
      observation.assignedByUserId,
      observation.decidedByUserId,
      observation.resolutionValidatedById,
      ...observation.messages.map((message) => message.authorUserId),
      ...('events' in observation && Array.isArray(observation.events)
        ? observation.events.map((event) => event.actorUserId)
        : []),
    ].filter((id): id is string => Boolean(id));
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] }, organizationId },
      select: { id: true, firstName: true, lastName: true },
    });
    return { ...observation, professionalUsers: users };
  }

  async qualify(
    organizationId: string,
    observationId: string,
    actor: SpatialActor,
    dto: QualifyDisplayObservationDto,
  ) {
    const authority = await this.authority(
      organizationId,
      actor,
      DisplayPermission.DISPLAY_OBSERVATION_QUALIFY,
    );
    return this.mutate(
      organizationId,
      observationId,
      authority,
      dto,
      'OBSERVATION_QUALIFIED',
      (observation) => ({
        professionalPriority: dto.professionalPriority,
        qualifiedCategory: dto.qualifiedCategory,
        qualifiedAt: new Date(),
        qualifiedByUserId: authority.userId,
        status:
          observation.status === 'SUBMITTED'
            ? 'UNDER_REVIEW'
            : observation.status,
      }),
    );
  }

  async assign(
    organizationId: string,
    observationId: string,
    actor: SpatialActor,
    dto: AssignDisplayObservationDto,
  ) {
    const authority = await this.authority(
      organizationId,
      actor,
      DisplayPermission.DISPLAY_OBSERVATION_ASSIGN,
    );
    const observation = await this.requireObservation(
      organizationId,
      observationId,
      authority,
    );
    const assignee = await this.prisma.user.findFirst({
      where: {
        id: dto.assignedUserId,
        organizationId,
        isActive: true,
        displayPermissions: { has: DisplayPermission.DISPLAY_OBSERVATION_READ },
        displayBuildingIds: { has: observation.buildingId },
      },
      select: { id: true },
    });
    if (!assignee)
      throw new BadRequestException('Responsable hors périmètre ou inactif.');
    return this.mutate(
      organizationId,
      observationId,
      authority,
      dto,
      'OBSERVATION_ASSIGNED',
      () => ({
        assignedUserId: dto.assignedUserId,
        assignedAt: new Date(),
        assignedByUserId: authority.userId,
      }),
    );
  }

  async message(
    organizationId: string,
    observationId: string,
    actor: SpatialActor,
    dto: MessageDisplayObservationDto,
  ) {
    const authority = await this.authority(
      organizationId,
      actor,
      DisplayPermission.DISPLAY_OBSERVATION_RESPOND,
    );
    const message = this.plain(dto.message, 3, 4000, 'Message');
    const reason = this.plain(dto.reason, 3, 2000, 'Motif');
    const existing =
      await this.prisma.displayCorrectionObservationMessage.findUnique({
        where: {
          organizationId_requestId: {
            organizationId,
            requestId: dto.requestId,
          },
        },
      });
    if (existing) {
      if (existing.observationId !== observationId) {
        throw new ConflictException(
          "Clé d'idempotence déjà utilisée pour une autre observation.",
        );
      }
      return this.detail(organizationId, observationId, actor);
    }
    const observation = await this.requireObservation(
      organizationId,
      observationId,
      authority,
    );
    if (observation.lockVersion !== dto.expectedLockVersion)
      throw new ConflictException(
        'Observation modifiée par un autre utilisateur.',
      );
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.displayCorrectionObservation.updateMany({
        where: {
          id: observationId,
          organizationId,
          buildingId: observation.buildingId,
          lockVersion: dto.expectedLockVersion,
        },
        data: {
          lockVersion: { increment: 1 },
          ...(dto.visibility === 'CLIENT'
            ? { clientVisibleResponse: message }
            : {}),
        },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          'Observation modifiée par un autre utilisateur.',
        );
      await tx.displayCorrectionObservationMessage.create({
        data: {
          observationId,
          organizationId,
          buildingId: observation.buildingId,
          authorUserId: authority.userId,
          requestId: dto.requestId,
          visibility: dto.visibility,
          message,
        },
      });
      await tx.displayCorrectionObservationEvent.create({
        data: {
          observationId,
          organizationId,
          buildingId: observation.buildingId,
          status: observation.status,
          fromStatus: observation.status,
          action:
            dto.visibility === 'CLIENT'
              ? 'OBSERVATION_CLIENT_RESPONSE_ADDED'
              : 'OBSERVATION_INTERNAL_COMMENT_ADDED',
          actorUserId: authority.userId,
          requestId: `${dto.requestId}:event`,
          reason,
          lockVersion: dto.expectedLockVersion + 1,
        },
      });
    });
    return this.detail(organizationId, observationId, actor);
  }

  async transition(
    organizationId: string,
    observationId: string,
    actor: SpatialActor,
    dto: TransitionDisplayObservationDto,
  ) {
    const permission = this.transitionPermission(dto.toStatus);
    const authority = await this.authority(organizationId, actor, permission);
    const clientResponse = dto.clientResponse
      ? this.plain(dto.clientResponse, 3, 4000, 'Réponse client')
      : undefined;
    if (
      ['MORE_INFO_REQUIRED', 'REJECTED'].includes(dto.toStatus) &&
      !clientResponse
    ) {
      throw new BadRequestException(
        'Une réponse communicable au client est requise.',
      );
    }
    return this.mutate(
      organizationId,
      observationId,
      authority,
      dto,
      ACTIONS[dto.toStatus] ?? 'OBSERVATION_STATUS_CHANGED',
      (observation) => {
        if (!TRANSITIONS[observation.status].includes(dto.toStatus))
          throw new BadRequestException(
            `Transition ${observation.status} → ${dto.toStatus} interdite.`,
          );
        if (
          dto.toStatus === 'RESOLVED' &&
          observation.correctionReferenceId &&
          !dto.correctionEvidence?.trim() &&
          !observation.correctionEvidence
        ) {
          throw new BadRequestException(
            'Une preuve de correction est requise avant la résolution.',
          );
        }
        return {
          status: dto.toStatus,
          clientVisibleResponse:
            clientResponse ?? observation.clientVisibleResponse,
          ...(dto.correctionReferenceType
            ? { correctionReferenceType: dto.correctionReferenceType.trim() }
            : {}),
          ...(dto.correctionReferenceId
            ? { correctionReferenceId: dto.correctionReferenceId.trim() }
            : {}),
          ...(dto.correctionEvidence
            ? {
                correctionEvidence: this.plain(
                  dto.correctionEvidence,
                  3,
                  4000,
                  'Preuve',
                ),
              }
            : {}),
          ...(['ACCEPTED', 'REJECTED'].includes(dto.toStatus)
            ? { decisionAt: new Date(), decidedByUserId: authority.userId }
            : {}),
          ...(dto.toStatus === 'RESOLVED'
            ? {
                resolvedAt: new Date(),
                resolutionValidatedAt: new Date(),
                resolutionValidatedById: authority.userId,
              }
            : {}),
          ...(dto.toStatus === 'CLOSED' ? { closedAt: new Date() } : {}),
        };
      },
      clientResponse,
    );
  }

  private async mutate(
    organizationId: string,
    observationId: string,
    authority: Authority,
    dto: { expectedLockVersion: number; requestId: string; reason: string },
    action: string,
    data: (
      observation: Awaited<
        ReturnType<DisplayObservationWorkflowService['requireObservation']>
      >,
    ) => Prisma.DisplayCorrectionObservationUpdateManyMutationInput,
    clientMessage?: string,
  ) {
    const reason = this.plain(dto.reason, 3, 2000, 'Motif');
    const replay =
      await this.prisma.displayCorrectionObservationEvent.findUnique({
        where: {
          organizationId_requestId: {
            organizationId,
            requestId: dto.requestId,
          },
        },
      });
    if (replay) {
      if (replay.observationId !== observationId) {
        throw new ConflictException(
          "Clé d'idempotence déjà utilisée pour une autre observation.",
        );
      }
      return this.prisma.displayCorrectionObservation.findUnique({
        where: { id: replay.observationId },
      });
    }
    const observation = await this.requireObservation(
      organizationId,
      observationId,
      authority,
    );
    if (observation.lockVersion !== dto.expectedLockVersion)
      throw new ConflictException(
        'Observation modifiée par un autre utilisateur.',
      );
    return this.prisma.$transaction(async (tx) => {
      const mutation = data(observation);
      const toStatus =
        (mutation.status as DisplayCorrectionStatus | undefined) ??
        observation.status;
      const updated = await tx.displayCorrectionObservation.updateMany({
        where: {
          id: observationId,
          organizationId,
          buildingId: observation.buildingId,
          lockVersion: dto.expectedLockVersion,
        },
        data: { ...mutation, lockVersion: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          'Observation modifiée par un autre utilisateur.',
        );
      await tx.displayCorrectionObservationEvent.create({
        data: {
          observationId,
          organizationId,
          buildingId: observation.buildingId,
          status: toStatus,
          fromStatus: observation.status,
          action,
          actorUserId: authority.userId,
          requestId: dto.requestId,
          reason,
          lockVersion: dto.expectedLockVersion + 1,
        },
      });
      if (clientMessage) {
        await tx.displayCorrectionObservationMessage.create({
          data: {
            observationId,
            organizationId,
            buildingId: observation.buildingId,
            authorUserId: authority.userId,
            requestId: `${dto.requestId}:message`,
            visibility: 'CLIENT',
            message: clientMessage,
          },
        });
      }
      return tx.displayCorrectionObservation.findUnique({
        where: { id: observationId },
      });
    });
  }

  private async authority(
    organizationId: string,
    actor: SpatialActor,
    permission: DisplayPermission,
  ): Promise<Authority> {
    if (!actor?.userId || actor.organizationId !== organizationId)
      throw new ForbiddenException('Accès professionnel Display interdit.');
    const user = await this.prisma.user.findFirst({
      where: {
        id: actor.userId,
        organizationId,
        isActive: true,
        organization: { isActive: true },
        displayPermissions: { has: permission },
      },
      select: { id: true, displayPermissions: true, displayBuildingIds: true },
    });
    if (!user || user.displayBuildingIds.length === 0)
      throw new ForbiddenException(
        'Permission professionnelle et bâtiment explicite requis.',
      );
    return {
      userId: user.id,
      permissions: user.displayPermissions,
      buildingIds: user.displayBuildingIds,
    };
  }

  private async requireObservation(
    organizationId: string,
    observationId: string,
    authority: Authority,
  ) {
    const observation =
      await this.prisma.displayCorrectionObservation.findFirst({
        where: {
          id: observationId,
          organizationId,
          buildingId: { in: authority.buildingIds },
        },
      });
    if (!observation) throw new NotFoundException('Observation introuvable.');
    return observation;
  }

  private assertBuilding(authority: Authority, buildingId: string) {
    if (!authority.buildingIds.includes(buildingId))
      throw new ForbiddenException('Bâtiment hors périmètre.');
    return [buildingId];
  }

  private transitionPermission(status: DisplayCorrectionStatus) {
    if (status === 'RESOLVED')
      return DisplayPermission.DISPLAY_OBSERVATION_RESOLVE;
    if (status === 'CLOSED') return DisplayPermission.DISPLAY_OBSERVATION_CLOSE;
    if (['ACCEPTED', 'REJECTED', 'CORRECTION_IN_PROGRESS'].includes(status))
      return DisplayPermission.DISPLAY_OBSERVATION_DECIDE;
    if (status === 'MORE_INFO_REQUIRED')
      return DisplayPermission.DISPLAY_OBSERVATION_RESPOND;
    return DisplayPermission.DISPLAY_OBSERVATION_QUALIFY;
  }

  private plain(value: string, min: number, max: number, label: string) {
    const clean = value.trim();
    const hasDisallowedControl = Array.from(clean).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 && code !== 9 && code !== 10 && code !== 13;
    });
    if (
      clean.length < min ||
      clean.length > max ||
      /[<>]/.test(clean) ||
      hasDisallowedControl
    ) {
      throw new BadRequestException(`${label} invalide.`);
    }
    return clean;
  }

  private date(value: string, label: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
      throw new BadRequestException(`Date ${label} invalide.`);
    return parsed;
  }
}
