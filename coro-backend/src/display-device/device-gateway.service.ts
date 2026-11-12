import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  createHash,
  createPublicKey,
  randomBytes,
  randomUUID,
  verify,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { canonicalize } from '../display-player/manifest-validator';
import type {
  DisplayProfile,
  SignedPlayerDisplayManifest,
} from '../display-player/player-contracts';
import { deviceEnrollmentStatement, digestSecret } from './device-security';
import {
  AuthenticatedDeviceRequestDto,
  ConfirmDisplaySyncDto,
  DeviceChallengeDto,
  DeviceRequestProofDto,
  DeviceTelemetryDto,
  ReconcileDeviceEventsDto,
  DeviceHeartbeatDto,
  EnrollDisplayDeviceDto,
} from './dto/device-gateway.dto';
import { DISPLAY_MANIFEST_SIGNER } from './manifest-signer';
import type { ManifestSigner } from './manifest-signer';

const sha256 = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');

const PROFILE_ALIASES: Record<string, DisplayProfile> = {
  LANDSCAPE_17X11: 'LANDSCAPE_17X11',
  TABLOID_11X17: 'LANDSCAPE_17X11',
  SOURCE_NATIVE: 'LANDSCAPE_17X11',
  WIDESCREEN_16X9: 'WIDESCREEN_16X9',
  SCREEN_16X9: 'WIDESCREEN_16X9',
  DISPLAY_16_9: 'WIDESCREEN_16X9',
  WIDESCREEN_16X10: 'WIDESCREEN_16X10',
  SCREEN_16X10: 'WIDESCREEN_16X10',
  DISPLAY_16_10: 'WIDESCREEN_16X10',
};

function resolveDisplayProfile(
  deviceProfile: string,
  assignmentProfile: string,
  width: number,
  height: number,
): DisplayProfile {
  const explicit =
    PROFILE_ALIASES[assignmentProfile] ?? PROFILE_ALIASES[deviceProfile];
  if (explicit && explicit !== 'LANDSCAPE_17X11') return explicit;
  const ratio = width / height;
  if (Math.abs(ratio - 17 / 11) <= 0.02) return 'LANDSCAPE_17X11';
  if (Math.abs(ratio - 16 / 9) <= 0.02) return 'WIDESCREEN_16X9';
  if (Math.abs(ratio - 16 / 10) <= 0.02) return 'WIDESCREEN_16X10';
  throw new ConflictException('DISPLAY_PROFILE_GEOMETRY_MISMATCH');
}

