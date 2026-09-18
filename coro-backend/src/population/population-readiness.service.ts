import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PopulationAlertChannel,
  PopulationVerificationChannel,
} from '@prisma/client';

export type CapabilityStatus =
  | 'READY'
  | 'NOT_CONFIGURED'
  | 'INVALID'
  | 'NOT_VALIDATED';

type Environment = NodeJS.ProcessEnv;

export const POPULATION_ENVIRONMENT = Symbol('POPULATION_ENVIRONMENT');

const HMAC_SECRET_MIN_LENGTH = 32;
const AES_SECRET_NAMES = [
  'POPULATION_ACCESS_REQUEST_TOKEN_SECRET',
  'POPULATION_LOCATION_TOKEN_SECRET',
] as const;
const POPULATION_SECRET_NAMES = [
  'POPULATION_OTP_SECRET',
  'POPULATION_ACCESS_SECRET',
  ...AES_SECRET_NAMES,
] as const;

@Injectable()
export class PopulationReadinessService {
  constructor(
    @Inject(POPULATION_ENVIRONMENT)
    private readonly env: Environment,
  ) {}

  getReadiness() {
    const secrets = this.secretStatuses();
    const duplicateSecret = this.hasDuplicatePopulationSecrets();
    const otp = duplicateSecret ? 'INVALID' : secrets.POPULATION_OTP_SECRET;
    const accessSecret = duplicateSecret
      ? 'INVALID'
      : secrets.POPULATION_ACCESS_SECRET;
    const accessRequest = duplicateSecret
      ? 'INVALID'
      : secrets.POPULATION_ACCESS_REQUEST_TOKEN_SECRET;
    const location = duplicateSecret
      ? 'INVALID'
      : secrets.POPULATION_LOCATION_TOKEN_SECRET;

    return {
      population: {
        core: this.combine(otp, accessSecret, accessRequest, location),
        otp,
        access: this.combine(accessSecret, accessRequest),
        locationToken: location,
        geocoding: this.geocodingStatus(location),
        email: this.emailStatus(),
        sms: this.smsStatus(),
      },
    };
  }

  assertOtpReady() {
    this.assertStatus(this.getReadiness().population.otp, 'OTP Population');
  }

  assertAccessReady() {
    this.assertStatus(
      this.hmacSecretStatus('POPULATION_ACCESS_SECRET'),
      'Accès citoyen Population',
    );
    this.assertSecretsDistinct();
  }

  assertAccessRecoveryReady() {
    const status = this.getReadiness().population.access;
    this.assertStatus(status, 'Récupération d’accès Population');
    this.assertOtpReady();
  }

  assertLocationTokenReady() {
    this.assertStatus(
      this.getReadiness().population.locationToken,
      'Jetons de localisation Population',
    );
  }

  assertGeocodingReady() {
    this.assertStatus(
      this.getReadiness().population.geocoding,
      'Géocodage Population',
    );
  }

  assertVerificationChannelReady(channel: PopulationVerificationChannel) {
    this.assertOtpReady();
    if (channel === PopulationVerificationChannel.EMAIL)
      this.assertEmailReady();
    else this.assertSmsReady();
  }

  assertAlertChannelReady(channel: PopulationAlertChannel) {
    if (channel === PopulationAlertChannel.EMAIL) this.assertEmailReady();
    else this.assertSmsReady();
  }

  assertEmailReady() {
    this.assertStatus(this.emailStatus(), 'Transport courriel Population');
  }

  assertSmsReady() {
    this.assertStatus(this.smsStatus(), 'Transport SMS Population');
  }

  private secretStatuses() {
    return {
      POPULATION_OTP_SECRET: this.hmacSecretStatus('POPULATION_OTP_SECRET'),
      POPULATION_ACCESS_SECRET: this.hmacSecretStatus(
        'POPULATION_ACCESS_SECRET',
      ),
      POPULATION_ACCESS_REQUEST_TOKEN_SECRET: this.aesSecretStatus(
        'POPULATION_ACCESS_REQUEST_TOKEN_SECRET',
      ),
      POPULATION_LOCATION_TOKEN_SECRET: this.aesSecretStatus(
        'POPULATION_LOCATION_TOKEN_SECRET',
      ),
    };
  }

