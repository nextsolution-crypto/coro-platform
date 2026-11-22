import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../client-portal/email.service';
import { NotificationsService } from '../notifications/notifications.service';

export const SILENCE_ALERT_EVENT = 'HEARTBEAT_SILENCE_ALERT';

export function heartbeatSilenceMinutes(): number {
  const value = Number(process.env.DISPLAY_HEARTBEAT_SILENCE_MINUTES);
  return Number.isInteger(value) && value >= 2 && value <= 1440 ? value : 10;
}

/**
 * M10-02 — a screen that stops reporting is found before the incident, not
 * during it. One alert per silence episode (a new heartbeat re-arms it), to the
 * building's emergency manager by e-mail and to the organisation in-app.
 */
@Injectable()
export class DisplayHeartbeatWatchService {
  private readonly logger = new Logger(DisplayHeartbeatWatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly email?: EmailService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  @Cron('0 * * * * *')
  async tick() {
    try {
      await this.alertSilentScreens();
    } catch (error) {
      this.logger.error(
        `Guet des écrans : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async alertSilentScreens(now = new Date()) {
    const minutes = heartbeatSilenceMinutes();
    const threshold = new Date(now.getTime() - minutes * 60_000);
    const silent = await this.prisma.displayDevice.findMany({
      where: {
        status: 'ACTIVE',
        revokedAt: null,
        OR: [
          { lastHeartbeatAt: { lt: threshold } },
          { lastHeartbeatAt: null, updatedAt: { lt: threshold } },
        ],
      },
      select: {
        id: true,
        organizationId: true,
        buildingId: true,
        locationId: true,
        lastHeartbeatAt: true,
        updatedAt: true,
      },
      take: 500,
    });
    if (!silent.length) return 0;
    const alerts = await this.prisma.displayDeviceEvent.findMany({
      where: { deviceId: { in: silent.map((item) => item.id) }, eventType: SILENCE_ALERT_EVENT },
      select: { deviceId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const lastAlert = new Map<string, Date>();
    for (const alert of alerts)
      if (!lastAlert.has(alert.deviceId)) lastAlert.set(alert.deviceId, alert.createdAt);
    const fresh = silent.filter((device) => {
      const alerted = lastAlert.get(device.id);
      const since = device.lastHeartbeatAt ?? device.updatedAt;
      return !alerted || alerted < since;
    });
    if (!fresh.length) return 0;

    const byBuilding = new Map<string, typeof fresh>();
    for (const device of fresh)
      byBuilding.set(device.buildingId, [...(byBuilding.get(device.buildingId) ?? []), device]);
    const locations = await this.prisma.displayLocation.findMany({
      where: { id: { in: [...new Set(fresh.map((item) => item.locationId))] } },
      select: { id: true, label: true },
    });
    const labelOf = new Map(locations.map((item) => [item.id, item.label]));

    for (const [buildingId, devices] of byBuilding) {
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: {
          name: true,
          responsableEmail: true,
          responsableFirstName: true,
          responsableLastName: true,
        },
      });
      const organizationId = devices[0].organizationId;
      const screens = devices.map((device) => ({
        label: labelOf.get(device.locationId) ?? `Écran ${device.id.slice(0, 8)}`,
        lastSeen: device.lastHeartbeatAt
          ? device.lastHeartbeatAt.toLocaleString('fr-CA', { timeZone: 'America/Toronto' })
          : 'jamais / never',
      }));
      await this.prisma.displayDeviceEvent.createMany({
        data: devices.map((device) => ({
          deviceId: device.id,
          organizationId,
          buildingId,
          eventType: SILENCE_ALERT_EVENT,
          metadata: { silenceMinutes: minutes, lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() ?? null },
        })),
      });
      const buildingName = building?.name ?? 'Bâtiment';
      if (building?.responsableEmail && this.email)
        await this.email
          .sendDisplayScreensSilent({
            toEmail: building.responsableEmail,
            toName:
              [building.responsableFirstName, building.responsableLastName].filter(Boolean).join(' ') ||
              'responsable',
            buildingName,
            screens,
            silenceMinutes: minutes,
          })
          .catch(() => undefined);
      if (this.notifications)
        await this.notifications
          .createForOrganization({
            organizationId,
            type: 'DISPLAY_SCREEN_SILENT',
            title: `Écran d’urgence sans signal — ${buildingName}`,
            message: `${screens.length} écran(s) sans signal depuis plus de ${minutes} min : ${screens.map((item) => item.label).join(', ')}`.slice(0, 500),
          })
          .catch(() => undefined);
      this.logger.warn(`${devices.length} écran(s) muet(s) au bâtiment ${buildingId}`);
    }
    return fresh.length;
  }
}
