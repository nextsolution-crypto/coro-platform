import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { assertIanaTimeZone } from '../bookings/booking-time';
import { projectAccessWhere, type AdviserActor } from '../auth/project-access';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { ClientInvitationOutboxService } from '../clients/client-invitation-outbox.service';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto';

type BuildingActor = AdviserActor;

async function geocodeAddress(address: string, city: string, province: string) {
  if (process.env.NODE_ENV === 'test' || process.env.CORO_QA_MODE === 'true') return null;
  try {
    const query = encodeURIComponent(`${address}, ${city}, ${province}, Canada`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: { 'User-Agent': 'CORO-Platform/1.0 (info@getcoro.io)' }, signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ lat: string; lon: string }>;
    return rows.length ? { latitude: Number.parseFloat(rows[0].lat), longitude: Number.parseFloat(rows[0].lon) } : null;
  } catch { return null; }
}

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAudit: AdminAuditService,
    private readonly invitationOutbox: ClientInvitationOutboxService,
  ) {}

  async findAll(actor: BuildingActor, clientId?: string) {
    if (clientId) await this.assertActiveClient(clientId, actor.organizationId);
    const buildings = await this.prisma.building.findMany({
      where: {
        isActive: true,
        organizationId: actor.organizationId,
        ...(clientId && { clientId }),
        ...(actor.role === 'OPERATOR' ? { projects: { some: { OR: [{ userId: actor.userId }, { lastEditedById: actor.userId }] } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } }, _count: { select: { projects: true } },
        projects: {
          where: actor.role === 'OPERATOR' ? { OR: [{ userId: actor.userId }, { lastEditedById: actor.userId }] } : undefined,
          select: { id: true, name: true, documentType: true, status: true, year: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    return buildings.map((building) => ({
      ...building, projectCount: building.projects.length,
      validatedCount: building.projects.filter((project) => project.status === 'VALIDATED').length,
      activeCount: building.projects.filter((project) => ['DRAFT', 'IN_PROGRESS'].includes(project.status)).length,
    }));
  }

  async findOne(id: string, actor: BuildingActor) {
    const building = await this.prisma.building.findFirst({
      where: {
        id, organizationId: actor.organizationId, isActive: true,
        ...(actor.role === 'OPERATOR' ? { projects: { some: { OR: [{ userId: actor.userId }, { lastEditedById: actor.userId }] } } } : {}),
      },
      include: { client: true, projects: { where: actor.role === 'OPERATOR' ? { OR: [{ userId: actor.userId }, { lastEditedById: actor.userId }] } : undefined } },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable.');
    return building;
  }

  async findProjects(buildingId: string, actor: BuildingActor) {
    await this.assertReadableBuilding(buildingId, actor);
    return this.prisma.project.findMany({
      where: { buildingId, ...projectAccessWhere(actor) }, orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, documentType: true, year: true, status: true, updatedAt: true },
    });
  }

  async create(data: CreateBuildingDto, actor: BuildingActor, rawKey?: string) {
    const key = rawKey?.trim() || '';
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new BadRequestException("Une clé d'idempotence valide est requise.");
    if (data.timeZone !== undefined) assertIanaTimeZone(data.timeZone);
    const normalized = this.normalizeCreate(data);
    const payloadHash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const id = `bld_${createHash('sha256').update(`${actor.organizationId}:${actor.userId}:${key}`).digest('hex').slice(0, 32)}`;
    const coordinates = await geocodeAddress(normalized.address, normalized.city, normalized.province);
    const secret = normalized.responsableEmail ? await this.managerSecret() : null;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.organizationId}:${actor.userId}:${key}`}, 0))`;
      const replay = await tx.building.findUnique({ where: { id } });
      if (replay) {
        if (!this.matchesCreate(replay, normalized)) throw new ConflictException("Cette clé d'idempotence appartient à une demande incompatible.");
        return replay;
      }
      const client = await this.requireClientTx(tx, normalized.clientId, actor.organizationId);
      const building = await tx.building.create({ data: {
        id, ...normalized, organizationId: actor.organizationId,
        timeZoneVerified: normalized.timeZone !== undefined,
        latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null,
      } });
      if (normalized.responsableEmail && secret) await this.assignManagerTx(tx, {
        buildingId: id, client, organizationId: actor.organizationId, email: normalized.responsableEmail,
        firstName: normalized.responsableFirstName || '', lastName: normalized.responsableLastName || '', secret,
      });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId, organizationId: actor.organizationId, action: 'BUILDING_CREATED',
        targetType: 'Building', targetId: id, targetLabel: building.name,
        afterData: { clientId: building.clientId, isActive: true, managerAssigned: Boolean(normalized.responsableEmail), payloadHash },
      });
      return building;
    });
  }

  async update(id: string, data: UpdateBuildingDto, actor: BuildingActor) {
    if (data.timeZone !== undefined) assertIanaTimeZone(data.timeZone);
    const initial = await this.assertActiveBuilding(id, actor.organizationId);
    const normalized = this.normalizeUpdate(data);
    const addressChanged = data.address !== undefined || data.city !== undefined || data.province !== undefined;
    const coordinates = addressChanged ? await geocodeAddress(data.address ?? initial.address, data.city ?? initial.city, data.province ?? initial.province) : null;
    const emailChanged = normalized.responsableEmail !== undefined && normalized.responsableEmail !== initial.responsableEmail;
    const clientChanged = normalized.clientId !== undefined && normalized.clientId !== initial.clientId;
    const nextEmail = normalized.responsableEmail === undefined ? initial.responsableEmail : normalized.responsableEmail;
    const secret = (emailChanged || clientChanged) && nextEmail ? await this.managerSecret() : null;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.organizationId}:${id}`}, 0))`;
      const current = await tx.building.findFirst({ where: { id, organizationId: actor.organizationId, isActive: true } });
      if (!current) throw new NotFoundException('Bâtiment introuvable.');
      const client = await this.requireClientTx(tx, normalized.clientId ?? current.clientId, actor.organizationId);
      if ((emailChanged || clientChanged) && current.responsableEmail) await this.removeManagerTx(tx, current.responsableEmail, current.clientId, actor.organizationId, id);
      if ((emailChanged || clientChanged) && nextEmail && secret) await this.assignManagerTx(tx, {
        buildingId: id, client, organizationId: actor.organizationId, email: nextEmail,
        firstName: normalized.responsableFirstName ?? current.responsableFirstName ?? '',
        lastName: normalized.responsableLastName ?? current.responsableLastName ?? '', secret,
      });
      const updated = await tx.building.update({ where: { id }, data: {
        ...normalized, ...(data.timeZone !== undefined ? { timeZoneVerified: true } : {}),
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      } });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId, organizationId: actor.organizationId, action: 'BUILDING_UPDATED',
        targetType: 'Building', targetId: id, targetLabel: updated.name,
        beforeData: { clientId: current.clientId, responsableEmailHash: this.hash(current.responsableEmail) },
        afterData: { clientId: updated.clientId, responsableEmailHash: this.hash(updated.responsableEmail) },
      });
      return updated;
    });
  }

  async remove(id: string, actor: BuildingActor) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.building.findFirst({ where: { id, organizationId: actor.organizationId, isActive: true } });
      if (!current) throw new NotFoundException('Bâtiment introuvable.');
      const updated = await tx.building.update({ where: { id }, data: { isActive: false } });
      await this.adminAudit.record(tx, {
        actorUserId: actor.userId, organizationId: actor.organizationId, action: 'BUILDING_DEACTIVATED',
        targetType: 'Building', targetId: id, targetLabel: current.name,
        beforeData: { isActive: true }, afterData: { isActive: false },
      });
      return updated;
    });
  }

  private normalizeCreate(data: CreateBuildingDto) {
    return {
      name: data.name.trim(), address: data.address.trim(), city: data.city.trim(), province: data.province.trim(),
      postalCode: data.postalCode?.trim() || null, floors: data.floors ?? null, units: data.units ?? null,
      buildingType: data.buildingType?.trim() || null, clientId: data.clientId,
      ...(data.timeZone !== undefined ? { timeZone: data.timeZone.trim() } : {}),
      responsableFirstName: data.responsableFirstName?.trim() || null, responsableLastName: data.responsableLastName?.trim() || null,
      responsableTitre: data.responsableTitre?.trim() || null, responsableEmail: data.responsableEmail?.trim().toLowerCase() || null,
      responsablePhone: data.responsablePhone?.trim() || null, photoBase64: data.photoBase64 || null,
    };
  }

  private normalizeUpdate(data: UpdateBuildingDto): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of ['name','address','city','province','postalCode','buildingType','timeZone','responsableFirstName','responsableLastName','responsableTitre','responsablePhone'] as const)
      if (data[key] !== undefined) result[key] = data[key]?.trim() || null;
    for (const key of ['floors','units','clientId','photoBase64'] as const) if (data[key] !== undefined) result[key] = data[key];
    if (data.responsableEmail !== undefined) result.responsableEmail = data.responsableEmail?.trim().toLowerCase() || null;
    return result;
  }

  private async managerSecret() {
    const temporaryPassword = `${randomBytes(12).toString('base64url')}A1!`;
    return { temporaryPassword, passwordHash: await bcrypt.hash(temporaryPassword, 10) };
  }

  private async assignManagerTx(tx: Prisma.TransactionClient, data: {
    buildingId: string; client: { id: string; name: string; organization: { name: string } }; organizationId: string;
    email: string; firstName: string; lastName: string; secret: { temporaryPassword: string; passwordHash: string };
  }) {
    const email = data.email.trim().toLowerCase();
    const existing = await tx.clientUser.findUnique({ where: { email } });
    if (existing) {
      if (existing.organizationId !== data.organizationId || existing.clientId !== data.client.id || existing.role !== 'CLIENT_MANAGER' || !existing.isActive)
        throw new BadRequestException("Le responsable ne peut pas être affecté. Utilisez la gestion des accès existants.");
      if (!existing.buildingIds.includes(data.buildingId)) await tx.clientUser.update({ where: { id: existing.id }, data: { buildingIds: { push: data.buildingId } } });
      return existing;
    }
    const clientUser = await tx.clientUser.create({ data: {
      email, password: data.secret.passwordHash, firstName: data.firstName, lastName: data.lastName,
      role: 'CLIENT_MANAGER', clientId: data.client.id, organizationId: data.organizationId, buildingIds: [data.buildingId],
    } });
    const eventKey = `building-manager-invitation-${data.buildingId}-${clientUser.id}`;
    const envelope = this.invitationOutbox.protect({
      toEmail: email, toName: `${data.firstName} ${data.lastName}`.trim() || email, clientName: data.client.name,
      temporaryPassword: data.secret.temporaryPassword, organizationName: data.client.organization.name,
    }, eventKey);
    await tx.clientInvitationEvent.create({ data: {
      organizationId: data.organizationId, clientId: data.client.id, clientUserId: clientUser.id, buildingId: data.buildingId, idempotencyKey: eventKey, ...envelope,
    } });
    return clientUser;
  }

  private async removeManagerTx(tx: Prisma.TransactionClient, email: string, clientId: string, organizationId: string, buildingId: string) {
    const user = await tx.clientUser.findUnique({ where: { email } });
    if (user?.organizationId === organizationId && user.clientId === clientId && user.role === 'CLIENT_MANAGER') {
      await tx.clientUser.update({ where: { id: user.id }, data: { buildingIds: user.buildingIds.filter((value) => value !== buildingId) } });
      await tx.clientInvitationEvent.updateMany({
        where: { buildingId, clientUserId: user.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'CANCELLED', nextAttemptAt: null, leaseExpiresAt: null, lastErrorCode: 'BUILDING_ASSIGNMENT_REVOKED' },
      });
    }
  }

  private async assertActiveClient(clientId: string, organizationId: string) {
    if (!await this.prisma.client.findFirst({ where: { id: clientId, organizationId, isActive: true }, select: { id: true } }))
      throw new NotFoundException('Client introuvable.');
  }
  private async requireClientTx(tx: Prisma.TransactionClient, clientId: string, organizationId: string) {
    const client = await tx.client.findFirst({ where: { id: clientId, organizationId, isActive: true }, select: { id: true, name: true, organization: { select: { name: true } } } });
    if (!client) throw new NotFoundException('Client introuvable.');
    return client;
  }
  private async assertActiveBuilding(id: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id, organizationId, isActive: true } });
    if (!building) throw new NotFoundException('Bâtiment introuvable.');
    return building;
  }
  private async assertReadableBuilding(id: string, actor: BuildingActor) {
    const building = await this.prisma.building.findFirst({ where: {
      id, organizationId: actor.organizationId, isActive: true,
      ...(actor.role === 'OPERATOR' ? { projects: { some: { OR: [{ userId: actor.userId }, { lastEditedById: actor.userId }] } } } : {}),
    } });
    if (!building) throw new NotFoundException('Bâtiment introuvable.');
    return building;
  }
  private matchesCreate(existing: any, requested: any) {
    return ['name','address','city','province','postalCode','floors','units','buildingType','clientId','responsableFirstName','responsableLastName','responsableTitre','responsableEmail','responsablePhone','photoBase64']
      .every((key) => (existing[key] ?? null) === (requested[key] ?? null));
  }
  private hash(value: string | null | undefined) {
    return value ? createHash('sha256').update(value.trim().toLowerCase()).digest('hex') : null;
  }
}
