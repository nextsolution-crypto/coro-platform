import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckInDto,
  CheckOutDto,
  TriggerEvacuationDto,
  AccountForOccupantDto,
} from './occupancy.dto';

@Injectable()
export class OccupancyService {
  constructor(private prisma: PrismaService) {}

  // Valider le token de la borne
  private async validateKioskToken(buildingId: string, token: string) {
    const kiosk = await this.prisma.buildingKioskToken.findFirst({
      where: { buildingId, token, isActive: true },
    });
    if (!kiosk) throw new UnauthorizedException('Token de borne invalide');
    return kiosk;
  }

  // Obtenir ou créer le token de borne pour un bâtiment
  async getOrCreateKioskToken(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const existing = await this.prisma.buildingKioskToken.findUnique({
      where: { buildingId },
    });
    if (existing) return existing;

    return this.prisma.buildingKioskToken.create({
      data: { buildingId },
    });
  }

  // Régénérer le token (sécurité)
  async regenerateKioskToken(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const { randomUUID } = await import('crypto');
    return this.prisma.buildingKioskToken.upsert({
      where: { buildingId },
      update: { token: randomUUID(), updatedAt: new Date() },
      create: { buildingId, token: randomUUID() },
    });
  }

  // Check-in d'un occupant
  async checkIn(body: any) {
    const buildingId = body.buildingId;
    const kioskToken = body.kioskToken;

    console.log('[Sentinelle] checkIn reçu:', JSON.stringify(body));

    if (!buildingId) throw new Error('buildingId manquant');
    if (!kioskToken) throw new Error('kioskToken manquant');

    await this.validateKioskToken(buildingId, kioskToken);

    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { organizationId: true },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.occupancyRecord.create({
      data: {
        buildingId,
        organizationId: building.organizationId,
        type: body.type,
        status: 'IN',
        firstName: body.firstName,
        lastName: body.lastName,
        company: body.company,
        email: body.email,
        phone: body.phone,
        reason: body.reason,
        hostName: body.hostName,
        floor: body.floor,
      },
    });
  }

  // Check-out d'un occupant
  async checkOut(dto: CheckOutDto) {
    const record = await this.prisma.occupancyRecord.findUnique({
      where: { id: dto.recordId },
    });
    if (!record) throw new NotFoundException('Enregistrement introuvable');

    await this.validateKioskToken(record.buildingId, dto.kioskToken);

    return this.prisma.occupancyRecord.update({
      where: { id: dto.recordId },
      data: { status: 'OUT', checkedOutAt: new Date() },
    });
  }

  // Obtenir les occupants actuellement présents
  async getCurrentOccupants(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const records = await this.prisma.occupancyRecord.findMany({
      where: { buildingId, status: 'IN' },
      orderBy: { checkedInAt: 'desc' },
    });

    const total = records.length;
    const byType = {
      EMPLOYE: records.filter((r) => r.type === 'EMPLOYE').length,
      VISITEUR: records.filter((r) => r.type === 'VISITEUR').length,
      CONTRACTEUR: records.filter((r) => r.type === 'CONTRACTEUR').length,
    };

    return { total, byType, records };
  }

  // Historique (tous IN et OUT du jour)
  async getTodayHistory(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.occupancyRecord.findMany({
      where: { buildingId, checkedInAt: { gte: startOfDay } },
      orderBy: { checkedInAt: 'desc' },
    });
  }

  // Déclencher une évacuation (snapshot figé)
  async triggerEvacuation(dto: TriggerEvacuationDto, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: dto.buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    // Snapshot des occupants présents à cet instant
    const presentOccupants = await this.prisma.occupancyRecord.findMany({
      where: { buildingId: dto.buildingId, status: 'IN' },
    });

    const event = await this.prisma.evacuationEvent.create({
      data: {
        buildingId: dto.buildingId,
        organizationId,
        triggeredBy: dto.triggeredBy,
        notes: dto.notes,
        totalPresent: presentOccupants.length,
        snapshot: presentOccupants as any,
        status: 'ACTIVE',
      },
    });

    // Créer les entrées de dénombrement pour chaque occupant
    if (presentOccupants.length > 0) {
      await this.prisma.evacuationCheckIn.createMany({
        data: presentOccupants.map((o) => ({
          evacuationEventId: event.id,
          occupantRecordId: o.id,
          isAccountedFor: false,
        })),
      });
    }

    return event;
  }

  // Obtenir l'évacuation active d'un bâtiment
  async getActiveEvacuation(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const event = await this.prisma.evacuationEvent.findFirst({
      where: { buildingId, status: 'ACTIVE' },
      orderBy: { triggeredAt: 'desc' },
      include: {
        checkins: {
          include: { occupantRecord: true },
        },
      },
    });

    if (!event) return null;

    const accounted = event.checkins.filter((c) => c.isAccountedFor).length;
    const missing = event.checkins.filter((c) => !c.isAccountedFor).length;

    return { ...event, accounted, missing };
  }

  // Warden coche un occupant comme comptabilisé
  async accountForOccupant(dto: AccountForOccupantDto, organizationId: string) {
    const checkin = await this.prisma.evacuationCheckIn.findFirst({
      where: {
        evacuationEventId: dto.evacuationEventId,
        occupantRecordId: dto.occupantRecordId,
      },
    });
    if (!checkin) throw new NotFoundException('Entrée de dénombrement introuvable');

    return this.prisma.evacuationCheckIn.update({
      where: { id: checkin.id },
      data: {
        isAccountedFor: true,
        checkedAt: new Date(),
        checkedBy: dto.checkedBy,
      },
    });
  }

  // Clore une évacuation
  async resolveEvacuation(evacuationEventId: string, organizationId: string) {
    return this.prisma.evacuationEvent.update({
      where: { id: evacuationEventId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  // Historique des évacuations d'un bâtiment
  async getEvacuationHistory(buildingId: string, organizationId: string) {
    return this.prisma.evacuationEvent.findMany({
      where: { buildingId, organizationId },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
    });
  }

    // Résoudre le buildingId depuis un token kiosque (route publique)
  async resolveBuildingFromToken(token: string) {
    const kiosk = await this.prisma.buildingKioskToken.findFirst({
      where: { token, isActive: true },
      select: { buildingId: true },
    });
    if (!kiosk) throw new NotFoundException('Token invalide');
    return { buildingId: kiosk.buildingId };
  }

  // Recherche d'occupants présents pour le checkout (par nom)
  async searchOccupantsForCheckout(buildingId: string, token: string, query: string) {
    await this.validateKioskToken(buildingId, token);
    return this.prisma.occupancyRecord.findMany({
      where: {
        buildingId,
        status: 'IN',
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName:  { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { checkedInAt: 'desc' },
      take: 5,
    });
  }

    // Version publique — authentifiée par token kiosque
  async getCurrentOccupantsPublic(buildingId: string, token: string) {
    await this.validateKioskToken(buildingId, token);
    const records = await this.prisma.occupancyRecord.findMany({
      where: { buildingId, status: 'IN' },
      orderBy: { checkedInAt: 'desc' },
    });
    const total = records.length;
    const byType = {
      EMPLOYE:     records.filter((r) => r.type === 'EMPLOYE').length,
      VISITEUR:    records.filter((r) => r.type === 'VISITEUR').length,
      CONTRACTEUR: records.filter((r) => r.type === 'CONTRACTEUR').length,
    };
    return { total, byType, records };
  }
}