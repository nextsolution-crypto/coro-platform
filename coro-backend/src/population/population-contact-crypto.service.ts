import { Inject, Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { POPULATION_ENVIRONMENT } from './population-environment';

export const POPULATION_CONTACT_CRYPTO_VERSION = 'v1' as const;
export const POPULATION_CONTACT_FINGERPRINT_VERSION = 'v1' as const;
export const POPULATION_CONTACT_MAX_PLAINTEXT_BYTES = 512;

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const MAX_ENVELOPE_BYTES = 2048;
const MAX_KEY_COUNT = 10;
const KEY_BYTES = 32;
const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const CHALLENGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const ACTIVE_KEY_ID_ENV = 'POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID';
const ENCRYPTION_KEYS_ENV = 'POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS';
const FINGERPRINT_KEY_ENV = 'POPULATION_CONTACT_CHANGE_FINGERPRINT_KEY';

const PROHIBITED_SECRET_NAMES = [
  'POPULATION_OTP_SECRET',
  'POPULATION_ACCESS_SECRET',
  'POPULATION_LOCATION_TOKEN_SECRET',
  'POPULATION_ACCESS_REQUEST_TOKEN_SECRET',
  'POPULATION_BREVO_WEBHOOK_SECRET',
  'POPULATION_BREVO_SMS_WEBHOOK_SECRET',
] as const;

export type PopulationContactType = 'PHONE' | 'EMAIL';

export type PopulationContactProtectedDestination = {
  version: typeof POPULATION_CONTACT_CRYPTO_VERSION;
  keyId: string;
  iv: string;
  ciphertext: string;
  tag: string;
};

export type PopulationContactCryptoErrorCode =
  | 'CONTACT_CRYPTO_NOT_CONFIGURED'
  | 'CONTACT_CRYPTO_INVALID_CONFIGURATION'
  | 'CONTACT_CRYPTO_UNKNOWN_VERSION'
  | 'CONTACT_CRYPTO_KEY_UNAVAILABLE'
  | 'CONTACT_CRYPTO_AUTHENTICATION_FAILED'
  | 'CONTACT_CRYPTO_INVALID_INPUT';

export class PopulationContactCryptoError extends Error {
  constructor(public readonly code: PopulationContactCryptoErrorCode) {
    super(code);
    this.name = 'PopulationContactCryptoError';
  }
}

type ParsedConfiguration = {
  activeKeyId: string;
  encryptionKeys: ReadonlyMap<string, Buffer>;
  fingerprintKey: Buffer;
};

type ConfigurationResult =
  | { status: 'READY'; configuration: ParsedConfiguration }
  | { status: 'NOT_CONFIGURED' | 'INVALID' };

function decodeBase64Key(value: string): Buffer | null {
  if (!BASE64_PATTERN.test(value)) return null;
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value || decoded.length !== KEY_BYTES) {
    return null;
  }
  return decoded;
}

function buffersEqual(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && timingSafeEqual(left, right);
}

function possibleSecretBuffers(value: string): Uint8Array[] {
  const candidates: Uint8Array[] = [Buffer.from(value, 'utf8')];
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    candidates.push(Buffer.from(value, 'hex'));
  }
  const base64 = decodeBase64Key(value);
  if (base64) candidates.push(base64);
  return candidates;
}

