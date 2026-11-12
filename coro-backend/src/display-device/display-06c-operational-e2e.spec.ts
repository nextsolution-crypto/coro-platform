import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DisplayPermission, UserRole } from '@prisma/client';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import { SpatialAuthorizationService } from '../spatial/spatial-authorization.service';
import { StorageService } from '../storage/storage.service';
import type { TrustedManifestKey } from '../display-player/player-contracts';
import { canonicalize } from '../display-player/manifest-validator';
import { ConnectedPlayerService } from './connected-player-service';
import { DeviceAdministrationService } from './device-administration.service';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayHttpClient } from './device-gateway-http-client';
import { DeviceGatewayService } from './device-gateway.service';
import {
  LocalPlayerOrigin,
  SyntheticDeviceKeyStore,
} from './connected-player-runtime';
import { DISPLAY_MANIFEST_SIGNER, ManifestSigner } from './manifest-signer';
import { EmergencyStateStore } from './persistent-runtime';
import { DisplayManagerService } from '../display-plans/display-manager.service';

const execFileAsync = promisify(execFile);

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;

class FilesystemPrivateStorage {
  constructor(private readonly root: string) {}

  async put(key: string, bytes: Buffer) {
    const path = join(this.root, key.replaceAll('/', '_'));
    await mkdir(this.root, { recursive: true });
    await writeFile(path, bytes);
  }

  downloadPrivate(key: string) {
    return readFile(join(this.root, key.replaceAll('/', '_')));
  }
}

