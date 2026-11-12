import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisplayPermission, Prisma } from '@prisma/client';
import { createPublicKey, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  SpatialActor,
  SpatialAuthorizationService,
} from '../spatial/spatial-authorization.service';
import { digestSecret } from './device-security';
import {
  AssignDisplayDeviceDto,
  CreateDisplayDeviceDto,
  InviteDisplayDeviceDto,
  TransitionDisplayDeviceDto,
} from './dto/device-administration.dto';

function administrativeTransitionAllowed(current: string, target: string) {
  switch (current) {
    case 'PENDING_ENROLLMENT':
      return target === 'REVOKED' || target === 'RETIRED';
    case 'ACTIVE':
      return ['SUSPENDED', 'REVOKED', 'RETIRED'].includes(target);
    case 'SUSPENDED':
      return ['ACTIVE', 'REVOKED', 'RETIRED'].includes(target);
    default:
      return false;
  }
}

@Injectable()
export class DeviceAdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: SpatialAuthorizationService,
  ) {}

  async create(
    organizationId: string,
    actor: SpatialActor,
    dto: CreateDisplayDeviceDto,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      dto.buildingId,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
    );
    try {
      if (createPublicKey(dto.publicKeyPem).asymmetricKeyType !== 'ed25519')
        throw new Error();
    } catch {
      throw new ForbiddenException('DEVICE_PUBLIC_KEY_INVALID');
    }
    const location = await this.prisma.displayLocation.findFirst({
      where: {
        id: dto.locationId,
        organizationId,
        buildingId: dto.buildingId,
        status: 'ACTIVE',
      },
    });
    if (!location) throw new NotFoundException('DISPLAY_LOCATION_NOT_FOUND');
    return this.prisma.$transaction(
      async (tx) => {
        const device = await tx.displayDevice.create({
          data: {
            id: randomUUID(),
            organizationId,
            buildingId: dto.buildingId,
            locationId: dto.locationId,
            profile: dto.profile,
            status: 'PENDING_ENROLLMENT',
            publicKey: dto.publicKeyPem,
            keyId: dto.keyId,
          },
        });
        await tx.displayDeviceEvent.create({
          data: {
            id: randomUUID(),
            deviceId: device.id,
            organizationId,
            buildingId: dto.buildingId,
            eventType: 'DEVICE_CREATED',
            requestId: dto.requestId,
            verifiedAt: new Date(),
            metadata: { actorUserId: actor.userId },
          },
        });
        return device;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async invite(
    organizationId: string,
    deviceId: string,
    actor: SpatialActor,
    dto: InviteDisplayDeviceDto,
  ) {
    const device = await this.device(organizationId, deviceId);
    await this.authorization.require(
      actor,
      organizationId,
      device.buildingId,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
    );
    if (device.status !== 'PENDING_ENROLLMENT')
      throw new ConflictException('DEVICE_NOT_PENDING_ENROLLMENT');
    const expiresAt = new Date(dto.expiresAt);
    if (
      expiresAt <= new Date() ||
      expiresAt.getTime() > Date.now() + 24 * 60 * 60_000
    )
      throw new ConflictException('INVITATION_EXPIRY_INVALID');
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.$transaction(async (tx) => {
      await tx.displayDeviceEnrollmentInvitation.updateMany({
        where: { deviceId, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date() },
      });
      const created = await tx.displayDeviceEnrollmentInvitation.create({
        data: {
          id: randomBytes(16).toString('hex'),
          deviceId,
          organizationId,
          buildingId: device.buildingId,
          locationId: device.locationId,
          tokenHash: digestSecret(token),
          expectedKeyId: device.keyId,
          expectedPublicKey: device.publicKey,
          expiresAt,
          createdByUserId: actor.userId,
        },
      });
      await tx.displayDeviceEvent.create({
        data: {
          id: randomUUID(),
          deviceId,
          organizationId,
          buildingId: device.buildingId,
          eventType: 'INVITATION_CREATED',
          requestId: dto.requestId,
          verifiedAt: new Date(),
          metadata: { actorUserId: actor.userId, invitationId: created.id },
        },
      });
      return created;
    });
    return {
      invitationId: invitation.id,
      token,
      expiresAt: invitation.expiresAt,
    };
  }

  async assign(
    organizationId: string,
    deviceId: string,
    actor: SpatialActor,
    dto: AssignDisplayDeviceDto,
  ) {
    const device = await this.device(organizationId, deviceId);
    await this.authorization.require(
      actor,
      organizationId,
      device.buildingId,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
    );
    const publication = await this.prisma.displayPlanPublication.findFirst({
      where: {
        id: dto.publicationId,
        organizationId,
        buildingId: device.buildingId,
        locationId: device.locationId,
        status: 'PUBLISHED',
        revokedAt: null,
        supersededAt: null,
        variantSha256: { not: null },
        variantStorageKey: { not: null },
      },
    });
    if (!publication) throw new NotFoundException('PUBLICATION_NOT_ASSIGNABLE');
    return this.prisma.$transaction(async (tx) => {
      await tx.displayDeviceAssignment.updateMany({
        where: { deviceId, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: 'SUPERSEDED_BY_ASSIGNMENT',
        },
      });
      const assignment = await tx.displayDeviceAssignment.upsert({
        where: {
          deviceId_publicationId: { deviceId, publicationId: publication.id },
        },
        create: {
          id: randomUUID(),
          deviceId,
          organizationId,
          buildingId: device.buildingId,
          locationId: device.locationId,
          publicationId: publication.id,
          profile: device.profile,
          assignedById: actor.userId,
        },
        update: {
          status: 'ACTIVE',
          revokedAt: null,
          revocationReason: null,
          assignedAt: new Date(),
          assignedById: actor.userId,
          lockVersion: { increment: 1 },
        },
      });
      await tx.displayDeviceEvent.create({
        data: {
          id: randomUUID(),
          deviceId,
          organizationId,
          buildingId: device.buildingId,
          eventType: 'PUBLICATION_ASSIGNED',
          requestId: dto.requestId,
          verifiedAt: new Date(),
          metadata: {
            assignmentId: assignment.id,
            publicationId: publication.id,
            actorUserId: actor.userId,
          },
        },
      });
      return assignment;
    });
  }

  async transition(
    organizationId: string,
    deviceId: string,
    actor: SpatialActor,
    dto: TransitionDisplayDeviceDto,
  ) {
    const device = await this.device(organizationId, deviceId);
    await this.authorization.require(
      actor,
      organizationId,
      device.buildingId,
      DisplayPermission.DISPLAY_PLAN_PUBLISH,
    );
    if (!administrativeTransitionAllowed(device.status, dto.status))
      throw new ConflictException('DEVICE_TRANSITION_NOT_ALLOWED');
    const updated = await this.prisma.displayDevice.updateMany({
      where: {
        id: deviceId,
        organizationId,
        lockVersion: dto.expectedLockVersion,
      },
      data: {
        status: dto.status as never,
        lockVersion: { increment: 1 },
        revokedAt: dto.status === 'REVOKED' ? new Date() : undefined,
        revocationReason: dto.status === 'REVOKED' ? dto.reason : undefined,
      },
    });
    if (updated.count !== 1)
      throw new ConflictException('DEVICE_VERSION_CONFLICT');
    await this.prisma.displayDeviceEvent.create({
      data: {
        id: randomUUID(),
        deviceId,
        organizationId,
        buildingId: device.buildingId,
        eventType: `DEVICE_${dto.status}`,
        requestId: dto.requestId,
        verifiedAt: new Date(),
        metadata: { reason: dto.reason, actorUserId: actor.userId },
      },
    });
    return this.device(organizationId, deviceId);
  }

  history(
    organizationId: string,
    deviceId: string,
    actor: SpatialActor,
    page: number,
    limit: number,
  ) {
    return this.device(organizationId, deviceId).then(async (device) => {
      await this.authorization.require(
        actor,
        organizationId,
        device.buildingId,
        DisplayPermission.DISPLAY_READ,
      );
      return this.prisma.displayDeviceEvent.findMany({
        where: { deviceId, organizationId, buildingId: device.buildingId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
      });
    });
  }

  private async device(organizationId: string, deviceId: string) {
    const device = await this.prisma.displayDevice.findFirst({
      where: { id: deviceId, organizationId },
    });
    if (!device) throw new NotFoundException('DISPLAY_DEVICE_NOT_FOUND');
    return device;
  }
}
