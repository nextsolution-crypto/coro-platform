import { Injectable } from '@nestjs/common';
import { createPrivateKey, sign } from 'node:crypto';
import { canonicalize } from '../display-player/manifest-validator';

export interface ManifestSigner {
  readonly keyId: string;
  sign(payload: Record<string, unknown>): Promise<string>;
}

export const DISPLAY_MANIFEST_SIGNER = Symbol('DISPLAY_MANIFEST_SIGNER');

@Injectable()
export class EnvironmentManifestSigner implements ManifestSigner {
  readonly keyId = process.env.DISPLAY_MANIFEST_SIGNING_KEY_ID ?? '';

  sign(payload: Record<string, unknown>): Promise<string> {
    const pem = process.env.DISPLAY_MANIFEST_SIGNING_PRIVATE_KEY_PEM;
    if (!pem || !this.keyId) throw new Error('DISPLAY_SIGNER_NOT_CONFIGURED');
    const key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== 'ed25519')
      throw new Error('DISPLAY_SIGNER_KEY_INVALID');
    return Promise.resolve(
      sign(null, Buffer.from(canonicalize(payload)), key).toString('base64'),
    );
  }
}