describePostgres('display-06c-operational-e2e', () => {
  jest.setTimeout(120_000);
  const prisma = new PrismaService();
  let app: INestApplication;
  let baseUrl: string;
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'coro-display-06c-e2e-'));
    const storage = new FilesystemPrivateStorage(join(root, 'private-storage'));
    const manifestKeys = generateKeyPairSync('ed25519');
    const signer: ManifestSigner = {
      keyId: 'display-06c-e2e-signing-key',
      sign: (payload) =>
        Promise.resolve(
          sign(
            null,
            Buffer.from(
              JSON.stringify(payload, Object.keys(payload as object).sort()),
            ),
            manifestKeys.privateKey,
          ).toString('base64'),
        ),
    };
    // Use the exact canonical representation verified by the Player.
    signer.sign = (payload) =>
      Promise.resolve(
        sign(
          null,
          Buffer.from(canonicalize(payload)),
          manifestKeys.privateKey,
        ).toString('base64'),
      );
    const module = await Test.createTestingModule({
      controllers: [DeviceGatewayController],
      providers: [
        DeviceGatewayService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: DISPLAY_MANIFEST_SIGNER, useValue: signer },
      ],
    }).compile();
    app = module.createNestApplication();
    await prisma.$connect();
    await app.listen(0, '127.0.0.1');
    const server = app.getHttpServer() as {
      address(): string | { port: number } | null;
    };
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('E2E_HTTP_BIND_FAILED');
    baseUrl = `http://127.0.0.1:${address.port}`;

    (globalThis as unknown as { __display06c: unknown }).__display06c = {
      storage,
      manifestKeys,
    };
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it('executes enrollment, M2M sync, private render, Chromium, offline restart and governed emergency', async () => {
    const suffix = randomUUID();
    const org = await prisma.organization.create({
      data: { name: `DISPLAY-06C E2E ${suffix}` },
    });
    const foreignOrganizations = await Promise.all([
      prisma.organization.create({
        data: { name: `DISPLAY-06C foreign A ${suffix}` },
      }),
      prisma.organization.create({
        data: { name: `DISPLAY-06C foreign B ${suffix}` },
      }),
    ]);
    const client = await prisma.client.create({
      data: { name: 'Client synthétique', organizationId: org.id },
    });
    const building = await prisma.building.create({
      data: {
        name: 'Bâtiment synthétique',
        address: '1 Test',
        city: 'Montréal',
        province: 'QC',
        organizationId: org.id,
        clientId: client.id,
      },
    });
    const floor = await prisma.buildingFloor.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        code: `RDC-${suffix.slice(0, 8)}`,
        name: 'Rez-de-chaussée',
      },
    });
    const location = await prisma.displayLocation.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        floorId: floor.id,
        code: `HALL-${suffix.slice(0, 8)}`,
        label: 'Hall synthétique',
      },
    });
    const professional = await prisma.user.create({
      data: {
        email: `display-e2e-${suffix}@example.invalid`,
        password: 'not-used',
        firstName: 'Professionnel',
        lastName: 'Synthétique',
        role: UserRole.OPERATOR,
        organizationId: org.id,
        displayPermissions: [
          DisplayPermission.DISPLAY_READ,
          DisplayPermission.DISPLAY_PLAN_PUBLISH,
          DisplayPermission.DISPLAY_PLAN_READ,
          DisplayPermission.DISPLAY_AUDIT_READ,
        ],
        displayBuildingIds: [building.id],
      },
    });
    const actor = {
      userId: professional.id,
      organizationId: org.id,
      role: professional.role,
    };
    const deviceKeys = new SyntheticDeviceKeyStore();
    const admin = new DeviceAdministrationService(
      prisma,
      new SpatialAuthorizationService(prisma),
    );
    const device = await admin.create(org.id, actor, {
      buildingId: building.id,
      locationId: location.id,
      profile: 'WIDESCREEN_16X9',
      keyId: await deviceKeys.keyId(),
      publicKeyPem: await deviceKeys.publicKeyPem(),
      requestId: `create-${suffix}`,
    });
    const invitation = await admin.invite(org.id, device.id, actor, {
      requestId: `invite-${suffix}`,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    const gateway = new DeviceGatewayHttpClient(baseUrl, device.id, deviceKeys);
    await gateway.enroll({
      invitationId: invitation.invitationId,
      token: invitation.token,
      softwareVersion: 'display-06c-e2e',
      requestId: `enroll-${suffix}`,
    });
    await expect(
      gateway.enroll({
        invitationId: invitation.invitationId,
        token: invitation.token,
        softwareVersion: 'display-06c-e2e',
        requestId: `enroll-replay-${suffix}`,
      }),
    ).rejects.toThrow('GATEWAY_HTTP_410');

    const renderBytes = Buffer.from(
      'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA',
      'base64',
    );
    const renderSha = createHash('sha256').update(renderBytes).digest('hex');
    const storage = (
      globalThis as unknown as {
        __display06c: { storage: FilesystemPrivateStorage };
      }
    ).__display06c.storage;
    await storage.put(`display/${suffix}.webp`, renderBytes);
    const source = await prisma.projectFile.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        name: 'Plan synthétique E2E',
        category: 'plans_evacuation',
        size: renderBytes.length,
        mimeType: 'image/webp',
        storageKey: `display/${suffix}.webp`,
        url: 'private:e2e',
        version: 1,
        visibility: 'internal',
        status: 'valide',
        lifecycleState: 'APPROVED',
        sha256: renderSha,
        approvedAt: new Date(),
        approvedById: professional.id,
        effectiveAt: new Date(),
      },
    });
    const publication = await prisma.displayPlanPublication.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        floorId: floor.id,
        locationId: location.id,
        projectFileId: source.id,
        creationRequestId: `publication-${suffix}`,
        sourceVersion: 1,
        sourceSha256: renderSha,
        sourceApprovedById: professional.id,
        sourceApprovedAt: new Date(),
        versionNumber: 1,
        variantVersion: 1,
        variantStorageKey: `display/${suffix}.webp`,
        variantSha256: renderSha,
        variantMimeType: 'image/webp',
        widthPixels: 1920,
        heightPixels: 1080,
        orientation: 'LANDSCAPE',
        language: 'FR',
        renderParameters: { synthetic: true },
        status: 'PUBLISHED',
        createdById: professional.id,
        reviewedById: professional.id,
        reviewedAt: new Date(),
        approvedById: professional.id,
        approvedAt: new Date(),
        publishedById: professional.id,
        publishedAt: new Date(),
      },
    });
    const assignment = await admin.assign(org.id, device.id, actor, {
      publicationId: publication.id,
      requestId: `assign-${suffix}`,
    });

    const manifestKeys = (
      globalThis as unknown as {
        __display06c: { manifestKeys: ReturnType<typeof generateKeyPairSync> };
      }
    ).__display06c.manifestKeys;
    const trustedKeys: TrustedManifestKey[] = [
      {
        keyId: 'display-06c-e2e-signing-key',
        publicKeyPem: manifestKeys.publicKey
          .export({ type: 'spki', format: 'pem' })
          .toString(),
        activeFrom: new Date(0).toISOString(),
      },
    ];
    const identity = {
      deviceId: device.id,
      organizationId: org.id,
      buildingId: building.id,
      locationId: location.id,
      displayProfile: 'WIDESCREEN_16X9' as const,
      softwareVersion: 'display-06c-e2e',
    };
    const cacheRoot = join(root, 'cache');
    const player = new ConnectedPlayerService(
      identity,
      trustedKeys,
      cacheRoot,
      gateway,
    );
    const active = await player.synchronize();
    expect(Buffer.from(active.bytes).equals(renderBytes)).toBe(true);
    await player.heartbeat('ONLINE');
    const supervised = await new DisplayManagerService(prisma).getWorkspace(
      org.id,
      actor,
    );
    expect(supervised.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: device.id,
          lastNetworkStatus: 'ONLINE',
          lastCacheHealth: 'HEALTHY',
          lastRuntimeHealth: 'HEALTHY',
        }),
      ]),
    );
    expect(
      supervised.devices.some((candidate) =>
        foreignOrganizations.some(
          (foreign) => candidate.organizationId === foreign.id,
        ),
      ),
    ).toBe(false);

    const origin = new LocalPlayerOrigin(() =>
      Promise.resolve(player.activeBytes()),
    );
    const playerUrl = await origin.start();
    // Jest compiles this suite as CommonJS; Function preserves the native ESM
    // import required by Puppeteer when --experimental-vm-modules is enabled.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
    const puppeteer = (await new Function(
      'return import("puppeteer")',
    )()) as typeof import('puppeteer');
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(playerUrl, { waitUntil: 'networkidle0' });
    expect(
      await page.$eval('img', (image) => image.naturalWidth),
    ).toBeGreaterThan(0);
    const evidenceRoot =
      process.env.DISPLAY_06C_E2E_EVIDENCE_DIR ?? join(root, 'evidence');
    await mkdir(evidenceRoot, { recursive: true });
    await page.screenshot({ path: join(evidenceRoot, 'online.png') });

    await app.close();
    await page.reload({ waitUntil: 'networkidle0' });
    await page.screenshot({ path: join(evidenceRoot, 'offline.png') });
    const emergencyPath = join(root, 'emergency', 'state.json');
    const emergencyKey = createHash('sha256').update(suffix).digest();
    const emergency = new EmergencyStateStore(emergencyPath, emergencyKey);
    await emergency.write({
      mode: 'EMERGENCY_REAL',
      eventId: `event-${suffix}`,
      source: 'LOCAL_SYNTHETIC',
      priority: 3,
      occurredAt: new Date().toISOString(),
      version: 1,
      authorizationId: `activate-${suffix}`,
    });
    const restoredEmergency = new EmergencyStateStore(
      emergencyPath,
      emergencyKey,
    );
    expect((await restoredEmergency.read())?.mode).toBe('EMERGENCY_REAL');
    await page.screenshot({ path: join(evidenceRoot, 'emergency.png') });
    const restartResultPath = join(evidenceRoot, 'restart-process.json');
    await execFileAsync(
      process.execPath,
      [
        join(process.cwd(), 'node_modules', 'ts-node', 'dist', 'bin.js'),
        join(
          process.cwd(),
          'src',
          'display-device',
          'display-player-restart-probe.ts',
        ),
      ],
      {
        env: {
          ...process.env,
          DISPLAY_RESTART_IDENTITY_JSON: JSON.stringify(identity),
          DISPLAY_RESTART_TRUSTED_KEYS_JSON: JSON.stringify(trustedKeys),
          DISPLAY_RESTART_CACHE_ROOT: cacheRoot,
          DISPLAY_RESTART_EMERGENCY_PATH: emergencyPath,
          DISPLAY_RESTART_EMERGENCY_KEY_HEX: emergencyKey.toString('hex'),
          DISPLAY_RESTART_SCREENSHOT_PATH: join(evidenceRoot, 'restart.png'),
          DISPLAY_RESTART_RESULT_PATH: restartResultPath,
        },
        timeout: 60_000,
      },
    );
    const restartResult = JSON.parse(
      await readFile(restartResultPath, 'utf8'),
    ) as {
      pid: number;
      manifestSequence: number;
      documentSha256: string;
      emergencyMode: string;
      chromiumNaturalWidth: number;
    };
    expect(restartResult.pid).not.toBe(process.pid);
    expect(restartResult.manifestSequence).toBe(
      active.manifest.payload.sequence,
    );
    expect(restartResult.documentSha256).toBe(renderSha);
    expect(restartResult.emergencyMode).toBe('EMERGENCY_REAL');
    expect(restartResult.chromiumNaturalWidth).toBeGreaterThan(0);
    await expect(
      emergency.write({
        mode: 'PERMANENT_PLAN',
        eventId: `event-${suffix}`,
        source: 'LOCAL_SYNTHETIC',
        priority: 1,
        occurredAt: new Date().toISOString(),
        version: 2,
        authorizationId: `unauthorized-clear-${suffix}`,
      }),
    ).rejects.toThrow('EMERGENCY_GOVERNED_CLEAR_REQUIRED');
    await emergency.write(
      {
        mode: 'PERMANENT_PLAN',
        eventId: `event-${suffix}`,
        source: 'LOCAL_SYNTHETIC',
        priority: 1,
        occurredAt: new Date().toISOString(),
        version: 2,
        authorizationId: `governed-clear-${suffix}`,
      },
      { governedClear: true },
    );

    await browser.close();
    await origin.stop();
    const persistedDevice = await prisma.displayDevice.findUniqueOrThrow({
      where: { id: device.id },
    });
    const confirmed = await prisma.displayDeviceSync.findFirstOrThrow({
      where: { deviceId: device.id, status: 'CONFIRMED' },
    });
    expect(persistedDevice.lastHeartbeatAt).not.toBeNull();
    expect(persistedDevice.lastAcceptedManifestSequence).toBeGreaterThan(0n);
    expect(confirmed.confirmedAt).not.toBeNull();
    await writeFile(
      join(evidenceRoot, 'scenario.json'),
      JSON.stringify(
        {
          deviceId: device.id,
          assignmentId: assignment.id,
          publicationId: publication.id,
          manifestSequence: Number(confirmed.manifestSequence),
          renderSha256: renderSha,
          syncStatus: confirmed.status,
          heartbeatAt: persistedDevice.lastHeartbeatAt,
          supervisionVerified: true,
          syntheticOrganizationCount: 1 + foreignOrganizations.length,
          restartProcessPid: restartResult.pid,
          emergencyRestored: true,
          governedClear: true,
          physicalDisplayProof: false,
        },
        null,
        2,
      ),
    );
  });
});