  private hmacSecretStatus(name: string): CapabilityStatus {
    const value = this.value(name);
    if (!value) return 'NOT_CONFIGURED';
    return Buffer.byteLength(value, 'utf8') >= HMAC_SECRET_MIN_LENGTH
      ? 'READY'
      : 'INVALID';
  }

  private aesSecretStatus(name: string): CapabilityStatus {
    const value = this.value(name);
    if (!value) return 'NOT_CONFIGURED';
    const key = /^[0-9a-fA-F]{64}$/.test(value)
      ? Buffer.from(value, 'hex')
      : /^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/.test(value)
        ? Buffer.from(value, 'base64')
        : null;
    return key?.length === 32 ? 'READY' : 'INVALID';
  }

  private emailStatus(): CapabilityStatus {
    if (!this.value('BREVO_API_KEY') || !this.value('BREVO_SENDER_EMAIL')) {
      return 'NOT_CONFIGURED';
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value('BREVO_SENDER_EMAIL')!)
      ? 'READY'
      : 'INVALID';
  }

  private smsStatus(): CapabilityStatus {
    if (!this.value('BREVO_API_KEY') || !this.value('BREVO_SMS_SENDER')) {
      return 'NOT_CONFIGURED';
    }
    return this.value('POPULATION_SMS_PRODUCTION_VALIDATED') === 'true'
      ? 'READY'
      : 'NOT_VALIDATED';
  }

  private geocodingStatus(locationStatus: CapabilityStatus): CapabilityStatus {
    const provider = this.value('GEOCODING_PROVIDER');
    if (!provider) return 'NOT_CONFIGURED';
    if (provider.toLowerCase() !== 'mapbox') return 'INVALID';
    if (!this.value('MAPBOX_GEOCODING_ACCESS_TOKEN')) return 'NOT_CONFIGURED';
    if (locationStatus !== 'READY') return locationStatus;
    if (!this.optionalPositiveInteger('GEOCODING_TIMEOUT_MS')) return 'INVALID';
    if (!this.optionalPositiveInteger('GEOCODING_CACHE_TTL_SECONDS')) {
      return 'INVALID';
    }
    if (!this.optionalPositiveInteger('GEOCODING_CACHE_MAX_ENTRIES')) {
      return 'INVALID';
    }
    const cacheSecret = this.value('GEOCODING_CACHE_HMAC_SECRET');
    if (
      cacheSecret &&
      Buffer.byteLength(cacheSecret, 'utf8') < HMAC_SECRET_MIN_LENGTH
    ) {
      return 'INVALID';
    }
    return 'READY';
  }

  private optionalPositiveInteger(name: string) {
    const value = this.value(name);
    if (!value) return true;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0;
  }

  private hasDuplicatePopulationSecrets() {
    const configured = POPULATION_SECRET_NAMES.map((name) =>
      this.value(name),
    ).filter((value): value is string => Boolean(value));
    return new Set(configured).size !== configured.length;
  }

  private assertSecretsDistinct() {
    if (this.hasDuplicatePopulationSecrets()) {
      throw new ServiceUnavailableException(
        'La configuration de sécurité Population est invalide',
      );
    }
  }

  private combine(...statuses: CapabilityStatus[]): CapabilityStatus {
    if (statuses.includes('INVALID')) return 'INVALID';
    if (statuses.includes('NOT_CONFIGURED')) return 'NOT_CONFIGURED';
    if (statuses.includes('NOT_VALIDATED')) return 'NOT_VALIDATED';
    return 'READY';
  }

  private assertStatus(status: CapabilityStatus, capability: string) {
    if (status !== 'READY') {
      throw new ServiceUnavailableException(`${capability} indisponible`);
    }
  }

  private value(name: string) {
    return this.env[name]?.trim() || undefined;
  }
}
