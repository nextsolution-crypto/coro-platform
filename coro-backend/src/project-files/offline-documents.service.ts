import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign,
} from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

const LEASE_MS = 24 * 60 * 60 * 1000;
const FRESH_MFA_MS = 10 * 60 * 1000;
const ALLOWED_AUDIT_EVENTS = new Set([
  'OFFLINE_PREPARED',
  'OFFLINE_OPENED',
  'OFFLINE_PURGED',
  'OFFLINE_CORRUPT_REJECTED',
  'OFFLINE_EXPIRED_REJECTED',
  'OFFLINE_CLOCK_ROLLBACK_REJECTED',
]);

export type OfflineLeasePayload = {
  schemaVersion: 1;
  leaseId: string;
  deviceId: string;
  credentialIdHash: string;
  clientUserId: string;
  organizationId: string;
  buildingId: string;
  projectFileId: string;
  projectFileVersion: number;
  documentSha256: string;
  issuedAt: string;
  expiresAt: string;
};

@Injectable()
export class OfflineDocumentsService {
  private readonly registrationChallenges = new Map<
    string,
    { challenge: string; expiresAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  getPublicConfiguration() {
    const key = this.signingKey();
    if (!key || !this.webAuthnConfiguration())
      return { available: false, leaseMaxSeconds: 86400 };
    const publicKey = createPublicKey(key).export({
      format: 'der',
      type: 'spki',
    });
    return {
      available: true,
      algorithm: 'Ed25519',
      leaseMaxSeconds: 86400,
      publicKeySpki: Buffer.from(publicKey).toString('base64'),
      clockPolicy: 'BEST_EFFORT_LOCAL_HIGH_WATER_MARK',
    };
  }

  async registrationOptions(data: {
    clientUserId: string;
    email: string;
    displayName: string;
  }) {
    const configuration = this.webAuthnConfiguration();
    if (!configuration || !this.signingKey())
      throw new ServiceUnavailableException(
        'Autorite WebAuthn hors ligne indisponible',
      );
    const options = await generateRegistrationOptions({
      rpName: 'CORO Client Portal',
      rpID: configuration.rpId,
      userName: data.email,
      userDisplayName: data.displayName,
      userID: new TextEncoder().encode(data.clientUserId),
      timeout: 120_000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: { prf: {} },
    });
    this.registrationChallenges.set(data.clientUserId, {
      challenge: options.challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return options;
  }

  async registerDevice(data: {
    clientUserId: string;
    organizationId: string;
    mfaVerifiedAt?: string | null;
    credentialId: string;
    label: string;
    prfSupported: boolean;
    registrationResponse: RegistrationResponseJSON;
  }) {
    if (!data.prfSupported)
      throw new BadRequestException('WebAuthn PRF obligatoire');
    const mfaAt = data.mfaVerifiedAt ? new Date(data.mfaVerifiedAt) : null;
    if (
      !mfaAt ||
      Number.isNaN(mfaAt.getTime()) ||
      Date.now() - mfaAt.getTime() > FRESH_MFA_MS
    )
      throw new UnauthorizedException('MFA recente obligatoire');
    if (
      !/^[A-Za-z0-9_-]{16,1024}$/.test(data.credentialId) ||
      data.registrationResponse?.id !== data.credentialId
    )
      throw new BadRequestException('Identifiant WebAuthn invalide');
    const label = data.label?.trim();
    if (!label || label.length > 80)
      throw new BadRequestException('Libelle appareil invalide');
    const credentialIdHash = this.sha256(data.credentialId);
    const challenge = this.registrationChallenges.get(data.clientUserId);
    this.registrationChallenges.delete(data.clientUserId);
    const configuration = this.webAuthnConfiguration();
    if (!challenge || challenge.expiresAt < Date.now() || !configuration)
      throw new UnauthorizedException('Ceremonie WebAuthn expiree');
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: data.registrationResponse,
        expectedChallenge: challenge.challenge,
        expectedOrigin: configuration.origin,
        expectedRPID: configuration.rpId,
        requireUserVerification: true,
      });
    } catch {
      throw new UnauthorizedException('Preuve WebAuthn invalide');
    }
    if (
      !verification.verified ||
      !verification.registrationInfo?.userVerified ||
      data.registrationResponse.clientExtensionResults?.prf?.enabled !== true
    )
      throw new UnauthorizedException('Preuve WebAuthn PRF invalide');
    const credential = verification.registrationInfo.credential;
    const existing = await this.prisma.offlineDocumentDevice.findUnique({
      where: { credentialIdHash },
    });
    if (
      existing &&
      (existing.clientUserId !== data.clientUserId ||
        existing.organizationId !== data.organizationId)
    )
      throw new ConflictException('Appareil deja lie a une autre identite');
    if (existing?.revokedAt) throw new ConflictException('Appareil revoque');
    return this.prisma.offlineDocumentDevice.upsert({
      where: { credentialIdHash },
      create: {
        clientUserId: data.clientUserId,
        organizationId: data.organizationId,
        credentialIdHash,
        credentialPublicKey: Buffer.from(credential.publicKey),
        credentialCounter: credential.counter,
        credentialTransports: credential.transports ?? [],
        webauthnVerifiedAt: new Date(),
        prfSupported: true,
        label,
      },
      update: {
        label,
        prfSupported: true,
        credentialPublicKey: Buffer.from(credential.publicKey),
        credentialCounter: credential.counter,
        credentialTransports: credential.transports ?? [],
        webauthnVerifiedAt: new Date(),
      },
      select: { id: true, label: true, createdAt: true },
    });
  }