function parseConfiguration(env: NodeJS.ProcessEnv): ConfigurationResult {
  const activeKeyId = env[ACTIVE_KEY_ID_ENV]?.trim() || '';
  const encodedKeyring = env[ENCRYPTION_KEYS_ENV]?.trim() || '';
  const encodedFingerprintKey = env[FINGERPRINT_KEY_ENV]?.trim() || '';

  if (!activeKeyId && !encodedKeyring && !encodedFingerprintKey) {
    return { status: 'NOT_CONFIGURED' };
  }
  if (!activeKeyId || !encodedKeyring || !encodedFingerprintKey) {
    return { status: 'INVALID' };
  }
  if (!KEY_ID_PATTERN.test(activeKeyId)) return { status: 'INVALID' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(encodedKeyring);
  } catch {
    return { status: 'INVALID' };
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    Object.getPrototypeOf(parsed) !== Object.prototype
  ) {
    return { status: 'INVALID' };
  }
  // The compact canonical form also makes duplicate JSON property names
  // fail closed instead of accepting JSON.parse's last-value-wins behavior.
  if (JSON.stringify(parsed) !== encodedKeyring) {
    return { status: 'INVALID' };
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0 || entries.length > MAX_KEY_COUNT) {
    return { status: 'INVALID' };
  }

  const encryptionKeys = new Map<string, Buffer>();
  for (const [keyId, encodedKey] of entries) {
    if (!KEY_ID_PATTERN.test(keyId) || typeof encodedKey !== 'string') {
      return { status: 'INVALID' };
    }
    const key = decodeBase64Key(encodedKey);
    if (!key) return { status: 'INVALID' };
    if (
      [...encryptionKeys.values()].some((other) => buffersEqual(key, other))
    ) {
      return { status: 'INVALID' };
    }
    encryptionKeys.set(keyId, key);
  }
  if (!encryptionKeys.has(activeKeyId)) return { status: 'INVALID' };

  const fingerprintKey = decodeBase64Key(encodedFingerprintKey);
  if (!fingerprintKey) return { status: 'INVALID' };
  if (
    [...encryptionKeys.values()].some((key) =>
      buffersEqual(key, fingerprintKey),
    )
  ) {
    return { status: 'INVALID' };
  }

  const prohibited = PROHIBITED_SECRET_NAMES.flatMap((name) => {
    const value = env[name]?.trim();
    return value ? possibleSecretBuffers(value) : [];
  });
  if (
    [...encryptionKeys.values(), fingerprintKey].some((key) =>
      prohibited.some((secret) => buffersEqual(key, secret)),
    )
  ) {
    return { status: 'INVALID' };
  }

  return {
    status: 'READY',
    configuration: {
      activeKeyId,
      encryptionKeys,
      fingerprintKey,
    },
  };
}

export function getPopulationContactCryptoStatus(
  env: NodeJS.ProcessEnv,
): 'READY' | 'NOT_CONFIGURED' | 'INVALID' {
  return parseConfiguration(env).status;
}

