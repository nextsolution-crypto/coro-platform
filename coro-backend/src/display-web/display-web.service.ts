import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DisplayPermission, Prisma } from '@prisma/client';
import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SpatialActor } from '../spatial/spatial-authorization.service';
import { SpatialAuthorizationService } from '../spatial/spatial-authorization.service';
import { StorageService } from '../storage/storage.service';
import type {
  ActivateWebDisplayDto,
  ConfirmWebDisplayDto,
  CreateWebActivationDto,
} from './dto/display-web.dto';

const PUBLIC_ID = /^[A-F0-9]{18}$/;
const SESSION_DAYS = 30;
const hash = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex');

@Injectable()
export class DisplayWebService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: SpatialAuthorizationService,
    private readonly audit: AdminAuditService,
    private readonly storage: StorageService,
  ) {}

  async publicStatus(publicDisplayId: string) {
    if (!PUBLIC_ID.test(publicDisplayId)) return this.genericUnavailable();
    const location = await this.prisma.displayLocation.findUnique({
      where: { publicDisplayId },
      select: {
        id: true,
        status: true,
        label: true,
        floor: { select: { name: true } },
      },
    });
    if (!location || location.status !== 'ACTIVE')
      return this.genericUnavailable();
    return {
      available: true,
      activationRequired: true,
      location: { label: location.label, floor: location.floor.name },
      capability: 'WEB_VIEW_ONLY',
      emergencyEligible: false,
    };
  }

  async createActivation(
    organizationId: string,
    locationId: string,
    actor: SpatialActor,
    dto: CreateWebActivationDto,
  ) {
    const location = await this.prisma.displayLocation.findFirst({
      where: { id: locationId, organizationId },
      select: {
        id: true,
        buildingId: true,
        label: true,
        status: true,
        publicDisplayId: true,
      },
    });
    if (!location) throw new NotFoundException('Emplacement introuvable.');
    await this.authorization.require(
      actor,
      organizationId,
      location.buildingId,
      DisplayPermission.DISPLAY_DEVICE_MANAGE,
    );
    if (location.status !== 'ACTIVE')
      throw new ConflictException("L'emplacement n'est pas activable.");
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + dto.ttlSeconds * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`display-web:${locationId}`}, 0))`;
      await tx.displayWebActivation.updateMany({
        where: { locationId, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.displayWebActivation.create({
        data: {
          organizationId,
          buildingId: location.buildingId,
          locationId,
          codeHash: hash(`${locationId}:${code}`),
          expiresAt,
          createdByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        organizationId,
        action: 'DISPLAY_WEB_ACTIVATION_CREATED',
        targetType: 'DisplayLocation',
        targetId: locationId,
        targetLabel: location.label,
        afterData: {
          expiresAt: expiresAt.toISOString(),
          capability: 'WEB_VIEW_ONLY',
        },
      });
    });
    return {
      code,
      expiresAt,
      publicDisplayId: location.publicDisplayId,
      url: location.publicDisplayId
        ? `${process.env.DISPLAY_PUBLIC_ORIGIN ?? 'https://display.getcoro.io'}/d/${location.publicDisplayId}`
        : null,
    };
  }

  async rotatePublicId(
    organizationId: string,
    locationId: string,
    actor: SpatialActor,
    reason: string,
  ) {
    const location = await this.prisma.displayLocation.findFirst({
      where: { id: locationId, organizationId },
      select: {
        id: true,
        buildingId: true,
        label: true,
        publicDisplayId: true,
      },
    });
    if (!location) throw new NotFoundException('Emplacement introuvable.');
    await this.authorization.require(
      actor,
      organizationId,
      location.buildingId,
      DisplayPermission.DISPLAY_DEVICE_MANAGE,
    );
    const next = randomBytes(9).toString('hex').toUpperCase();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`display-web:${locationId}`}, 0))`;
      await tx.displayWebActivation.updateMany({
        where: { locationId, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.displayWebSession.updateMany({
        where: { locationId, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: reason,
        },
      });
      await tx.displayLocation.update({
        where: { id: locationId },
        data: {
          publicDisplayId: next,
          publicIdRotatedAt: new Date(),
          lockVersion: { increment: 1 },
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        organizationId,
        action: 'DISPLAY_PUBLIC_ID_ROTATED',
        targetType: 'DisplayLocation',
        targetId: locationId,
        targetLabel: location.label,
        reason,
        beforeData: {
          publicDisplayId: location.publicDisplayId ? 'REDACTED' : null,
        },
        afterData: { publicDisplayId: 'ROTATED', sessionsRevoked: true },
      });
    });
    return {
      publicDisplayId: next,
      url: `${process.env.DISPLAY_PUBLIC_ORIGIN ?? 'https://display.getcoro.io'}/d/${next}`,
    };
  }

  async revokeLocationSessions(
    organizationId: string,
    locationId: string,
    actor: SpatialActor,
    reason: string,
  ) {
    const location = await this.prisma.displayLocation.findFirst({
      where: { id: locationId, organizationId },
      select: { id: true, buildingId: true, label: true },
    });
    if (!location) throw new NotFoundException('Emplacement introuvable.');
    await this.authorization.require(
      actor,
      organizationId,
      location.buildingId,
      DisplayPermission.DISPLAY_DEVICE_MANAGE,
    );
    const result = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.displayWebSession.updateMany({
        where: { locationId, organizationId, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: reason,
        },
      });
      await tx.displayWebActivation.updateMany({
        where: { locationId, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        organizationId,
        action: 'DISPLAY_WEB_DEVICES_REVOKED',
        targetType: 'DisplayLocation',
        targetId: locationId,
        targetLabel: location.label,
        reason,
        afterData: { revokedCount: revoked.count },
      });
      return revoked;
    });
    return { revoked: result.count };
  }

  async activate(publicDisplayId: string, dto: ActivateWebDisplayDto) {
    if (!PUBLIC_ID.test(publicDisplayId))
      throw new UnauthorizedException('Activation refusée.');
    if (!this.validJwk(dto.publicKeyJwk))
      throw new BadRequestException('Clé navigateur invalide.');
    const result = await this.prisma.$transaction(async (tx) => {
      const location = await tx.displayLocation.findUnique({
        where: { publicDisplayId },
        select: {
          id: true,
          organizationId: true,
          buildingId: true,
          status: true,
        },
      });
      if (!location || location.status !== 'ACTIVE')
        throw new UnauthorizedException('Activation refusée.');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`display-web:${location.id}`}, 0))`;
      const candidates = await tx.displayWebActivation.findMany({
        where: {
          locationId: location.id,
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          failedAttempts: { lt: 5 },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      const activation = candidates[0];
      const actual = hash(`${location.id}:${dto.code}`);
      const match =
        activation &&
        timingSafeEqual(Buffer.from(actual), Buffer.from(activation.codeHash));
      if (!match) {
        if (activation)
          await tx.displayWebActivation.update({
            where: { id: activation.id },
            data: { failedAttempts: { increment: 1 } },
          });
        return null;
      }
      const token = randomBytes(32).toString('base64url');
      const deviceId = randomBytes(16).toString('hex');
      await tx.displayWebActivation.update({
        where: { id: activation.id },
        data: { consumedAt: new Date() },
      });
      const session = await tx.displayWebSession.create({
        data: {
          organizationId: location.organizationId,
          buildingId: location.buildingId,
          locationId: location.id,
          deviceId,
          tokenHash: hash(token),
          keyId: dto.keyId,
          publicKeyJwk: dto.publicKeyJwk as Prisma.InputJsonValue,
          capability: 'WEB_VIEW_ONLY',
          expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
        },
      });
      await this.audit.record(tx, {
        actorType: 'SYSTEM',
        systemActorKey: 'DISPLAY_WEB_ENROLLMENT',
        organizationId: location.organizationId,
        action: 'DISPLAY_WEB_DEVICE_ACTIVATED',
        targetType: 'DisplayWebSession',
        targetId: session.id,
        afterData: {
          deviceId,
          locationId: location.id,
          capability: session.capability,
        },
      });
      return {
        token,
        deviceId,
        capability: session.capability,
        expiresAt: session.expiresAt,
      };
    });
    if (!result) throw new UnauthorizedException('Activation refusée.');
    return result;
  }

  async manifest(publicDisplayId: string, bearer: string | undefined) {
    const session = await this.requireSession(publicDisplayId, bearer);
    const publication = await this.prisma.displayPlanPublication.findFirst({
      where: {
        organizationId: session.organizationId,
        buildingId: session.buildingId,
        locationId: session.locationId,
        status: 'PUBLISHED',
        variantStorageKey: { not: null },
        variantSha256: { not: null },
        OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }],
        AND: [
          { OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
        ],
      },
      orderBy: [{ versionNumber: 'desc' }, { variantVersion: 'desc' }],
      select: {
        id: true,
        versionNumber: true,
        variantVersion: true,
        variantSha256: true,
        variantMimeType: true,
        widthPixels: true,
        heightPixels: true,
        updatedAt: true,
      },
    });
    await this.prisma.displayWebSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
    return {
      capability: session.capability,
      emergencyEligible: false,
      pollingSeconds: 30,
      publication: publication
        ? {
            ...publication,
            contentPath: `/display-public/d/${publicDisplayId}/content/${publication.id}`,
          }
        : null,
    };
  }

  async content(
    publicDisplayId: string,
    publicationId: string,
    bearer: string | undefined,
  ) {
    const session = await this.requireSession(publicDisplayId, bearer);
    const row = await this.prisma.displayPlanPublication.findFirst({
      where: {
        id: publicationId,
        organizationId: session.organizationId,
        buildingId: session.buildingId,
        locationId: session.locationId,
        status: 'PUBLISHED',
      },
      select: {
        variantStorageKey: true,
        variantSha256: true,
        variantMimeType: true,
      },
    });
    if (!row?.variantStorageKey || !row.variantSha256)
      throw new NotFoundException('Publication indisponible.');
    const bytes = await this.storage.downloadPrivate(row.variantStorageKey);
    if (hash(bytes.toString('binary')) !== row.variantSha256) {
      const actual = createHash('sha256').update(bytes).digest('hex');
      if (actual !== row.variantSha256)
        throw new ConflictException('Intégrité du rendu invalide.');
    }
    return {
      bytes,
      sha256: row.variantSha256,
      mimeType: row.variantMimeType ?? 'image/png',
    };
  }

  async confirm(
    publicDisplayId: string,
    bearer: string | undefined,
    dto: ConfirmWebDisplayDto,
  ) {
    const session = await this.requireSession(publicDisplayId, bearer);
    const publication = await this.prisma.displayPlanPublication.findFirst({
      where: {
        id: dto.publicationId,
        organizationId: session.organizationId,
        buildingId: session.buildingId,
        locationId: session.locationId,
        status: 'PUBLISHED',
        versionNumber: dto.version,
      },
      select: { id: true },
    });
    if (!publication)
      throw new ForbiddenException('Confirmation hors périmètre.');
    await this.prisma.displayWebSession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(),
        lastConfirmedAt: new Date(),
        lastPublicationId: dto.publicationId,
        lastVersion: dto.version,
      },
    });
    return { accepted: true };
  }

  private async requireSession(
    publicDisplayId: string,
    bearer: string | undefined,
  ) {
    if (!PUBLIC_ID.test(publicDisplayId) || !bearer?.startsWith('Bearer '))
      throw new UnauthorizedException('Appareil non autorisé.');
    const token = bearer.slice(7);
    if (token.length < 32)
      throw new UnauthorizedException('Appareil non autorisé.');
    const session = await this.prisma.displayWebSession.findFirst({
      where: {
        tokenHash: hash(token),
        status: 'ACTIVE',
        revokedAt: null,
        expiresAt: { gt: new Date() },
        location: { publicDisplayId, status: 'ACTIVE' },
      },
    });
    if (!session) throw new UnauthorizedException('Appareil non autorisé.');
    return session;
  }

  private validJwk(value: Record<string, unknown>) {
    return (
      value &&
      value.kty === 'EC' &&
      value.crv === 'P-256' &&
      typeof value.x === 'string' &&
      typeof value.y === 'string' &&
      String(value.x).length <= 128 &&
      String(value.y).length <= 128 &&
      value.d === undefined
    );
  }

  private genericUnavailable() {
    return { available: false, activationRequired: false };
  }
}
