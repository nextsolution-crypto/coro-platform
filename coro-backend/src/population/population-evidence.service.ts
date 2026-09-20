import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CoroActorType,
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationDeliveryProviderEventType,
  PopulationDeliveryStatus,
  PopulationEvidenceStatus,
  PopulationOperationalEventStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const POPULATION_EVIDENCE_SCHEMA_VERSION = 'population-evidence/v1';

export function canonicalizeEvidence(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite evidence number');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeEvidence).join(',')}]`;
  }
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return `{${Object.keys(source)
      .sort()
      .filter((key) => source[key] !== undefined)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeEvidence(source[key])}`,
      )
      .join(',')}}`;
  }
  throw new Error('Unsupported evidence value');
}

export function hashEvidenceSnapshot(value: unknown): string {
  return createHash('sha256')
    .update(canonicalizeEvidence(value), 'utf8')
    .digest('hex');
}

export function deriveEvidenceCompletionStatus(input: {
  hasAllClear: boolean;
  outcomeUnknown: number;
  retryPending: number;
  queued: number;
  sending: number;
  failed: number;
  suppressed: number;
  cancelled: number;
  closeReason: string | null;
}) {
  if (
    !input.hasAllClear ||
    input.outcomeUnknown > 0 ||
    input.retryPending > 0 ||
    input.queued > 0 ||
    input.sending > 0
  ) {
    return 'INCOMPLETE' as const;
  }
  if (
    input.failed > 0 ||
    input.suppressed > 0 ||
    input.cancelled > 0 ||
    Boolean(input.closeReason)
  ) {
    return 'COMPLETE_WITH_EXCEPTIONS' as const;
  }
  return 'COMPLETE' as const;
}

@Injectable()
export class PopulationEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async generateV1(
    buildingId: string,
    organizationId: string,
    eventId: string,
    actor: { type: CoroActorType; id: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;

      const existing = await tx.populationEvidenceRecord.findFirst({
        where: {
          operationalEventId: eventId,
          version: 1,
          organizationId,
          buildingId,
        },
      });
      if (existing) return existing;

      const source = await this.loadEvidenceSource(
        tx,
        buildingId,
        organizationId,
        eventId,
      );
      if (source.status !== PopulationOperationalEventStatus.ENDED) {
        throw new BadRequestException(
          'Le dossier de preuve est générable uniquement après la clôture de l’événement',
        );
      }

      const referenceRows = await tx.$queryRaw<
        Array<{ sequence: bigint; year: string }>
      >`SELECT nextval('"PopulationEvidenceReferenceSeq"') AS sequence,
          to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY') AS year`;
      const reference = `CORO-SP-${referenceRows[0].year}-${referenceRows[0].sequence
        .toString()
        .padStart(6, '0')}`;
      const generatedAt = new Date();
      const snapshot = await this.buildSnapshot(
        tx,
        source,
        reference,
        generatedAt,
      );
      const snapshotSha256 = hashEvidenceSnapshot(snapshot);

      return tx.populationEvidenceRecord.create({
        data: {
          organizationId,
          buildingId,
          programId: source.programId,
          operationalEventId: eventId,
          reference,
          schemaVersion: POPULATION_EVIDENCE_SCHEMA_VERSION,
          version: 1,
          status: PopulationEvidenceStatus.FINALIZED,
          generatedAt,
          generatedByType: actor.type,
          generatedById: actor.id,
          finalizedAt: generatedAt,
          finalizedByType: actor.type,
          finalizedById: actor.id,
          snapshot: snapshot as Prisma.InputJsonValue,
          snapshotSha256,
        },
      });
    });
  }

  async getForEvent(
    buildingId: string,
    organizationId: string,
    eventId: string,
  ) {
    const record = await this.prisma.populationEvidenceRecord.findFirst({
      where: { buildingId, organizationId, operationalEventId: eventId },
      orderBy: { version: 'desc' },
    });
    if (!record) throw new NotFoundException('Dossier de preuve introuvable');
    return record;
  }

  async getById(
    buildingId: string,
    organizationId: string,
    evidenceId: string,
  ) {
    const record = await this.prisma.populationEvidenceRecord.findFirst({
      where: { id: evidenceId, buildingId, organizationId },
    });
    if (!record) throw new NotFoundException('Dossier de preuve introuvable');
    return record;
  }

  private async loadEvidenceSource(
    tx: Prisma.TransactionClient,
    buildingId: string,
    organizationId: string,
    eventId: string,
  ): Promise<any> {
    const event = await tx.populationOperationalEvent.findFirst({
      where: {
        id: eventId,
        organizationId,
        program: { rueFacilityProfile: { buildingId } },
      },
      include: {
        organization: true,
        program: { include: { rueFacilityProfile: { include: { building: true } } } },
        emergencyScenario: true,
        alerts: {
          orderBy: [{ cycleSequence: 'asc' }, { createdAt: 'asc' }],
          include: {
            zones: { orderBy: { zoneCodeSnapshot: 'asc' } },
            deliveries: {
              orderBy: [{ channel: 'asc' }, { id: 'asc' }],
              include: {
                providerEvents: {
                  orderBy: [
                    { providerOccurredAt: 'asc' },
                    { receivedAt: 'asc' },
                    { id: 'asc' },
                  ],
                },
              },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Événement Population introuvable');
    return event;
  }

  private async resolveActors(
    tx: Prisma.TransactionClient,
    organizationId: string,
    refs: Array<{ type: CoroActorType | null; id: string | null }>,
  ) {
    const clientIds = refs
      .filter((ref) => ref.type === CoroActorType.CLIENT_USER && ref.id)
      .map((ref) => ref.id!);
    const userIds = refs
      .filter((ref) => ref.type === CoroActorType.USER && ref.id)
      .map((ref) => ref.id!);
    const [clients, users] = await Promise.all([
      tx.clientUser.findMany({
        where: { id: { in: clientIds }, organizationId },
        select: { id: true, firstName: true, lastName: true, role: true },
      }),
      tx.user.findMany({
        where: { id: { in: userIds }, organizationId },
        select: { id: true, firstName: true, lastName: true, role: true, title: true },
      }),
    ]);
    const names = new Map<string, { displayName: string; role: string | null }>();
    for (const actor of clients) {
      names.set(`${CoroActorType.CLIENT_USER}:${actor.id}`, {
        displayName: `${actor.firstName} ${actor.lastName}`.trim(),
        role: actor.role,
      });
    }
    for (const actor of users) {
      names.set(`${CoroActorType.USER}:${actor.id}`, {
        displayName: `${actor.firstName} ${actor.lastName}`.trim(),
        role: actor.title ?? actor.role,
      });
    }
    return (type: CoroActorType | null, id: string | null) => {
      if (!type || !id) return null;
      if (type === CoroActorType.SYSTEM) {
        return { actorType: type, actorId: id, displayName: 'CORO System', role: null };
      }
      const resolved = names.get(`${type}:${id}`);
      return {
        actorType: type,
        actorId: id,
        displayName: resolved?.displayName ?? null,
        role: resolved?.role ?? null,
      };
    };
  }

  private iso(value: Date | null | undefined) {
    return value ? value.toISOString() : null;
  }

  private safeTargeting(snapshot: unknown) {
    const source = (snapshot ?? {}) as any;
    const targeting = source.targeting ?? {};
    const population = source.population ?? {};
    const allowed = [
      'strategy',
      'zoneCount',
      'currentZoneSubscriberCount',
      'historicalSubscriberCount',
      'unionBeforeDeduplicationCount',
      'uniqueTargetCount',
      'overlapSubscriberCount',
      'revalidationSuppressedSubscriberCount',
      'deliverableSubscriberCount',
      'activeSubscriberCount',
      'geolocatedSubscriberCount',
      'unlocatedSubscriberCount',
      'smsTargetCount',
      'emailTargetCount',
    ];
    const result: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = targeting[key] ?? population[key];
      if (typeof value === 'number' || typeof value === 'string') result[key] = value;
    }
    return result;
  }

  private async buildSnapshot(
    tx: Prisma.TransactionClient,
    event: any,
    reference: string,
    generatedAt: Date,
  ) {
    const actorRefs = [
      { type: event.startedByType, id: event.startedById },
      { type: event.endedByType, id: event.endedById },
      ...event.alerts.flatMap((alert: any) => [
        { type: alert.createdByType, id: alert.createdById },
        { type: alert.readyByType, id: alert.readyById },
        { type: alert.approvedByType, id: alert.approvedById },
        { type: alert.frozenByType, id: alert.frozenById },
        { type: alert.sentByType, id: alert.sentById },
        { type: alert.endedByType, id: alert.endedById },
      ]),
    ];
    const actor = await this.resolveActors(tx, event.organizationId, actorRefs);

    const communications = event.alerts.map((alert: any) => {
      const statusCounts: Record<string, number> = {};
      for (const status of Object.values(PopulationDeliveryStatus)) statusCounts[status] = 0;
      for (const delivery of alert.deliveries) statusCounts[delivery.status] += 1;
      const providerEvents = alert.deliveries
        .flatMap((delivery: any) => delivery.providerEvents)
        .sort(
          (left: any, right: any) =>
            left.providerOccurredAt.getTime() - right.providerOccurredAt.getTime() ||
            left.receivedAt.getTime() - right.receivedAt.getTime() ||
            left.id?.localeCompare(right.id ?? '') || 0,
        );
      const providerCounts: Record<string, number> = {};
      for (const type of Object.values(PopulationDeliveryProviderEventType)) providerCounts[type] = 0;
      for (const providerEvent of providerEvents) providerCounts[providerEvent.eventType] += 1;
      const messageVariants = Array.from(
        new Map(
          alert.deliveries.map((delivery: any) => [
            `${delivery.channel}:${delivery.language}:${delivery.messageSnapshot}`,
            {
              channel: delivery.channel,
              language: delivery.language,
              message: delivery.messageSnapshot,
            },
          ]),
        ).values(),
      ).sort((a: any, b: any) => {
        const left = canonicalizeEvidence(a);
        const right = canonicalizeEvidence(b);
        return left < right ? -1 : left > right ? 1 : 0;
      });
      const outcomeUnknown = alert.deliveries.filter((delivery: any) => delivery.outcomeUnknownAt).length;
      const retryPending = alert.deliveries.filter(
        (delivery: any) => delivery.status === PopulationDeliveryStatus.QUEUED && delivery.nextAttemptAt,
      ).length;
      const targeting = this.safeTargeting(alert.contextSnapshot);
      return {
        id: alert.id,
        cycleSequence: alert.cycleSequence,
        type: alert.type,
        status: alert.status,
        deliveryMode: alert.deliveryModeSnapshot,
        content: {
          titleFR: alert.titleFR,
          titleEN: alert.titleEN,
          messageFR: alert.messageFR,
          messageEN: alert.messageEN,
          instructionFR: alert.instructionFR,
          instructionEN: alert.instructionEN,
          materializedVariants: messageVariants,
        },
        timestamps: {
          createdAt: this.iso(alert.createdAt),
          readyAt: this.iso(alert.readyAt),
          approvedAt: this.iso(alert.approvedAt),
          recipientsFrozenAt: this.iso(alert.recipientsFrozenAt),
          sendingAt: this.iso(alert.sendingAt),
          activatedAt: this.iso(alert.activatedAt),
          endedAt: this.iso(alert.endedAt),
        },
        actors: {
          createdBy: actor(alert.createdByType, alert.createdById),
          readyBy: actor(alert.readyByType, alert.readyById),
          approvedBy: actor(alert.approvedByType, alert.approvedById),
          frozenBy: actor(alert.frozenByType, alert.frozenById),
          sentBy: actor(alert.sentByType, alert.sentById),
          endedBy: actor(alert.endedByType, alert.endedById),
        },
        zones: alert.zones.map((zone: any) => ({
          code: zone.zoneCodeSnapshot,
          nameFR: zone.zoneNameFRSnapshot,
          nameEN: zone.zoneNameENSnapshot,
          maxDistanceKm: zone.maxDistanceKmSnapshot,
          protectiveAction: zone.protectiveActionSnapshot,
          targetedSubscriberCount: zone.targetedSubscriberCount,
          geometry: zone.geometrySnapshot
            ? {
                classification: 'RESTRICTED_INDUSTRIAL_IMPACT_ZONE',
                present: true,
                sha256: hashEvidenceSnapshot(zone.geometrySnapshot),
              }
            : { classification: 'NONE', present: false, sha256: null },
        })),
        targeting,
        deliverySummary: {
          targeted: targeting.uniqueTargetCount ?? null,
          materialized: alert.deliveries.length,
          deliverable: targeting.deliverableSubscriberCount ?? alert.deliveries.length,
          emailCount: alert.deliveries.filter((delivery: any) => delivery.channel === 'EMAIL').length,
          smsCount: alert.deliveries.filter((delivery: any) => delivery.channel === 'SMS').length,
          queuedFinal: statusCounts.QUEUED,
          sendingFinal: statusCounts.SENDING,
          sent: statusCounts.SENT,
          delivered: statusCounts.DELIVERED,
          failed: statusCounts.FAILED,
          suppressed: statusCounts.SUPPRESSED,
          cancelled: statusCounts.CANCELLED,
          outcomeUnknown,
          retryPending,
          totalAttempts: alert.deliveries.reduce((sum: number, delivery: any) => sum + delivery.attemptCount, 0),
        },
        providerSummary: {
          counts: providerCounts,
          firstProviderOccurredAt: this.iso(providerEvents[0]?.providerOccurredAt),
          lastProviderOccurredAt: this.iso(providerEvents.at(-1)?.providerOccurredAt),
          firstReceivedAt: this.iso(
            [...providerEvents].sort((a: any, b: any) => a.receivedAt - b.receivedAt)[0]?.receivedAt,
          ),
          lastReceivedAt: this.iso(
            [...providerEvents].sort((a: any, b: any) => a.receivedAt - b.receivedAt).at(-1)?.receivedAt,
          ),
        },
      };
    });

    const totals = communications.reduce(
      (sum: any, communication: any) => {
        sum.deliveryCount += communication.deliverySummary.materialized;
        for (const key of ['sent', 'delivered', 'failed', 'suppressed', 'cancelled', 'outcomeUnknown', 'retryPending']) {
          sum[key] += communication.deliverySummary[key];
        }
        return sum;
      },
      { deliveryCount: 0, sent: 0, delivered: 0, failed: 0, suppressed: 0, cancelled: 0, outcomeUnknown: 0, retryPending: 0 },
    );
    const allClear = communications.find((item: any) => item.type === PopulationAlertType.ALL_CLEAR);
    const completionStatus = deriveEvidenceCompletionStatus({
      hasAllClear: Boolean(allClear),
      outcomeUnknown: totals.outcomeUnknown,
      retryPending: totals.retryPending,
      queued: communications.reduce(
        (sum: number, item: any) => sum + item.deliverySummary.queuedFinal,
        0,
      ),
      sending: communications.reduce(
        (sum: number, item: any) => sum + item.deliverySummary.sendingFinal,
        0,
      ),
      failed: totals.failed,
      suppressed: totals.suppressed,
      cancelled: totals.cancelled,
      closeReason: event.closeReason,
    });
    const building = event.program.rueFacilityProfile.building;
    const scenario = event.emergencyScenario;

    return {
      schemaVersion: POPULATION_EVIDENCE_SCHEMA_VERSION,
      reference,
      version: 1,
      generatedAt: generatedAt.toISOString(),
      timezone: null,
      organization: { id: event.organization.id, name: event.organization.name },
      building: {
        id: building.id,
        name: building.name,
        address: building.address,
        city: building.city,
        province: building.province,
        postalCode: building.postalCode,
        buildingType: building.buildingType,
      },
      program: {
        id: event.program.id,
        publicSlug: event.program.publicSlug,
        status: event.program.status,
        deliveryMode: event.program.deliveryMode,
        governanceMode: event.program.governanceMode,
        registrationEnabled: event.program.registrationEnabled,
        emailEnabled: event.program.emailEnabled,
        smsEnabled: event.program.smsEnabled,
      },
      scenario: {
        id: scenario.id,
        nameFR: scenario.nameFR,
        nameEN: scenario.nameEN,
        description: scenario.description,
        type: scenario.type,
        eventType: scenario.eventType,
        releaseDescription: scenario.releaseDescription,
        potentialEffects: scenario.potentialEffects,
        impactDistanceKm: scenario.impactDistanceKm,
        impactMethod: scenario.impactMethod,
        defaultProtectiveAction: scenario.defaultProtectiveAction,
        version: null,
      },
      event: {
        id: event.id,
        status: event.status,
        incidentEventId: event.incidentEventId,
        startedAt: this.iso(event.startedAt),
        endedAt: this.iso(event.endedAt),
        communicationCount: communications.length,
        startedBy: actor(event.startedByType, event.startedById),
        endedBy: actor(event.endedByType, event.endedById),
      },
      communications,
      summary: { communicationCount: communications.length, ...totals, completionStatus },
      closure: {
        endedAt: this.iso(event.endedAt),
        endedBy: actor(event.endedByType, event.endedById),
        closeReason: event.closeReason,
        forceClose: null,
      },
    };
  }
}
