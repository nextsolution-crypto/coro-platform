import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DisplayOrchestrationService } from './display-orchestration.service';

const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const NO_SCREEN_RECHECK_MS = 60_000;

/**
 * M10-01 — a Sentinelle incident (real or exercise) puts the building's
 * screens in emergency mode without anyone opening CORO Display. Every
 * screen's acknowledgement is then written in the incident log by the
 * orchestration service. Closing an exercise returns its screens to normal;
 * a real emergency keeps the governed two-person clear.
 */
@Injectable()
export class DisplayIncidentBridgeService {
  private readonly logger = new Logger(DisplayIncidentBridgeService.name);
  private readonly quietUntil = new Map<string, number>();
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestration: DisplayOrchestrationService,
  ) {}

  @Interval(5_000)
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.openForActiveIncidents();
      await this.closeForEndedIncidents();
    } catch (error) {
      this.logger.error(
        `Pont incident → écrans : ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  async openForActiveIncidents(now = new Date()) {
    const incidents = await this.prisma.incidentEvent.findMany({
      where: {
        isActive: true,
        createdAt: { gte: new Date(now.getTime() - LOOKBACK_MS) },
      },
      select: {
        id: true,
        organizationId: true,
        buildingId: true,
        type: true,
        isExercise: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    if (!incidents.length) return 0;
    const already = await this.prisma.displayOperationalCommand.findMany({
      where: {
        incidentEventId: { in: incidents.map((item) => item.id) },
        type: { in: ['ENTER_EMERGENCY', 'ENTER_EXERCISE'] },
      },
      select: { incidentEventId: true },
    });
    const done = new Set(already.map((item) => item.incidentEventId));
    let issued = 0;
    for (const incident of incidents) {
      if (done.has(incident.id)) continue;
      if ((this.quietUntil.get(incident.id) ?? 0) > now.getTime()) continue;
      if (!incident.organizationId || !incident.buildingId) continue;
      const screens = await this.eligibleScreens(
        incident.organizationId,
        incident.buildingId,
      );
      if (!screens.eligible.length) {
        this.quietUntil.set(incident.id, now.getTime() + NO_SCREEN_RECHECK_MS);
        if (screens.withoutPlan.length)
          await this.logOnce(
            incident.id,
            'DISPLAY_AUTO_SKIPPED',
            `${screens.withoutPlan.length} écran(s) sans plan publié : mode urgence non envoyé / ${screens.withoutPlan.length} screen(s) without a published plan: emergency mode not sent`,
          );
        continue;
      }
      const commandType = incident.isExercise ? 'ENTER_EXERCISE' : 'ENTER_EMERGENCY';
      try {
        await this.orchestration.issueFromIncident(
          incident.organizationId,
          incident.buildingId,
          {
            idempotencyKey: `coro-incident:${incident.id}:enter`,
            correlationId: `coro-incident:${incident.id}`,
            incidentEventId: incident.id,
            source: 'CORO_INCIDENT',
            severity: incident.isExercise ? 'MAJOR' : 'CRITICAL',
            commandType,
            eventType: String(incident.type).slice(0, 100),
            exercise: incident.isExercise,
            occurredAt: incident.createdAt.toISOString(),
            zoneIds: [],
            deviceIds: screens.eligible,
            payload: { incidentType: incident.type, exercise: incident.isExercise },
            reason: 'Déclenchement automatique par l’incident Sentinelle',
          },
        );
        issued += 1;
        if (screens.withoutPlan.length)
          await this.logOnce(
            incident.id,
            'DISPLAY_AUTO_PARTIAL',
            `${screens.withoutPlan.length} écran(s) sans plan publié n’ont pas reçu le mode urgence / ${screens.withoutPlan.length} screen(s) without a published plan did not receive emergency mode`,
          );
      } catch (error) {
        const code = error instanceof Error ? error.message : String(error);
        this.quietUntil.set(incident.id, now.getTime() + NO_SCREEN_RECHECK_MS);
        await this.logOnce(
          incident.id,
          'DISPLAY_AUTO_FAILED',
          `Mode urgence des écrans non envoyé (${code}) — à déclencher depuis CORO Display / Screens emergency mode not sent — trigger it from CORO Display`,
        );
      }
    }
    return issued;
  }

  async closeForEndedIncidents(now = new Date()) {
    const commands = await this.prisma.displayOperationalCommand.findMany({
      where: {
        type: { in: ['ENTER_EMERGENCY', 'ENTER_EXERCISE'] },
        source: 'CORO_INCIDENT',
        createdAt: { gte: new Date(now.getTime() - LOOKBACK_MS) },
        incidentEventId: { not: null },
      },
      select: {
        incidentEventId: true,
        organizationId: true,
        buildingId: true,
        type: true,
        targetScope: true,
      },
      take: 200,
    });
    if (!commands.length) return 0;
    const ids = [...new Set(commands.map((item) => item.incidentEventId!))];
    const ended = await this.prisma.incidentEvent.findMany({
      where: { id: { in: ids }, isActive: false },
      select: { id: true, isExercise: true },
    });
    if (!ended.length) return 0;
    const cancelled = await this.prisma.displayOperationalCommand.findMany({
      where: { incidentEventId: { in: ended.map((item) => item.id) }, type: 'CANCEL_EXERCISE' },
      select: { incidentEventId: true },
    });
    const cancelledIds = new Set(cancelled.map((item) => item.incidentEventId));
    let closed = 0;
    for (const incident of ended) {
      const command = commands.find((item) => item.incidentEventId === incident.id)!;
      if (!incident.isExercise) {
        await this.logOnce(
          incident.id,
          'DISPLAY_CLEAR_REQUIRED',
          'Incident fermé : les écrans restent en mode urgence jusqu’à la levée à deux personnes dans CORO Display / Incident closed: screens stay in emergency mode until the two-person clear in CORO Display',
        );
        continue;
      }
      if (cancelledIds.has(incident.id)) continue;
      if ((this.quietUntil.get(`close:${incident.id}`) ?? 0) > now.getTime()) continue;
      const scope = command.targetScope as { deviceIds?: unknown };
      const deviceIds = Array.isArray(scope?.deviceIds)
        ? scope.deviceIds.filter((id): id is string => typeof id === 'string')
        : [];
      try {
        await this.orchestration.issueFromIncident(command.organizationId, command.buildingId, {
          idempotencyKey: `coro-incident:${incident.id}:cancel-exercise`,
          correlationId: `coro-incident:${incident.id}`,
          incidentEventId: incident.id,
          source: 'CORO_INCIDENT',
          severity: 'INFORMATION',
          commandType: 'CANCEL_EXERCISE',
          eventType: 'EXERCISE_CLOSED',
          exercise: true,
          occurredAt: now.toISOString(),
          zoneIds: [],
          deviceIds,
          payload: { reason: 'EXERCISE_CLOSED' },
          reason: 'Fin automatique de l’exercice Sentinelle',
        });
        closed += 1;
      } catch (error) {
        this.quietUntil.set(`close:${incident.id}`, now.getTime() + NO_SCREEN_RECHECK_MS);
        await this.logOnce(
          incident.id,
          'DISPLAY_EXERCISE_END_FAILED',
          `Retour à la normale des écrans non envoyé (${error instanceof Error ? error.message : String(error)}) / Screens not returned to normal`,
        );
      }
    }
    return closed;
  }

  /** Active, enrolled screens of the building, split by "has a published plan". */
  async eligibleScreens(organizationId: string, buildingId: string) {
    const locations = await this.prisma.displayLocation.findMany({
      where: { organizationId, buildingId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!locations.length) return { eligible: [] as string[], withoutPlan: [] as string[] };
    const devices = await this.prisma.displayDevice.findMany({
      where: {
        organizationId,
        buildingId,
        status: 'ACTIVE',
        revokedAt: null,
        locationId: { in: locations.map((item) => item.id) },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (!devices.length) return { eligible: [] as string[], withoutPlan: [] as string[] };
    const assignments = await this.prisma.displayDeviceAssignment.findMany({
      where: {
        organizationId,
        buildingId,
        deviceId: { in: devices.map((item) => item.id) },
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
    const valid = new Set(publications.map((item) => `${item.id}:${item.locationId}`));
    const withPlan = new Set(
      assignments
        .filter((item) => valid.has(`${item.publicationId}:${item.locationId}`))
        .map((item) => item.deviceId),
    );
    return {
      eligible: devices.filter((item) => withPlan.has(item.id)).map((item) => item.id),
      withoutPlan: devices.filter((item) => !withPlan.has(item.id)).map((item) => item.id),
    };
  }

  private async logOnce(incidentEventId: string, action: string, details: string) {
    const existing = await this.prisma.incidentLog.findFirst({
      where: { incidentEventId, action },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.incidentLog.create({
      data: { incidentEventId, action, actor: 'SYSTEM:CORO_INCIDENT', details, isAutomatic: true },
    });
  }
}