  async issueLease(data: {
    clientUserId: string;
    organizationId: string;
    permittedBuildingIds?: string[];
    deviceId: string;
    fileId: string;
  }) {
    const key = this.signingKey();
    if (!key)
      throw new ServiceUnavailableException(
        'Autorite de signature hors ligne indisponible',
      );
    const device = await this.prisma.offlineDocumentDevice.findFirst({
      where: {
        id: data.deviceId,
        clientUserId: data.clientUserId,
        organizationId: data.organizationId,
        revokedAt: null,
        prfSupported: true,
      },
    });
    if (!device) throw new NotFoundException('Appareil hors ligne introuvable');
    const now = new Date();
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: data.fileId,
        organizationId: data.organizationId,
        lifecycleState: 'APPROVED',
        offlineClassification: 'NON_SENSITIVE_EMERGENCY',
        offlineApprovedAt: { not: null },
        effectiveAt: { lte: now },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          {
            OR: [
              { supersededEffectiveAt: null },
              { supersededEffectiveAt: { gt: now } },
            ],
          },
        ],
        OR: [
          { building: { organizationId: data.organizationId, ...(data.permittedBuildingIds !== undefined ? { id: { in: data.permittedBuildingIds } } : {}) } },
          { buildingId: null, project: { organizationId: data.organizationId, ...(data.permittedBuildingIds !== undefined ? { buildingId: { in: data.permittedBuildingIds } } : {}) } },
        ],
      },
      include: { project: { select: { buildingId: true } } },
    });
    if (!file?.sha256 || !(file.buildingId ?? file.project?.buildingId))
      throw new NotFoundException('Document hors ligne inadmissible');
    const expiresAt = new Date(now.getTime() + LEASE_MS);
    const payload: OfflineLeasePayload = {
      schemaVersion: 1,
      leaseId: randomUUID(),
      deviceId: device.id,
      credentialIdHash: device.credentialIdHash,
      clientUserId: data.clientUserId,
      organizationId: data.organizationId,
      buildingId: (file.buildingId ?? file.project?.buildingId)!,
      projectFileId: file.id,
      projectFileVersion: file.version,
      documentSha256: file.sha256,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    const signature = sign(
      null,
      Buffer.from(JSON.stringify(payload)),
      key,
    ).toString('base64');
    await this.prisma.offlineDocumentLease.create({
      data: {
        leaseId: payload.leaseId,
        deviceId: device.id,
        clientUserId: data.clientUserId,
        organizationId: data.organizationId,
        buildingId: payload.buildingId,
        projectFileId: file.id,
        projectFileVersion: file.version,
        documentSha256: file.sha256,
        credentialIdHash: device.credentialIdHash,
        issuedAt: now,
        expiresAt,
      },
    });
    return { payload, signature };
  }

  async reconcile(data: {
    clientUserId: string;
    organizationId: string;
    permittedBuildingIds?: string[];
    deviceId: string;
    leaseIds: string[];
    events: Array<{
      requestId: string;
      leaseId?: string;
      eventType: string;
      occurredAt: string;
    }>;
  }) {
    if (
      !data.deviceId ||
      !Array.isArray(data.leaseIds) ||
      !Array.isArray(data.events)
    )
      throw new BadRequestException('Reconciliation hors ligne invalide');
    if (data.leaseIds.length > 200 || data.events.length > 500)
      throw new BadRequestException('Lot de reconciliation trop volumineux');
    const device = await this.prisma.offlineDocumentDevice.findFirst({
      where: {
        id: data.deviceId,
        clientUserId: data.clientUserId,
        organizationId: data.organizationId,
        revokedAt: null,
      },
    });
    if (!device) throw new NotFoundException('Appareil hors ligne introuvable');
    const now = new Date();
    const leases = await this.prisma.offlineDocumentLease.findMany({
      where: {
        leaseId: { in: data.leaseIds },
        deviceId: device.id,
        clientUserId: data.clientUserId,
        organizationId: data.organizationId,
      },
      include: {
        projectFile: { include: { project: { select: { buildingId: true } } } },
      },
    });
    const keep: string[] = [];
    const foundLeaseIds = new Set(leases.map((lease) => lease.leaseId));
    const purge: string[] = data.leaseIds.filter(
      (leaseId) => !foundLeaseIds.has(leaseId),
    );
    for (const lease of leases) {
      const valid =
        lease.expiresAt > now &&
        lease.projectFile.lifecycleState === 'APPROVED' &&
        lease.projectFile.offlineClassification === 'NON_SENSITIVE_EMERGENCY' &&
        lease.projectFile.version === lease.projectFileVersion &&
        lease.projectFile.sha256 === lease.documentSha256 &&
        (!lease.projectFile.expiresAt || lease.projectFile.expiresAt > now) &&
        (!lease.projectFile.effectiveAt ||
          lease.projectFile.effectiveAt <= now) &&
        (!lease.projectFile.supersededEffectiveAt ||
          lease.projectFile.supersededEffectiveAt > now) &&
        (data.permittedBuildingIds === undefined ||
          data.permittedBuildingIds.includes(
            (lease.projectFile.buildingId ?? lease.projectFile.project?.buildingId ?? ''),
          ));
      (valid ? keep : purge).push(lease.leaseId);
      await this.prisma.offlineDocumentLease.update({
        where: { id: lease.id },
        data: {
          status: valid
            ? 'RECONCILED'
            : lease.expiresAt <= now
              ? 'EXPIRED'
              : 'REVOKED',
          reconciledAt: now,
        },
      });
    }
    for (const event of data.events) {
      if (
        !/^[A-Za-z0-9:_-]{8,120}$/.test(event.requestId) ||
        !ALLOWED_AUDIT_EVENTS.has(event.eventType) ||
        (event.leaseId !== undefined && !foundLeaseIds.has(event.leaseId))
      )
        throw new BadRequestException('Evenement hors ligne invalide');
      const occurredAt = new Date(event.occurredAt);
      if (Number.isNaN(occurredAt.getTime()))
        throw new BadRequestException('Date evenement invalide');
      await this.prisma.offlineDocumentAuditEvent.upsert({
        where: {
          deviceId_requestId: {
            deviceId: device.id,
            requestId: event.requestId,
          },
        },
        create: {
          requestId: event.requestId,
          deviceId: device.id,
          clientUserId: data.clientUserId,
          organizationId: data.organizationId,
          leaseId: event.leaseId,
          eventType: event.eventType,
          occurredAt,
        },
        update: {},
      });
    }
    await this.prisma.offlineDocumentDevice.update({
      where: { id: device.id },
      data: { lastReconciledAt: now },
    });
    return { keep, purge, reconciledAt: now.toISOString() };
  }

  async revokeDevice(data: {
    clientUserId: string;
    organizationId: string;
    deviceId: string;
  }) {
    const changed = await this.prisma.offlineDocumentDevice.updateMany({
      where: {
        id: data.deviceId,
        clientUserId: data.clientUserId,
        organizationId: data.organizationId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (changed.count !== 1)
      throw new NotFoundException('Appareil hors ligne introuvable');
    await this.prisma.offlineDocumentLease.updateMany({
      where: {
        deviceId: data.deviceId,
        status: { in: ['ACTIVE', 'RECONCILED'] },
      },
      data: { status: 'REVOKED', reconciledAt: new Date() },
    });
    return { revoked: true };
  }

  private signingKey() {
    const raw = process.env.OFFLINE_LEASE_ED25519_PRIVATE_KEY;
    if (!raw) return null;
    try {
      const pem = raw.includes('BEGIN PRIVATE KEY')
        ? raw.replace(/\\n/g, '\n')
        : Buffer.from(raw, 'base64').toString('utf8');
      const key = createPrivateKey(pem);
      return key.asymmetricKeyType === 'ed25519' ? key : null;
    } catch {
      return null;
    }
  }

  private webAuthnConfiguration() {
    const rpId = process.env.OFFLINE_WEBAUTHN_RP_ID?.trim();
    const origin = process.env.OFFLINE_WEBAUTHN_ORIGIN?.trim();
    if (!rpId || !origin) return null;
    try {
      const parsed = new URL(origin);
      if (parsed.hostname !== rpId) return null;
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost')
        return null;
      return { rpId, origin: parsed.origin };
    } catch {
      return null;
    }
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
