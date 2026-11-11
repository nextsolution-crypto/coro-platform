import { validateManifest } from '../display-player/manifest-validator';
import {
  PlayerDeviceIdentity,
  SignedPlayerDisplayManifest,
  TrustedManifestKey,
} from '../display-player/player-contracts';
import { PersistentPlanCache } from './persistent-runtime';

export interface PrivateRenderFetcher {
  fetch(
    reference: string,
    expectedOffset: number,
  ): Promise<{ bytes: Uint8Array; complete: boolean }>;
}

export interface DeviceSyncRequest {
  device: PlayerDeviceIdentity;
  manifest: SignedPlayerDisplayManifest;
  trustedKeys: TrustedManifestKey[];
  highestAcceptedSequence: number;
  expectedAssignmentId: string;
  now: Date;
}

export class DeviceSyncProtocol {
  constructor(
    private readonly cache: PersistentPlanCache,
    private readonly fetcher: PrivateRenderFetcher,
  ) {}

  async synchronize(
    request: DeviceSyncRequest,
  ): Promise<{ acceptedSequence: number; documentVersionId: string }> {
    validateManifest(request.manifest, {
      device: request.device,
      trustedKeys: request.trustedKeys,
      now: request.now,
      highestAcceptedSequence: request.highestAcceptedSequence,
      expectedAssignmentId: request.expectedAssignmentId,
    });
    if (!request.manifest.payload.renderReference.startsWith('private://'))
      throw new Error('PUBLIC_RENDER_REFERENCE_FORBIDDEN');
    const rendered = await this.fetcher.fetch(
      request.manifest.payload.renderReference,
      0,
    );
    if (!rendered.complete) throw new Error('RENDER_DOWNLOAD_INCOMPLETE');
    validateManifest(request.manifest, {
      device: request.device,
      trustedKeys: request.trustedKeys,
      now: request.now,
      highestAcceptedSequence: request.highestAcceptedSequence,
      expectedAssignmentId: request.expectedAssignmentId,
      expectedDocument: rendered.bytes,
    });
    await this.cache.commit(request.manifest, rendered.bytes, request.now);
    return {
      acceptedSequence: request.manifest.payload.sequence,
      documentVersionId: request.manifest.payload.documentVersionId,
    };
  }
}
