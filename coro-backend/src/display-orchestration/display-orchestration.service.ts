import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisplayCommandDeliveryStatus,
  DisplayOperationalCommandStatus,
  DisplayOperationalCommandType,
  DisplayOperationalPriority,
  DisplayPermission,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  SpatialAuthorizationService,
  type SpatialActor,
} from '../spatial/spatial-authorization.service';
import { DeviceGatewayService } from '../display-device/device-gateway.service';
import {
  DISPLAY_MANIFEST_SIGNER,
  type ManifestSigner,
} from '../display-device/manifest-signer';
import {
  AcknowledgeDisplayCommandDto,
  DisplayCommandPollDto,
  IssueDisplayOperationalCommandDto,
} from './dto/display-orchestration.dto';
import {
  canTransitionDelivery,
  commandPriority,
} from './display-command-policy';

const POLICY_VERSION = 'DISPLAY-07/1';
const TERMINAL_COMMANDS: DisplayOperationalCommandStatus[] = [
  'APPLIED',
  'REJECTED',
  'FAILED',
  'STALE',
  'SUPERSEDED',
  'CLOSED',
];

@Injectable()
export class DisplayOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialAuthorizationService,
    private readonly gateway: DeviceGatewayService,
    @Inject(DISPLAY_MANIFEST_SIGNER) private readonly signer: ManifestSigner,
  ) {}

  async issue(
    organizationId: string,
    buildingId: string,
    actor: SpatialActor,
    dto: IssueDisplayOperationalCommandDto,
  ) {
    const permission = this.requiredPermission(dto.commandType);
    await this.spatial.require(actor, organizationId, buildingId, permission);
    this.validateSource(dto);

    const existing = await this.prisma.displayOperationalCommand.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (existing) return this.commandView(existing.id);

    const incident = dto.incidentEventId
      ? await this.prisma.incidentEvent.findFirst({
          where: { id: dto.incidentEventId, organizationId, buildingId },
          select: { id: true, status: true, isActive: true, isExercise: true },
        })
      : null;
    const needsIncident = !dto.exercise || dto.source === 'CORO_INCIDENT';
    if (needsIncident && (!incident || !incident.isActive))
      throw new ConflictException('ACTIVE_INCIDENT_REQUIRED');
    if (incident && incident.isExercise !== dto.exercise)
      throw new ConflictException('INCIDENT_EXERCISE_CLASSIFICATION_MISMATCH');

    const isClearApproval = dto.commandType === 'APPROVE_CLEAR';
    let requestedClear: {
      id: string;
      requestedClearById: string | null;
      targetScope: Prisma.JsonValue;
      priority: DisplayOperationalPriority;
      incidentEventId: string | null;
    } | null = null;
    if (isClearApproval) {
      if (!dto.requestedClearCommandId)
        throw new BadRequestException('CLEAR_REQUEST_REQUIRED');
      requestedClear = await this.prisma.displayOperationalCommand.findFirst({
        where: {
          id: dto.requestedClearCommandId,
          organizationId,
          buildingId,
          type: 'REQUEST_CLEAR',
          status: { in: ['AUTHORIZED', 'QUEUED'] },
        },
        select: {
          id: true,
          requestedClearById: true,
          targetScope: true,
          priority: true,
          incidentEventId: true,
        },
      });
      if (!requestedClear)
        throw new ConflictException('CLEAR_REQUEST_NOT_ACTIVE');
      if (requestedClear.requestedClearById === actor.userId)
        throw new ForbiddenException('CLEAR_REQUIRES_DISTINCT_AUTHORIZER');
      if (requestedClear.incidentEventId !== (dto.incidentEventId ?? null))
        throw new ConflictException('CLEAR_INCIDENT_MISMATCH');
    }

    const targets = requestedClear
      ? await this.targetsFromScope(
          organizationId,
          buildingId,
          requestedClear.targetScope,
        )
      : await this.resolveTargets(
          organizationId,
          buildingId,
          dto.zoneIds,
          dto.deviceIds,
        );
    await this.requirePublishedPlans(
      organizationId,
      buildingId,
      targets.map((item) => item.id),
    );

    return this.prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.displayOperationalCommand.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
          select: { id: true },
        });
        if (duplicate) return this.commandView(duplicate.id, tx);

        const latest = await tx.displayOperationalCommand.aggregate({
          where: { organizationId, buildingId },
          _max: { sequence: true },
        });
        const sequence = Number(
          (latest._max.sequence ?? BigInt(0)) + BigInt(1),
        );
        const priority =
          requestedClear?.priority ?? commandPriority(dto.exercise);
        await this.rejectUnsafeConcurrency(
          tx,
          organizationId,
          buildingId,
          priority,
          dto.commandType,
          dto.incidentEventId,
        );

        const eventId = randomUUID();
        const commandId = randomUUID();
        const issuedAt = new Date();
        const targetScope = {
          zoneIds: dto.zoneIds,
          deviceIds: targets.map((item) => item.id).sort(),
          locationIds: targets.map((item) => item.locationId).sort(),
        };
        const authorization = {
          actorUserId: actor.userId,
          permission,
          organizationId,
          buildingId,
          reason: dto.reason,
          policyVersion: POLICY_VERSION,
        };
        const signedPayload = {
          schemaVersion: 1,
          commandId,
          incidentEventId: dto.incidentEventId ?? null,
          organizationId,
          buildingId,
          type: dto.commandType,
          priority,
          sequence,
          issuedAt: issuedAt.toISOString(),
          targetScope,
          correlationId: dto.correlationId,
          policyVersion: POLICY_VERSION,
        };
        const signature = await this.signer.sign(signedPayload);
        await tx.displayOperationalEvent.create({
          data: {
            id: eventId,
            organizationId,
            buildingId,
            zoneIds: dto.zoneIds,
            incidentEventId: dto.incidentEventId,
            protocolId: dto.protocolId,
            eventType: dto.eventType,
            severity: dto.severity,
            source: dto.source,
            exercise: dto.exercise,
            payloadVersion: 1,
            payload: dto.payload as Prisma.InputJsonValue,
            actorUserId: actor.userId,
            authorization,
            correlationId: dto.correlationId,
            causationId: dto.causationId,
            idempotencyKey: `${dto.idempotencyKey}:event`,
            status: 'COMMAND_CREATED',
            occurredAt: new Date(dto.occurredAt),
          },
        });
        await tx.displayOperationalCommand.create({
          data: {
            id: commandId,
            eventId,
            organizationId,
            buildingId,
            incidentEventId: dto.incidentEventId,
            type: dto.commandType,
            priority,
            targetScope,
            authorization,
            source: dto.source,
            correlationId: dto.correlationId,
            causationId: requestedClear?.id ?? dto.causationId,
            idempotencyKey: dto.idempotencyKey,
            policyVersion: POLICY_VERSION,
            sequence: BigInt(sequence),
            signedPayload,
            signingKeyId: this.signer.keyId,
            signature,
            status:
              dto.commandType === 'REQUEST_CLEAR' ? 'AUTHORIZED' : 'QUEUED',
            requestedClearById:
              dto.commandType === 'REQUEST_CLEAR' ? actor.userId : null,
            authorizedById: actor.userId,
            authorizedAt: issuedAt,
          },
        });
        if (dto.commandType !== 'REQUEST_CLEAR') {
          await tx.displayCommandDelivery.createMany({
            data: targets.map((target) => ({
              id: randomUUID(),
              commandId,
              organizationId,
              buildingId,
              deviceId: target.id,
            })),
          });
          await tx.displayCommandOutbox.create({
            data: { id: randomUUID(), commandId, organizationId, buildingId },
          });
        }
        if (requestedClear) {
          await tx.displayOperationalCommand.update({
            where: { id: requestedClear.id },
            data: {
              status: 'CLOSED',
              closedAt: issuedAt,
              lockVersion: { increment: 1 },
            },
          });
        }
        if (dto.incidentEventId) {
          await tx.incidentLog.create({
            data: {
              incidentEventId: dto.incidentEventId,
              action: `DISPLAY_${dto.commandType}`,
              actor: `USER:${actor.userId}`,
              details: `Commande ${commandId}; ${targets.length} écran(s); corrélation ${dto.correlationId}`,
              isAutomatic: false,
            },
          });
        }
        return this.commandView(commandId, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async poll(dto: DisplayCommandPollDto) {
    const device = await this.gateway.authenticateDeviceRequest(
      dto.proof,
      'POST',
      '/device-gateway/commands',
      { requestId: dto.requestId, afterSequence: dto.afterSequence },
    );
    return this.prisma.$transaction(async (tx) => {
      const deliveries = await tx.displayCommandDelivery.findMany({
        where: {
          deviceId: device.id,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          status: { in: ['QUEUED', 'DELIVERED'] },
          command: dto.afterSequence
            ? { sequence: { gt: BigInt(dto.afterSequence) } }
            : undefined,
        },
        include: { command: true },
        orderBy: { command: { sequence: 'asc' } },
        take: 50,
      });
      const now = new Date();
      const queued = deliveries
        .filter((item) => item.status === 'QUEUED')
        .map((item) => item.id);
      if (queued.length) {
        await tx.displayCommandDelivery.updateMany({
          where: { id: { in: queued }, status: 'QUEUED' },
          data: {
            status: 'DELIVERED',
            deliveredAt: now,
            attemptCount: { increment: 1 },
            lockVersion: { increment: 1 },
          },
        });
      }
      const commandIds = [...new Set(deliveries.map((item) => item.commandId))];
      if (commandIds.length) {
        await tx.displayCommandOutbox.updateMany({
          where: {
            commandId: { in: commandIds },
            status: { in: ['PENDING', 'CLAIMED'] },
          },
          data: {
            status: 'DISPATCHED',
            dispatchedAt: now,
            attemptCount: { increment: 1 },
          },
        });
      }
      return {
        commands: deliveries.map((item) => ({
          keyId: item.command.signingKeyId,
          algorithm: 'Ed25519',
          payload: item.command.signedPayload,
          signature: item.command.signature,
          transportStatus: item.status === 'QUEUED' ? 'DELIVERED' : item.status,
        })),
        physicalDisplayProof: false,
      };
    });
  }

  async acknowledge(dto: AcknowledgeDisplayCommandDto) {
    const declared = {
      requestId: dto.requestId,
      commandId: dto.commandId,
      status: dto.status,
      observedAt: dto.observedAt,
      errorCode: dto.errorCode,
      declaredState: dto.declaredState,
    };
    const device = await this.gateway.authenticateDeviceRequest(
      dto.proof,
      'POST',
      '/device-gateway/commands/ack',
      declared,
    );
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.displayCommandDelivery.findFirst({
        where: {
          commandId: dto.commandId,
          deviceId: device.id,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
        },
        include: { command: true },
      });
      if (!delivery) throw new NotFoundException('COMMAND_DELIVERY_NOT_FOUND');
      if (delivery.ackRequestId === dto.requestId)
        return { accepted: true, duplicate: true, status: delivery.status };
      if (!canTransitionDelivery(delivery.status, dto.status))
        throw new ConflictException('COMMAND_ACK_TRANSITION_INVALID');
      const observedAt = new Date(dto.observedAt);
      await tx.displayCommandDelivery.update({
        where: { id: delivery.id },
        data: {
          status: dto.status,
          ackRequestId: dto.requestId,
          receivedAt:
            dto.status === 'RECEIVED' ? observedAt : delivery.receivedAt,
          appliedAt: dto.status === 'APPLIED' ? observedAt : delivery.appliedAt,
          failedAt: ['FAILED', 'REJECTED', 'STALE'].includes(dto.status)
            ? observedAt
            : null,
          errorCode: dto.errorCode,
          declaredState: dto.declaredState as Prisma.InputJsonValue,
          lockVersion: { increment: 1 },
        },
      });
      await tx.displayDeviceEvent.create({
        data: {
          id: randomUUID(),
          deviceId: device.id,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          eventType: `COMMAND_${dto.status}`,
          requestId: dto.requestId,
          declaredState: {
            commandId: dto.commandId,
            observedAt: dto.observedAt,
            errorCode: dto.errorCode ?? null,
            physicalDisplayProof: false,
          },
          verifiedAt: new Date(),
        },
      });
      if (['FAILED', 'REJECTED', 'STALE'].includes(dto.status)) {
        await tx.displayOperationalEscalation.upsert({
          where: {
            deliveryId_code: {
              deliveryId: delivery.id,
              code: dto.errorCode ?? `COMMAND_${dto.status}`,
            },
          },
          create: {
            id: randomUUID(),
            deliveryId: delivery.id,
            organizationId: device.organizationId,
            buildingId: device.buildingId,
            deviceId: device.id,
            incidentEventId: delivery.command.incidentEventId,
            code: dto.errorCode ?? `COMMAND_${dto.status}`,
            severity:
              delivery.command.priority === 'EMERGENCY_REAL'
                ? 'CRITICAL'
                : 'MAJOR',
            dueAt: new Date(Date.now() + 5 * 60_000),
            details: {
              commandId: delivery.commandId,
              declaredStatus: dto.status,
              source: 'DEVICE_ACKNOWLEDGEMENT',
              externalNotificationSent: false,
            },
          },
          update: {},
        });
      }
      await this.reconcileCommand(tx, delivery.commandId);
      return {
        accepted: true,
        duplicate: false,
        status: dto.status,
        physicalDisplayProof: false,
      };
    });
  }

  async supervision(
    organizationId: string,
    buildingId: string,
    actor: SpatialActor,
  ) {
    await this.spatial.require(
      actor,
      organizationId,
      buildingId,
      DisplayPermission.DISPLAY_READ,
    );
    const commands = await this.prisma.displayOperationalCommand.findMany({
      where: { organizationId, buildingId },
      include: { deliveries: { orderBy: { deviceId: 'asc' } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 100,
    });
    const escalations = await this.prisma.displayOperationalEscalation.findMany(
      {
        where: { organizationId, buildingId, status: { not: 'RESOLVED' } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: 100,
      },
    );
    return {
      generatedAt: new Date().toISOString(),
      physicalObservationIncluded: false,
      escalations,
      commands: commands.map((command) => ({
        ...command,
        sequence: Number(command.sequence),
        statusSummary: Object.fromEntries(
          Object.values(DisplayCommandDeliveryStatus).map((status) => [
            status,
            command.deliveries.filter((delivery) => delivery.status === status)
              .length,
          ]),
        ),
      })),
    };
  }

  private requiredPermission(type: DisplayOperationalCommandType) {
    if (
      type === 'REQUEST_CLEAR' ||
      type === 'APPROVE_CLEAR' ||
      type === 'RESTORE_NORMAL' ||
      type === 'CANCEL_EXERCISE'
    )
      return DisplayPermission.DISPLAY_EMERGENCY_RESET;
    if (
      type === 'ENTER_EMERGENCY' ||
      type === 'ENTER_EXERCISE' ||
      type === 'MAINTAIN_EMERGENCY'
    )
      return DisplayPermission.DISPLAY_EMERGENCY_ACTIVATE;
    return DisplayPermission.DISPLAY_COMMAND;
  }

  private validateSource(dto: IssueDisplayOperationalCommandDto) {
    if (dto.source === 'BUILDING_BRIDGE_FUTURE')
      throw new ForbiddenException('BUILDING_BRIDGE_NOT_ENABLED');
    if (dto.source === 'CORO_OPS' || dto.source === 'CORO_INCIDENT')
      throw new ForbiddenException(
        'MACHINE_EVENT_SOURCE_REQUIRES_TRUSTED_ADAPTER',
      );
    if (dto.source === 'SIMULATOR' && !dto.exercise)
      throw new ForbiddenException('SIMULATOR_SOURCE_REQUIRES_EXERCISE');
    if (dto.commandType === 'RESTORE_NORMAL')
      throw new ForbiddenException(
        'DIRECT_RESTORE_FORBIDDEN_USE_GOVERNED_CLEAR',
      );
    if (JSON.stringify(dto.payload).length > 16_384)
      throw new BadRequestException('EVENT_PAYLOAD_TOO_LARGE');
  }

  private async resolveTargets(
    organizationId: string,
    buildingId: string,
    zoneIds: string[],
    deviceIds: string[],
  ) {
    const uniqueZones = [...new Set(zoneIds)];
    if (uniqueZones.length) {
      const zones = await this.prisma.buildingZone.findMany({
        where: {
          id: { in: uniqueZones },
          organizationId,
          buildingId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (zones.length !== uniqueZones.length)
        throw new ForbiddenException('TARGET_ZONE_SCOPE_INVALID');
    }
    const locations = await this.prisma.displayLocation.findMany({
      where: {
        organizationId,
        buildingId,
        status: 'ACTIVE',
        zoneId: uniqueZones.length ? { in: uniqueZones } : undefined,
      },
      select: { id: true },
    });
    const locationIds = locations.map((item) => item.id);
    const devices = await this.prisma.displayDevice.findMany({
      where: {
        organizationId,
        buildingId,
        locationId: { in: locationIds },
        status: 'ACTIVE',
        revokedAt: null,
        id: deviceIds.length ? { in: [...new Set(deviceIds)] } : undefined,
      },
      select: { id: true, locationId: true },
      orderBy: { id: 'asc' },
    });
    if (!devices.length)
      throw new ConflictException('NO_ELIGIBLE_DISPLAY_DEVICE');
    if (deviceIds.length && devices.length !== new Set(deviceIds).size)
      throw new ForbiddenException('TARGET_DEVICE_SCOPE_INVALID');
    return devices;
  }

  private async targetsFromScope(
    organizationId: string,
    buildingId: string,
    scope: Prisma.JsonValue,
  ) {
    const value = scope as { deviceIds?: unknown };
    if (
      !Array.isArray(value.deviceIds) ||
      !value.deviceIds.every((id) => typeof id === 'string')
    )
      throw new ConflictException('CLEAR_TARGET_SCOPE_INVALID');
    return this.resolveTargets(organizationId, buildingId, [], value.deviceIds);
  }

  private async requirePublishedPlans(
    organizationId: string,
    buildingId: string,
    deviceIds: string[],
  ) {
    const assignments = await this.prisma.displayDeviceAssignment.findMany({
      where: {
        organizationId,
        buildingId,
        deviceId: { in: deviceIds },
        status: 'ACTIVE',
      },
      select: { deviceId: true, publicationId: true, locationId: true },
    });
    const publications = await this.prisma.displayPlanPublication.findMany({
      where: {
        id: { in: assignments.map((item) => item.publicationId) },
        organizationId,
        buildingId,
        status: 'PUBLISHED',
        revokedAt: null,
        variantSha256: { not: null },
      },
      select: { id: true, locationId: true },
    });
    const valid = new Set(
      publications.map((item) => `${item.id}:${item.locationId}`),
    );
    const eligible = new Set(
      assignments
        .filter((item) => valid.has(`${item.publicationId}:${item.locationId}`))
        .map((item) => item.deviceId),
    );
    if (deviceIds.some((id) => !eligible.has(id)))
      throw new ConflictException('APPROVED_PLAN_REQUIRED_FOR_ALL_TARGETS');
  }

  private async rejectUnsafeConcurrency(
    tx: Prisma.TransactionClient,
    organizationId: string,
    buildingId: string,
    priority: DisplayOperationalPriority,
    type: DisplayOperationalCommandType,
    incidentEventId?: string,
  ) {
    const active = await tx.displayOperationalCommand.findMany({
      where: {
        organizationId,
        buildingId,
        status: { notIn: TERMINAL_COMMANDS },
      },
      select: { priority: true, incidentEventId: true },
    });
    const rank = {
      NORMAL_CYCLE: 0,
      PERMANENT_PLAN: 1,
      EMERGENCY_EXERCISE: 2,
      EMERGENCY_REAL: 3,
    };
    if (active.some((item) => rank[item.priority] > rank[priority]))
      throw new ConflictException('HIGHER_PRIORITY_COMMAND_ACTIVE');
    if (
      ['APPROVE_CLEAR', 'CANCEL_EXERCISE'].includes(type) &&
      active.some(
        (item) =>
          item.priority === 'EMERGENCY_REAL' &&
          item.incidentEventId !== incidentEventId,
      )
    )
      throw new ConflictException('CONCURRENT_REAL_EMERGENCY_PREVENTS_CLEAR');
  }

  private async reconcileCommand(
    tx: Prisma.TransactionClient,
    commandId: string,
  ) {
    const deliveries = await tx.displayCommandDelivery.findMany({
      where: { commandId },
      select: { status: true },
    });
    if (!deliveries.length) return;
    let status: 'APPLIED' | 'FAILED' | 'PARTIALLY_CONFIRMED' | undefined;
    if (deliveries.every((item) => item.status === 'APPLIED'))
      status = 'APPLIED';
    else if (
      deliveries.every((item) =>
        ['FAILED', 'REJECTED', 'STALE', 'SUPERSEDED'].includes(item.status),
      )
    )
      status = 'FAILED';
    else if (
      deliveries.some(
        (item) => item.status !== 'QUEUED' && item.status !== 'DELIVERED',
      )
    )
      status = 'PARTIALLY_CONFIRMED';
    if (status)
      await tx.displayOperationalCommand.update({
        where: { id: commandId },
        data: { status, lockVersion: { increment: 1 } },
      });
  }

  private commandView(
    id: string,
    tx: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return tx.displayOperationalCommand.findUniqueOrThrow({
      where: { id },
      include: { deliveries: { orderBy: { deviceId: 'asc' } }, outbox: true },
    });
  }
}
