import { randomUUID } from 'node:crypto';
import type {
  CachedPlan,
  PlayerDeviceIdentity,
  PlayerMode,
  TrustedManifestKey,
} from '../display-player/player-contracts';
import { validateManifest } from '../display-player/manifest-validator';
import { DeviceGatewayHttpClient } from './device-gateway-http-client';
import { PersistentPlanCache } from './persistent-runtime';

export class ConnectedPlayerService {
  private readonly cache: PersistentPlanCache;
  private active: CachedPlan | null = null;
  private mode: PlayerMode = 'PERMANENT_PLAN';

  constructor(
    private readonly identity: PlayerDeviceIdentity,
    private readonly trustedKeys: TrustedManifestKey[],
    cacheRoot: string,
    private readonly gateway: DeviceGatewayHttpClient,
  ) {
    this.cache = new PersistentPlanCache(
      cacheRoot,
      identity.deviceId,
      identity.locationId,
      (manifest, bytes) =>
        validateManifest(manifest, {
          device: identity,
          trustedKeys,
          now: new Date(),
          highestAcceptedSequence: 0,
          expectedDocument: bytes,
        }),
    );
  }

  async restore(): Promise<CachedPlan | null> {
    this.active = await this.cache.readVerified();
    return this.active;
  }

  async synchronize(): Promise<CachedPlan> {
    const previous = await this.cache.readVerified();
    const highestAcceptedSequence = previous?.manifest.payload.sequence ?? 0;
    const issued = await this.gateway.manifest(`manifest-${randomUUID()}`);
    validateManifest(issued.manifest, {
      device: this.identity,
      trustedKeys: this.trustedKeys,
      now: new Date(),
      highestAcceptedSequence,
      expectedAssignmentId: issued.manifest.payload.assignmentId,
    });
    const bytes = await this.gateway.render(
      issued.manifest.payload.publicationId,
      `render-${randomUUID()}`,
    );
    validateManifest(issued.manifest, {
      device: this.identity,
      trustedKeys: this.trustedKeys,
      now: new Date(),
      highestAcceptedSequence,
      expectedAssignmentId: issued.manifest.payload.assignmentId,
      expectedDocument: bytes,
    });
    await this.cache.commit(issued.manifest, bytes, new Date());
    this.active = await this.cache.readVerified();
    if (!this.active) throw new Error('PLAYER_ACTIVATION_FAILED');
    await this.gateway.confirm({
      requestId: `confirm-${randomUUID()}`,
      syncId: issued.syncId,
      manifestSequence: issued.manifest.payload.sequence,
      publicationId: issued.manifest.payload.publicationId,
      publicationVersion: issued.publicationVersion,
      assignmentId: issued.manifest.payload.assignmentId,
      documentSha256: issued.manifest.payload.documentSha256,
      activatedAt: new Date().toISOString(),
    });
    return this.active;
  }

  async heartbeat(networkStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED') {
    return this.gateway.heartbeat({
      requestId: `heartbeat-${randomUUID()}`,
      softwareVersion: this.identity.softwareVersion,
      mode: this.mode,
      documentVersionId: this.active?.manifest.payload.documentVersionId,
      lastAcceptedSequence: this.active?.manifest.payload.sequence ?? 0,
      cacheHealth: this.active ? 'HEALTHY' : 'DEGRADED',
      runtimeHealth: this.active ? 'HEALTHY' : 'DEGRADED',
      networkStatus,
      errorCodes: [],
    });
  }

  activeBytes(): Buffer {
    if (!this.active) throw new Error('PLAYER_PLAN_NOT_ACTIVE');
    return Buffer.from(this.active.bytes);
  }

  setMode(mode: PlayerMode) {
    this.mode = mode;
  }
}