function assertContactType(
  type: unknown,
): asserts type is PopulationContactType {
  if (type !== 'PHONE' && type !== 'EMAIL') {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
}

function assertChallengeId(
  challengeId: unknown,
): asserts challengeId is string {
  if (
    typeof challengeId !== 'string' ||
    !CHALLENGE_ID_PATTERN.test(challengeId)
  ) {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
}

function aad(challengeId: string, type: PopulationContactType, keyId: string) {
  return Buffer.from(
    JSON.stringify([
      'CORO',
      'Population',
      'ContactChange',
      POPULATION_CONTACT_CRYPTO_VERSION,
      keyId,
      challengeId,
      type,
    ]),
    'utf8',
  );
}

function decodeBase64Url(value: string, expectedLength?: number) {
  if (!BASE64URL_PATTERN.test(value)) return null;
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value) return null;
  if (expectedLength !== undefined && decoded.length !== expectedLength) {
    return null;
  }
  return decoded;
}

function parseEnvelope(
  serialized: string,
): PopulationContactProtectedDestination {
  if (
    typeof serialized !== 'string' ||
    Buffer.byteLength(serialized, 'utf8') > MAX_ENVELOPE_BYTES
  ) {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
  const record = parsed as Record<string, unknown>;
  const expectedKeys = ['ciphertext', 'iv', 'keyId', 'tag', 'version'];
  if (
    Object.keys(record).sort().join('|') !== expectedKeys.join('|') ||
    typeof record.version !== 'string'
  ) {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
  if (record.version !== POPULATION_CONTACT_CRYPTO_VERSION) {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_UNKNOWN_VERSION');
  }
  if (
    typeof record.keyId !== 'string' ||
    !KEY_ID_PATTERN.test(record.keyId) ||
    typeof record.iv !== 'string' ||
    !decodeBase64Url(record.iv, IV_BYTES) ||
    typeof record.tag !== 'string' ||
    !decodeBase64Url(record.tag, AUTH_TAG_BYTES) ||
    typeof record.ciphertext !== 'string'
  ) {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
  const ciphertext = decodeBase64Url(record.ciphertext);
  if (
    !ciphertext ||
    ciphertext.length === 0 ||
    ciphertext.length > POPULATION_CONTACT_MAX_PLAINTEXT_BYTES
  ) {
    throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
  }
  return {
    version: POPULATION_CONTACT_CRYPTO_VERSION,
    keyId: record.keyId,
    iv: record.iv,
    ciphertext: record.ciphertext,
    tag: record.tag,
  };
}

@Injectable()
export class PopulationContactCryptoService {
  constructor(
    @Inject(POPULATION_ENVIRONMENT)
    private readonly env: NodeJS.ProcessEnv,
  ) {}

  protectDestination(input: {
    challengeId: string;
    type: PopulationContactType;
    plaintext: string;
  }): string {
    assertChallengeId(input.challengeId);
    assertContactType(input.type);
    if (typeof input.plaintext !== 'string') {
      throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
    }
    const plaintext = Buffer.from(input.plaintext, 'utf8');
    if (
      plaintext.length === 0 ||
      plaintext.length > POPULATION_CONTACT_MAX_PLAINTEXT_BYTES
    ) {
      throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
    }
    const configuration = this.configuration();
    const key = configuration.encryptionKeys.get(configuration.activeKeyId)!;
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(
      aad(input.challengeId, input.type, configuration.activeKeyId),
    );
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const envelope: PopulationContactProtectedDestination = {
      version: POPULATION_CONTACT_CRYPTO_VERSION,
      keyId: configuration.activeKeyId,
      iv: iv.toString('base64url'),
      ciphertext: ciphertext.toString('base64url'),
      tag: cipher.getAuthTag().toString('base64url'),
    };
    return JSON.stringify(envelope);
  }

  unprotectDestination(input: {
    challengeId: string;
    type: PopulationContactType;
    protectedValue: string;
  }): string {
    assertChallengeId(input.challengeId);
    assertContactType(input.type);
    const envelope = parseEnvelope(input.protectedValue);
    const configuration = this.configuration();
    const key = configuration.encryptionKeys.get(envelope.keyId);
    if (!key) {
      throw new PopulationContactCryptoError('CONTACT_CRYPTO_KEY_UNAVAILABLE');
    }
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        decodeBase64Url(envelope.iv, IV_BYTES)!,
      );
      decipher.setAAD(aad(input.challengeId, input.type, envelope.keyId));
      decipher.setAuthTag(decodeBase64Url(envelope.tag, AUTH_TAG_BYTES)!);
      return Buffer.concat([
        decipher.update(decodeBase64Url(envelope.ciphertext)!),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new PopulationContactCryptoError(
        'CONTACT_CRYPTO_AUTHENTICATION_FAILED',
      );
    }
  }

  fingerprintDestination(input: {
    type: PopulationContactType;
    canonicalDestination: string;
  }): string {
    assertContactType(input.type);
    if (typeof input.canonicalDestination !== 'string') {
      throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
    }
    const canonical = Buffer.from(input.canonicalDestination, 'utf8');
    if (
      canonical.length === 0 ||
      canonical.length > POPULATION_CONTACT_MAX_PLAINTEXT_BYTES
    ) {
      throw new PopulationContactCryptoError('CONTACT_CRYPTO_INVALID_INPUT');
    }
    return createHmac('sha256', this.configuration().fingerprintKey)
      .update(
        JSON.stringify([
          'CORO',
          'Population',
          'ContactChange',
          'Fingerprint',
          POPULATION_CONTACT_FINGERPRINT_VERSION,
          input.type,
          input.canonicalDestination,
        ]),
        'utf8',
      )
      .digest('hex');
  }

  private configuration(): ParsedConfiguration {
    const result = parseConfiguration(this.env);
    if (result.status === 'NOT_CONFIGURED') {
      throw new PopulationContactCryptoError('CONTACT_CRYPTO_NOT_CONFIGURED');
    }
    if (result.status !== 'READY') {
      throw new PopulationContactCryptoError(
        'CONTACT_CRYPTO_INVALID_CONFIGURATION',
      );
    }
    return result.configuration;
  }
}