@Injectable()
export class DeviceGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(DISPLAY_MANIFEST_SIGNER)
    private readonly signer: ManifestSigner,
  ) {}

  async enroll(dto: EnrollDisplayDeviceDto) {
    let publicKey: ReturnType<typeof createPublicKey>;
    try {
      publicKey = createPublicKey(dto.publicKeyPem);
      if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error();
    } catch {
      throw new BadRequestException('DEVICE_PROOF_INVALID');
    }
    const signatureValid = verify(
      null,
      deviceEnrollmentStatement(dto),
      publicKey,
      Buffer.from(dto.signature, 'base64'),
    );
    if (!signatureValid)
      throw new UnauthorizedException('DEVICE_PROOF_INVALID');

    return this.prisma.$transaction(
      async (tx) => {
        const invitation =
          await tx.displayDeviceEnrollmentInvitation.findUnique({
            where: { id: dto.invitationId },
          });
        if (!invitation || invitation.consumedAt)
          throw new GoneException('INVITATION_INVALID_OR_USED');
        if (invitation.expiresAt <= new Date())
          throw new GoneException('INVITATION_EXPIRED');
        if (
          invitation.deviceId !== dto.deviceId ||
          invitation.expectedKeyId !== dto.keyId ||
          invitation.expectedPublicKey !== dto.publicKeyPem ||
          invitation.tokenHash !== digestSecret(dto.token)
        )
          throw new ForbiddenException('INVITATION_SCOPE_MISMATCH');

        const consumed = await tx.displayDeviceEnrollmentInvitation.updateMany({
          where: {
            id: invitation.id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { consumedAt: new Date(), consumedRequestId: dto.requestId },
        });
        if (consumed.count !== 1)
          throw new ConflictException('INVITATION_CONCURRENTLY_CONSUMED');
        const activated = await tx.displayDevice.updateMany({
          where: {
            id: dto.deviceId,
            organizationId: invitation.organizationId,
            buildingId: invitation.buildingId,
            locationId: invitation.locationId,
            status: 'PENDING_ENROLLMENT',
          },
          data: {
            status: 'ACTIVE',
            publicKey: dto.publicKeyPem,
            keyId: dto.keyId,
            softwareVersion: dto.softwareVersion,
            lockVersion: { increment: 1 },
          },
        });
        if (activated.count !== 1)
          throw new ConflictException('DEVICE_NOT_PENDING');
        await tx.displayDeviceEvent.create({
          data: {
            id: randomUUID(),
            deviceId: dto.deviceId,
            organizationId: invitation.organizationId,
            buildingId: invitation.buildingId,
            eventType: 'ENROLLED',
            requestId: dto.requestId,
            verifiedAt: new Date(),
          },
        });
        return { deviceId: dto.deviceId, status: 'ACTIVE' as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async challenge(dto: DeviceChallengeDto) {
    const device = await this.prisma.displayDevice.findUnique({
      where: { id: dto.deviceId },
    });
    if (!device || device.status !== 'ACTIVE')
      throw new UnauthorizedException('DEVICE_NOT_ACTIVE');
    const nonce = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 120_000);
    await this.prisma.displayDeviceNonce.create({
      data: {
        id: randomUUID(),
        deviceId: device.id,
        organizationId: device.organizationId,
        nonceHash: sha256(nonce),
        operation: dto.operation,
        httpMethod: dto.method,
        requestPath: dto.path,
        bodySha256: dto.bodySha256,
        expiresAt,
      },
    });
    return { nonce, expiresAt: expiresAt.toISOString() };
  }

  async manifest(dto: AuthenticatedDeviceRequestDto) {
    const device = await this.authenticate(
      dto.proof,
      'POST',
      '/device-gateway/manifest',
      { requestId: dto.requestId },
    );
    return this.prisma.$transaction(
      async (tx) => {
        const assignment = await tx.displayDeviceAssignment.findFirst({
          where: {
            deviceId: device.id,
            organizationId: device.organizationId,
            buildingId: device.buildingId,
            locationId: device.locationId,
            status: 'ACTIVE',
          },
          orderBy: { assignedAt: 'desc' },
        });
        if (!assignment) throw new NotFoundException('ASSIGNMENT_NOT_FOUND');
        const publication = await tx.displayPlanPublication.findFirst({
          where: {
            id: assignment.publicationId,
            organizationId: device.organizationId,
            buildingId: device.buildingId,
            locationId: device.locationId,
            status: 'PUBLISHED',
            revokedAt: null,
            variantStorageKey: { not: null },
            variantSha256: { not: null },
          },
        });
        if (!publication)
          throw new GoneException('PUBLICATION_NOT_DISTRIBUTABLE');
        const sequence = await tx.displayDeviceManifestSequence.upsert({
          where: { deviceId: device.id },
          create: {
            deviceId: device.id,
            organizationId: device.organizationId,
            nextSequence: BigInt(2),
          },
          update: { nextSequence: { increment: 1 } },
        });
        const manifestSequence = Number(sequence.nextSequence - BigInt(1));
        const sync = await tx.displayDeviceSync.create({
          data: {
            id: randomUUID(),
            deviceId: device.id,
            organizationId: device.organizationId,
            buildingId: device.buildingId,
            publicationId: publication.id,
            manifestSequence: BigInt(manifestSequence),
            status: 'MANIFEST_ISSUED',
            requestId: dto.requestId,
          },
        });
        if (!publication.widthPixels || !publication.heightPixels)
          throw new ConflictException('PUBLICATION_GEOMETRY_MISSING');
        const displayProfile = resolveDisplayProfile(
          device.profile,
          assignment.profile,
          publication.widthPixels,
          publication.heightPixels,
        );
        const issuedAt = new Date();
        const payload: SignedPlayerDisplayManifest['payload'] = {
          schemaVersion: 1,
          manifestId: sync.id,
          sequence: manifestSequence,
          assignmentId: assignment.id,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          locationId: device.locationId,
          publicationId: publication.id,
          documentVersionId: `${publication.id}:v${publication.versionNumber}:r${publication.variantVersion}`,
          documentSha256: publication.variantSha256!,
          displayProfile,
          width: publication.widthPixels,
          height: publication.heightPixels,
          issuedAt: issuedAt.toISOString(),
          reevaluateAt: new Date(
            issuedAt.getTime() + 10 * 60_000,
          ).toISOString(),
          knownRevoked: false,
          renderReference: `private://device-gateway/renders/${publication.id}`,
          policy: {
            planDurationSeconds: 40,
            communicationDurationSeconds: 10,
            safetyDurationSeconds: 10,
            allowApprovedSecondaryContent: false,
          },
        };
        const manifest: SignedPlayerDisplayManifest = {
          keyId: this.signer.keyId,
          algorithm: 'Ed25519',
          payload,
          signature: await this.signer.sign(payload),
        };
        return {
          syncId: sync.id,
          publicationVersion: publication.versionNumber,
          manifest,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async render(dto: AuthenticatedDeviceRequestDto, publicationId: string) {
    const device = await this.authenticate(
      dto.proof,
      'POST',
      `/device-gateway/renders/${publicationId}`,
      { requestId: dto.requestId },
    );
    const assignment = await this.prisma.displayDeviceAssignment.findFirst({
      where: {
        deviceId: device.id,
        publicationId,
        organizationId: device.organizationId,
        buildingId: device.buildingId,
        locationId: device.locationId,
        status: 'ACTIVE',
      },
    });
    if (!assignment) throw new ForbiddenException('RENDER_SCOPE_DENIED');
    const publication = await this.prisma.displayPlanPublication.findFirst({
      where: {
        id: publicationId,
        organizationId: device.organizationId,
        buildingId: device.buildingId,
        locationId: device.locationId,
        status: 'PUBLISHED',
        revokedAt: null,
      },
    });
    if (!publication?.variantStorageKey || !publication.variantSha256)
      throw new GoneException('RENDER_NOT_AVAILABLE');
    const bytes = await this.storage.downloadPrivate(
      publication.variantStorageKey,
    );
    if (sha256(bytes) !== publication.variantSha256)
      throw new GoneException('RENDER_INTEGRITY_FAILED');
    return {
      bytes,
      sha256: publication.variantSha256,
      mimeType: publication.variantMimeType ?? 'application/octet-stream',
    };
  }

  async revocations(dto: AuthenticatedDeviceRequestDto) {
    const device = await this.authenticate(
      dto.proof,
      'POST',
      '/device-gateway/revocations',
      { requestId: dto.requestId },
    );
    const revoked = await this.prisma.displayPlanPublication.findMany({
      where: {
        organizationId: device.organizationId,
        buildingId: device.buildingId,
        status: 'REVOKED',
      },
      select: { id: true, versionNumber: true, variantVersion: true },
      orderBy: { id: 'asc' },
    });
    const payload = {
      schemaVersion: 1,
      organizationId: device.organizationId,
      buildingId: device.buildingId,
      issuedAt: new Date().toISOString(),
      documentVersionIds: revoked.map(
        (item) => `${item.id}:v${item.versionNumber}:r${item.variantVersion}`,
      ),
    };
    return {
      keyId: this.signer.keyId,
      algorithm: 'Ed25519' as const,
      payload,
      signature: await this.signer.sign(payload),
    };
  }

  async confirm(dto: ConfirmDisplaySyncDto) {
    const device = await this.authenticate(
      dto.proof,
      'POST',
      '/device-gateway/sync/confirm',
      {
        requestId: dto.requestId,
        syncId: dto.syncId,
        manifestSequence: dto.manifestSequence,
        publicationId: dto.publicationId,
        publicationVersion: dto.publicationVersion,
        assignmentId: dto.assignmentId,
        documentSha256: dto.documentSha256,
        activatedAt: dto.activatedAt,
      },
    );
    return this.prisma.$transaction(async (tx) => {
      const sync = await tx.displayDeviceSync.findFirst({
        where: {
          id: dto.syncId,
          deviceId: device.id,
          publicationId: dto.publicationId,
          manifestSequence: BigInt(dto.manifestSequence),
          status: 'MANIFEST_ISSUED',
          organizationId: device.organizationId,
          buildingId: device.buildingId,
        },
      });
      if (!sync) throw new ConflictException('SYNC_CONFIRMATION_INVALID');
      const assignment = await tx.displayDeviceAssignment.findFirst({
        where: {
          id: dto.assignmentId,
          deviceId: device.id,
          publicationId: dto.publicationId,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          locationId: device.locationId,
          status: 'ACTIVE',
        },
      });
      if (!assignment)
        throw new ConflictException('SYNC_ASSIGNMENT_NO_LONGER_VALID');
      const publication = await tx.displayPlanPublication.findFirst({
        where: {
          id: dto.publicationId,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          locationId: device.locationId,
          versionNumber: dto.publicationVersion,
          status: 'PUBLISHED',
          revokedAt: null,
          variantSha256: dto.documentSha256,
        },
      });
      if (!publication)
        throw new ConflictException('SYNC_PUBLICATION_NO_LONGER_VALID');
      const advanced = await tx.displayDevice.updateMany({
        where: {
          id: device.id,
          status: 'ACTIVE',
          revokedAt: null,
          lastAcceptedManifestSequence: { lt: BigInt(dto.manifestSequence) },
        },
        data: {
          lastVerifiedSyncAt: new Date(),
          lastCommunicationAt: new Date(),
          lastAcceptedManifestSequence: BigInt(dto.manifestSequence),
          lastDeclaredPublicationId: dto.publicationId,
          lastDeclaredVersion: dto.publicationVersion,
        },
      });
      if (advanced.count !== 1)
        throw new ConflictException('SYNC_SEQUENCE_REPLAY_OR_ROLLBACK');
      const confirmed = await tx.displayDeviceSync.updateMany({
        where: { id: sync.id, status: 'MANIFEST_ISSUED' },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      if (confirmed.count !== 1)
        throw new ConflictException('SYNC_ALREADY_CONFIRMED');
      return { status: 'CONFIRMED' as const };
    });
  }

  async telemetry(dto: DeviceTelemetryDto) {
    const declared = {
      softwareVersion: dto.softwareVersion,
      publicationId: dto.publicationId,
      publicationVersion: dto.publicationVersion,
      mode: dto.mode,
      errors: dto.errors.slice(0, 20),
      restartCount: dto.restartCount,
      cacheHealth: dto.cacheHealth,
    };
    const device = await this.authenticate(
      dto.proof,
      'POST',
      '/device-gateway/telemetry',
      { requestId: dto.requestId, ...declared },
    );
    await this.prisma.$transaction([
      this.prisma.displayDevice.update({
        where: { id: device.id },
        data: {
          softwareVersion: dto.softwareVersion,
          lastCommunicationAt: new Date(),
        },
      }),
      this.prisma.displayDeviceEvent.create({
        data: {
          id: randomUUID(),
          deviceId: device.id,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          eventType: 'TELEMETRY_DECLARED',
          requestId: dto.requestId,
          declaredState: declared,
          verifiedAt: new Date(),
        },
      }),
    ]);
    return { accepted: true, observation: 'DECLARED_NOT_PHYSICALLY_VERIFIED' };
  }

  async heartbeat(dto: DeviceHeartbeatDto) {
    const declared = {
      softwareVersion: dto.softwareVersion,
      mode: dto.mode,
      documentVersionId: dto.documentVersionId,
      lastAcceptedSequence: dto.lastAcceptedSequence,
      cacheHealth: dto.cacheHealth,
      runtimeHealth: dto.runtimeHealth,
      networkStatus: dto.networkStatus,
      errorCodes: dto.errorCodes.slice(0, 20),
    };
    const device = await this.authenticate(
      dto.proof,
      'POST',
      '/device-gateway/heartbeat',
      { requestId: dto.requestId, ...declared },
    );
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.displayDevice.update({
        where: { id: device.id },
        data: {
          softwareVersion: dto.softwareVersion,
          lastCommunicationAt: now,
          lastHeartbeatAt: now,
          lastDeclaredMode: dto.mode,
          lastCacheHealth: dto.cacheHealth,
          lastRuntimeHealth: dto.runtimeHealth,
          lastNetworkStatus: dto.networkStatus,
          lastHeartbeatErrors: declared.errorCodes,
        },
      }),
      this.prisma.displayDeviceEvent.create({
        data: {
          id: randomUUID(),
          deviceId: device.id,
          organizationId: device.organizationId,
          buildingId: device.buildingId,
          eventType: 'HEARTBEAT_DECLARED',
          requestId: dto.requestId,
          declaredState: declared,
          verifiedAt: now,
        },
      }),
    ]);
    return {
      accepted: true,
      authenticatedAt: now.toISOString(),
      physicalDisplayProof: false,
    };
  }

  async reconcileEvents(dto: ReconcileDeviceEventsDto) {
    const declared = {
      events: dto.events.map((event) => ({
        id: event.id,
        sequence: event.sequence,
        occurredAt: event.occurredAt,
        type: event.type,
        details: event.details,
        previousHash: event.previousHash,
        hash: event.hash,
      })),
    };
    const device = await this.authenticate(
      dto.proof,
      'POST',
      '/device-gateway/events/reconcile',
      { requestId: dto.requestId, ...declared },
    );
    const lastAccepted = await this.prisma.displayDeviceEvent.findFirst({
      where: { deviceId: device.id, eventType: { startsWith: 'LOCAL_' } },
      orderBy: [{ verifiedAt: 'desc' }, { id: 'desc' }],
      select: { declaredState: true },
    });
    if (lastAccepted && dto.events.length) {
      const state = lastAccepted.declaredState as {
        sequence?: number;
        hash?: string;
      } | null;
      const first = dto.events[0];
      if (
        !state ||
        typeof state.sequence !== 'number' ||
        typeof state.hash !== 'string' ||
        first.sequence !== state.sequence + 1 ||
        first.previousHash !== state.hash
      )
        throw new BadRequestException('DEVICE_EVENT_HISTORY_FORK');
    }
    for (let index = 1; index < dto.events.length; index += 1) {
      const previous = dto.events[index - 1];
      const current = dto.events[index];
      if (
        current.sequence !== previous.sequence + 1 ||
        current.previousHash !== previous.hash
      )
        throw new BadRequestException('DEVICE_EVENT_CHAIN_INVALID');
    }
    for (const event of dto.events) {
      if (
        Object.keys(event.details).length > 32 ||
        JSON.stringify(event.details).length > 4096 ||
        Object.values(event.details).some(
          (value) =>
            value !== null &&
            !['string', 'number', 'boolean'].includes(typeof value),
        )
      )
        throw new BadRequestException('DEVICE_EVENT_DETAILS_INVALID');
      const expectedHash = sha256(
        canonicalize({
          id: event.id,
          sequence: event.sequence,
          occurredAt: event.occurredAt,
          type: event.type,
          details: event.details,
          previousHash: event.previousHash,
        }),
      );
      if (event.hash !== expectedHash)
        throw new BadRequestException('DEVICE_EVENT_HASH_INVALID');
    }
    await this.prisma.displayDeviceEvent.createMany({
      data: dto.events.map((event) => ({
        id: randomUUID(),
        deviceId: device.id,
        organizationId: device.organizationId,
        buildingId: device.buildingId,
        eventType: `LOCAL_${event.type}`.slice(0, 100),
        requestId: event.id,
        declaredState: {
          sequence: event.sequence,
          occurredAt: event.occurredAt,
          details: event.details,
          previousHash: event.previousHash,
          hash: event.hash,
          classification: 'HISTORICAL_DEVICE_DECLARATION',
        },
        verifiedAt: new Date(),
      })),
      skipDuplicates: true,
    });
    return {
      acceptedIds: dto.events.map((event) => event.id),
      classification: 'HISTORICAL_NOT_CURRENT_STATE',
    };
  }

  async authenticateDeviceRequest(
    proof: DeviceRequestProofDto,
    method: string,
    path: string,
    payload: Record<string, unknown>,
  ) {
    const expectedBodySha256 = sha256(canonicalize(payload));
    if (
      proof.method !== method ||
      proof.path !== path ||
      proof.bodySha256 !== expectedBodySha256
    )
      throw new UnauthorizedException('DEVICE_REQUEST_SCOPE_MISMATCH');
    const device = await this.prisma.displayDevice.findUnique({
      where: { id: proof.deviceId },
    });
    if (!device || device.status !== 'ACTIVE' || device.revokedAt)
      throw new UnauthorizedException('DEVICE_NOT_ACTIVE');
    if (Math.abs(Date.now() - Date.parse(proof.timestamp)) > 120_000)
      throw new UnauthorizedException('DEVICE_REQUEST_STALE');
    const nonceHash = sha256(proof.nonce);
    const nonce = await this.prisma.displayDeviceNonce.findUnique({
      where: { nonceHash },
    });
    if (
      !nonce ||
      nonce.deviceId !== device.id ||
      nonce.organizationId !== device.organizationId ||
      nonce.httpMethod !== method ||
      nonce.requestPath !== path ||
      nonce.bodySha256 !== expectedBodySha256 ||
      nonce.consumedAt ||
      nonce.expiresAt <= new Date()
    )
      throw new UnauthorizedException('DEVICE_NONCE_INVALID');
    const statement = Buffer.from(
      [
        'CORO-DISPLAY-REQUEST',
        proof.deviceId,
        proof.timestamp,
        proof.nonce,
        method,
        path,
        expectedBodySha256,
      ].join('\n'),
    );
    let valid = false;
    try {
      valid = verify(
        null,
        statement,
        createPublicKey(device.publicKey),
        Buffer.from(proof.signature, 'base64'),
      );
    } catch {
      valid = false;
    }
    if (!valid) throw new UnauthorizedException('DEVICE_SIGNATURE_INVALID');
    const consumed = await this.prisma.displayDeviceNonce.updateMany({
      where: { id: nonce.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1)
      throw new UnauthorizedException('DEVICE_REQUEST_REPLAY');
    return device;
  }

  private authenticate(
    proof: DeviceRequestProofDto,
    method: string,
    path: string,
    payload: Record<string, unknown>,
  ) {
    return this.authenticateDeviceRequest(proof, method, path, payload);
  }
}
