import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationConsentEventType,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  PopulationVerificationChannel,
  Prisma,
  RueAssessmentStatus,
  PopulationAlertChannel,
PopulationDeliveryStatus,
PopulationPreferredLanguage,
} from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurePopulationProgramDto } from './dto/population-program.dto';
import { RegisterPopulationSubscriberDto } from './dto/register-population-subscriber.dto';
import { VerifyPopulationSubscriberDto } from './dto/verify-population-subscriber.dto';
import { ResendPopulationVerificationDto } from './dto/resend-population-verification.dto';
import { UnsubscribePopulationSubscriberDto } from './dto/unsubscribe-population-subscriber.dto';
import { PopulationAccessDto } from './dto/population-access.dto';
import { UpdatePopulationPreferencesDto } from './dto/update-population-preferences.dto';
import { CreatePopulationAlertDraftDto } from './dto/create-population-alert-draft.dto';
import { UpdatePopulationAlertDraftDto } from './dto/update-population-alert-draft.dto';
import { PopulationGeospatialService } from './population-geospatial.service';
import {
  PopulationDeliveryService,
  PopulationProviderError,
} from './population-delivery.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { GeocodingError } from '../geocoding/geocoding.errors';
import { ResolvePopulationLocationDto } from './dto/resolve-population-location.dto';
import { ConfirmPopulationLocationDto } from './dto/confirm-population-location.dto';
import { RequestPopulationAccessByDestinationDto } from './dto/request-population-access-by-destination.dto';
import { VerifyPopulationAccessRequestDto } from './dto/verify-population-access-request.dto';
import { SelectPopulationLocationDto } from './dto/select-population-location.dto';
import type { GeocodingResult } from '../geocoding/geocoding.types';
import { PopulationReadinessService } from './population-readiness.service';

const POPULATION_LOCATION_RESOLUTION_PURPOSE =
  'POPULATION_LOCATION_RESOLUTION';
const POPULATION_LOCATION_RESOLUTION_TTL_MS = 10 * 60 * 1000;
const POPULATION_LOCATION_TOKEN_VERSION = 'v1';
const POPULATION_LOCATION_TOKEN_AAD = Buffer.from(
  `CORO:${POPULATION_LOCATION_RESOLUTION_PURPOSE}:${POPULATION_LOCATION_TOKEN_VERSION}`,
  'utf8',
);
const POPULATION_LOCATION_SELECTION_PURPOSE =
  'POPULATION_LOCATION_SELECTION';
const POPULATION_LOCATION_SELECTION_AAD = Buffer.from(
  `CORO:${POPULATION_LOCATION_SELECTION_PURPOSE}:${POPULATION_LOCATION_TOKEN_VERSION}`,
  'utf8',
);
const POPULATION_ACCESS_REQUEST_PURPOSE = 'POPULATION_ACCESS_REQUEST';
const POPULATION_ACCESS_REQUEST_TOKEN_VERSION = 'v1';
const POPULATION_ACCESS_REQUEST_TTL_MS = 10 * 60 * 1000;
const POPULATION_ACCESS_REQUEST_PLAINTEXT_BYTES = 512;
const POPULATION_ACCESS_REQUEST_TOKEN_AAD = Buffer.from(
  `CORO:${POPULATION_ACCESS_REQUEST_PURPOSE}:${POPULATION_ACCESS_REQUEST_TOKEN_VERSION}`,
  'utf8',
);

type PopulationLocationResolutionPayload = {
  purpose: typeof POPULATION_LOCATION_RESOLUTION_PURPOSE;
  subscriberId: string;
  programId: string;
  latitude: number;
  longitude: number;
  iat: number;
  exp: number;
  jti: string;
};

type PopulationLocationSelectionPayload = {
  purpose: typeof POPULATION_LOCATION_SELECTION_PURPOSE;
  subscriberId: string;
  programId: string;
  latitude: number;
  longitude: number;
  normalizedAddress: GeocodingResult['normalizedAddress'];
  iat: number;
  exp: number;
  jti: string;
};

type PopulationAccessRequestPayload = {
  purpose: typeof POPULATION_ACCESS_REQUEST_PURPOSE;
  programId: string;
  subscriberId: string;
  verificationId: string;
  channel: PopulationVerificationChannel;
  iat: number;
  exp: number;
  jti: string;
};

@Injectable()
export class PopulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly populationGeospatialService: PopulationGeospatialService,
    private readonly populationDeliveryService: PopulationDeliveryService,
    private readonly geocodingService: GeocodingService,
    private readonly readiness: PopulationReadinessService,
  ) {}

  private canReceiveSms(
    program: { smsEnabled: boolean },
    subscriber: { smsEnabled: boolean; phone: string | null },
  ) {
    return Boolean(
      subscriber.smsEnabled && program.smsEnabled && subscriber.phone,
    );
  }

  private canReceiveEmail(
    program: { emailEnabled: boolean },
    subscriber: { emailEnabled: boolean; email: string | null },
  ) {
    return Boolean(
      subscriber.emailEnabled && program.emailEnabled && subscriber.email,
    );
  }

  private async sendSubscriberOtp(data: {
    channel: PopulationVerificationChannel;
    destination: string;
    code: string;
    preferredLanguage: PopulationPreferredLanguage;
    purpose: 'VERIFICATION' | 'ACCESS';
  }): Promise<'SENT' | 'FAILED'> {
    const english = data.preferredLanguage === PopulationPreferredLanguage.EN;
    const isAccess = data.purpose === 'ACCESS';

    try {
      if (data.channel === PopulationVerificationChannel.SMS) {
        const message = english
          ? `CORO Sentinelle Population: your ${isAccess ? 'access' : 'verification'} code is ${data.code}. Valid for 10 minutes.`
          : `CORO Sentinelle Population : votre code ${isAccess ? "d'accès" : 'de vérification'} est ${data.code}. Valide 10 minutes.`;
        await this.populationDeliveryService.sendSms(data.destination, message);
      } else {
        const subject = english
          ? `Your ${isAccess ? 'access' : 'verification'} code - Sentinelle Population`
          : `Votre code ${isAccess ? "d'accès" : 'de vérification'} - Sentinelle Population`;
        const intro = english
          ? `Your ${isAccess ? 'access' : 'verification'} code is`
          : `Votre code ${isAccess ? "d'accès" : 'de vérification'} est`;
        const expiry = english
          ? 'It expires in 10 minutes. If you did not request this code, you can ignore this email.'
          : "Il expire dans 10 minutes. Si vous n'avez pas demandé ce code, vous pouvez ignorer ce courriel.";
        await this.populationDeliveryService.sendEmail({
          destination: data.destination,
          subject,
          html: `<p>${intro} <strong>${data.code}</strong>.</p><p>${expiry}</p>`,
        });
      }
      return 'SENT';
    } catch {
      return 'FAILED';
    }
  }

  /**
   * Charge le profil RUE d'un bâtiment.
   *
   * Cette méthode constitue la frontière métier commune entre :
   * - le futur configurateur PUE;
   * - Sentinelle Population;
   * - les futures données d'intervention.
   */
  async getRueFacilityProfile(buildingId: string) {
    const profile = await this.prisma.rueFacilityProfile.findUnique({
      where: { buildingId },
      include: {
        populationProgram: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Aucun profil RUE n’est configuré pour ce bâtiment',
      );
    }

    return profile;
  }

  /**
   * Vérifie qu'un site est réglementairement admissible
   * à Sentinelle Population.
   *
   * IMPORTANT :
   * être une installation industrielle ne suffit jamais.
   */
  async assertPopulationEligible(buildingId: string) {
    const profile = await this.getRueFacilityProfile(buildingId);

    if (profile.assessmentStatus !== RueAssessmentStatus.CONFIRMED_SUBJECT) {
      throw new BadRequestException(
        'Le site n’est pas confirmé comme assujetti au RUE',
      );
    }

    return profile;
  }

  /**
   * Vérifie que Sentinelle Population est réellement activé
   * et opérationnel pour le site.
   *
   * RUE applicable et Population activé sont deux états distincts.
   */

  async validateProgramReadiness(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    const program = await this.prisma.populationProgram.findUnique({
      where: {
        rueFacilityProfileId: profile.id,
      },
    });

    const missingRequirements: string[] = [];

    if (!program) {
      return {
        ready: false,
        missingRequirements: ['PROGRAM_NOT_CONFIGURED'],
      };
    }

    if (!program.publicSlug?.trim()) {
      missingRequirements.push('PUBLIC_SLUG_REQUIRED');
    }

    if (!program.nameFR?.trim()) {
      missingRequirements.push('NAME_FR_REQUIRED');
    }

    if (!program.smsEnabled && !program.emailEnabled) {
      missingRequirements.push('DELIVERY_CHANNEL_REQUIRED');
    }

    if (!program.privacyTextFR?.trim()) {
      missingRequirements.push('PRIVACY_TEXT_FR_REQUIRED');
    }

    if (!program.consentTextFR?.trim()) {
      missingRequirements.push('CONSENT_TEXT_FR_REQUIRED');
    }

    if (!program.consentVersion?.trim()) {
      missingRequirements.push('CONSENT_VERSION_REQUIRED');
    }

    const scenarios = await this.prisma.rueEmergencyScenario.findMany({
      where: {
        facilityProfileId: profile.id,
        isActive: true,
      },
      include: {
        impactZones: {
          where: {
            isActive: true,
          },
        },
      },
    });

    const operationalScenarioExists = scenarios.some((scenario) => {
      if (!scenario.validatedAt) {
        return false;
      }

      if (!scenario.defaultProtectiveAction) {
        return false;
      }

      if (!scenario.publicInstructionFR?.trim()) {
        return false;
      }

      return scenario.impactZones.some(
        (zone) =>
          Boolean(zone.validatedAt) &&
          (Boolean(zone.geometry) || zone.maxDistanceKm != null) &&
          Boolean(zone.protectiveAction) &&
          Boolean(zone.instructionFR?.trim()),
      );
    });

    if (!operationalScenarioExists) {
      missingRequirements.push('OPERATIONAL_SCENARIO_REQUIRED');
    }

    return {
      ready: missingRequirements.length === 0,
      missingRequirements,
    };
  }

  async markReady(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    const readiness = await this.validateProgramReadiness(buildingId);

    if (!readiness.ready) {
      throw new BadRequestException({
        message: 'Le programme Sentinelle Population n’est pas prêt',
        missingRequirements: readiness.missingRequirements,
      });
    }

    const program = await this.prisma.populationProgram.findUnique({
      where: {
        rueFacilityProfileId: profile.id,
      },
    });

    if (!program) {
      throw new NotFoundException(
        'Aucun programme Sentinelle Population n’est configuré',
      );
    }

    if (program.status === PopulationProgramStatus.ARCHIVED) {
      throw new BadRequestException(
        'Un programme archivé ne peut pas être remis en état READY',
      );
    }

    if (program.status === PopulationProgramStatus.ACTIVE) {
      throw new BadRequestException(
        'Un programme actif ne peut pas être replacé en état READY',
      );
    }

    if (program.status === PopulationProgramStatus.SUSPENDED) {
      throw new BadRequestException(
        'Un programme suspendu doit être réactivé par le workflow d’activation',
      );
    }

    if (program.status === PopulationProgramStatus.READY) {
      return program;
    }

    return this.prisma.populationProgram.update({
      where: {
        id: program.id,
      },
      data: {
        status: PopulationProgramStatus.READY,
      },
    });
  }

  async activateProgram(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    const readiness = await this.validateProgramReadiness(buildingId);

    if (!readiness.ready) {
      throw new BadRequestException({
        message: 'Le programme Sentinelle Population n’est pas prêt à être activé',
        missingRequirements: readiness.missingRequirements,
      });
    }

    const program = await this.prisma.populationProgram.findUnique({
      where: {
        rueFacilityProfileId: profile.id,
      },
    });

    if (!program) {
      throw new NotFoundException(
        'Aucun programme Sentinelle Population n’est configuré',
      );
    }

    if (program.status === PopulationProgramStatus.ARCHIVED) {
      throw new BadRequestException(
        'Un programme archivé ne peut pas être activé',
      );
    }

    if (
      program.status !== PopulationProgramStatus.READY &&
      program.status !== PopulationProgramStatus.SUSPENDED &&
      program.status !== PopulationProgramStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Le programme doit être READY ou SUSPENDED avant son activation',
      );
    }

    if (
      program.status === PopulationProgramStatus.ACTIVE &&
      profile.populationEnabled
    ) {
      return program;
    }

    const now = new Date();

    const [, activatedProgram] = await this.prisma.$transaction([
      this.prisma.rueFacilityProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          populationEnabled: true,
        },
      }),

      this.prisma.populationProgram.update({
        where: {
          id: program.id,
        },
        data: {
          status: PopulationProgramStatus.ACTIVE,
          activatedAt: program.activatedAt ?? now,
          suspendedAt: null,
        },
      }),
    ]);

    return activatedProgram;
  }

  async suspendProgram(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    const program = await this.prisma.populationProgram.findUnique({
      where: {
        rueFacilityProfileId: profile.id,
      },
    });

    if (!program) {
      throw new NotFoundException(
        'Aucun programme Sentinelle Population n’est configuré',
      );
    }

    if (program.status === PopulationProgramStatus.ARCHIVED) {
      throw new BadRequestException(
        'Un programme archivé ne peut pas être suspendu',
      );
    }

    if (program.status === PopulationProgramStatus.SUSPENDED) {
      if (!profile.populationEnabled) {
        return program;
      }

      const [, suspendedProgram] = await this.prisma.$transaction([
        this.prisma.rueFacilityProfile.update({
          where: {
            id: profile.id,
          },
          data: {
            populationEnabled: false,
          },
        }),

        this.prisma.populationProgram.update({
          where: {
            id: program.id,
          },
          data: {
            suspendedAt: program.suspendedAt ?? new Date(),
          },
        }),
      ]);

      return suspendedProgram;
    }

    if (program.status !== PopulationProgramStatus.ACTIVE) {
      throw new BadRequestException(
        'Seul un programme ACTIVE peut être suspendu',
      );
    }

    const now = new Date();

    const [, suspendedProgram] = await this.prisma.$transaction([
      this.prisma.rueFacilityProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          populationEnabled: false,
        },
      }),

      this.prisma.populationProgram.update({
        where: {
          id: program.id,
        },
        data: {
          status: PopulationProgramStatus.SUSPENDED,
          suspendedAt: now,
        },
      }),
    ]);

    return suspendedProgram;
  }

  async archiveProgram(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    const program = await this.prisma.populationProgram.findUnique({
      where: {
        rueFacilityProfileId: profile.id,
      },
    });

    if (!program) {
      throw new NotFoundException(
        'Aucun programme Sentinelle Population n’est configuré',
      );
    }

    if (program.status === PopulationProgramStatus.ARCHIVED) {
      if (!profile.populationEnabled) {
        return program;
      }

      const [, archivedProgram] = await this.prisma.$transaction([
        this.prisma.rueFacilityProfile.update({
          where: {
            id: profile.id,
          },
          data: {
            populationEnabled: false,
          },
        }),

        this.prisma.populationProgram.update({
          where: {
            id: program.id,
          },
          data: {
            archivedAt: program.archivedAt ?? new Date(),
          },
        }),
      ]);

      return archivedProgram;
    }

    if (
      program.status !== PopulationProgramStatus.ACTIVE &&
      program.status !== PopulationProgramStatus.SUSPENDED
    ) {
      throw new BadRequestException(
        'Seul un programme ACTIVE ou SUSPENDED peut être archivé',
      );
    }

    const now = new Date();

    const [, archivedProgram] = await this.prisma.$transaction([
      this.prisma.rueFacilityProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          populationEnabled: false,
        },
      }),

      this.prisma.populationProgram.update({
        where: {
          id: program.id,
        },
        data: {
          status: PopulationProgramStatus.ARCHIVED,
          archivedAt: now,
        },
      }),
    ]);

    return archivedProgram;
  }

  async assertPopulationOperational(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    if (!profile.populationEnabled) {
      throw new BadRequestException(
        'Sentinelle Population n’est pas activé pour ce site',
      );
    }

    if (
      !profile.populationProgram ||
      profile.populationProgram.status !== PopulationProgramStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Le programme Sentinelle Population n’est pas actif',
      );
    }

    return profile;
  }

  /**
   * Retourne les informations publiques d'un programme Sentinelle Population.
   *
   * Un programme n'est publiquement accessible que si :
   * - son statut est ACTIVE;
   * - le site est toujours confirmé assujetti au RUE;
   * - Sentinelle Population est activé pour le site.
   *
   * Les informations internes utilisées pour effectuer cette vérification
   * ne sont jamais retournées au public.
   */
  async getPublicProgram(publicSlug: string) {
    const program = await this.prisma.populationProgram.findUnique({
      where: {
        publicSlug,
      },
      select: {
        publicSlug: true,

        nameFR: true,
        nameEN: true,

        descriptionFR: true,
        descriptionEN: true,

        publicPhone: true,
        publicEmail: true,
        websiteUrl: true,

        registrationEnabled: true,

        smsEnabled: true,
        emailEnabled: true,

        privacyTextFR: true,
        privacyTextEN: true,

        consentTextFR: true,
        consentTextEN: true,

        consentVersion: true,

        status: true,

        rueFacilityProfile: {
          select: {
            assessmentStatus: true,
            populationEnabled: true,
            building: {
              select: {
                name: true,
                address: true,
                city: true,
                province: true,
                postalCode: true,
              },
            },
          },
        },
      },
    });

    if (
      !program ||
      program.status !== PopulationProgramStatus.ACTIVE ||
      program.rueFacilityProfile.assessmentStatus !==
        RueAssessmentStatus.CONFIRMED_SUBJECT ||
      !program.rueFacilityProfile.populationEnabled
    ) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    const {
      status: _status,
      rueFacilityProfile,
      ...publicProgram
    } = program;

    return {
      ...publicProgram,
      site: {
        name: rueFacilityProfile.building.name,
        address: rueFacilityProfile.building.address,
        city: rueFacilityProfile.building.city,
        province: rueFacilityProfile.building.province,
        postalCode: rueFacilityProfile.building.postalCode,
      },
    };
  }

  private generateVerificationCode() {
    return randomInt(100000, 1000000).toString();
  }

  private getOtpSecret() {
    const secret = process.env.POPULATION_OTP_SECRET;

    if (!secret) {
      throw new Error(
        'POPULATION_OTP_SECRET doit être configuré',
      );
    }

    return secret;
  }

  private getPopulationAccessSecret() {
    const secret = process.env.POPULATION_ACCESS_SECRET;

    if (!secret) {
      throw new Error(
        'POPULATION_ACCESS_SECRET doit être configuré',
      );
    }

    return secret;
  }

  private getPopulationLocationTokenKey() {
    const secret = process.env.POPULATION_LOCATION_TOKEN_SECRET?.trim();
    const unavailable = () =>
      new ServiceUnavailableException(
        'Résolution de localisation temporairement indisponible',
      );

    if (!secret) throw unavailable();

    let key: Buffer;
    if (/^[0-9a-fA-F]{64}$/.test(secret)) {
      key = Buffer.from(secret, 'hex');
    } else if (/^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/.test(secret)) {
      key = Buffer.from(secret, 'base64');
    } else {
      throw unavailable();
    }

    if (key.length !== 32) throw unavailable();
    return key;
  }

  private getPopulationAccessRequestTokenKey() {
    const secret = process.env.POPULATION_ACCESS_REQUEST_TOKEN_SECRET?.trim();
    const unavailable = () =>
      new ServiceUnavailableException(
        'Récupération d’accès temporairement indisponible',
      );

    if (!secret) throw unavailable();
    const key = /^[0-9a-fA-F]{64}$/.test(secret)
      ? Buffer.from(secret, 'hex')
      : /^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/.test(secret)
        ? Buffer.from(secret, 'base64')
        : null;
    if (!key || key.length !== 32) throw unavailable();
    return key;
  }

  private createPopulationAccessRequestToken(
    payload: PopulationAccessRequestPayload,
    key: Buffer,
  ) {
    const serialized = Buffer.from(JSON.stringify(payload), 'utf8');
    if (serialized.length > POPULATION_ACCESS_REQUEST_PLAINTEXT_BYTES) {
      throw new ServiceUnavailableException(
        'Récupération d’accès temporairement indisponible',
      );
    }
    const plaintext = Buffer.alloc(
      POPULATION_ACCESS_REQUEST_PLAINTEXT_BYTES,
      0x20,
    );
    serialized.copy(plaintext);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(POPULATION_ACCESS_REQUEST_TOKEN_AAD);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    return [
      POPULATION_ACCESS_REQUEST_TOKEN_VERSION,
      iv.toString('base64url'),
      ciphertext.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
    ].join('.');
  }

  private verifyPopulationAccessRequestToken(
    token: string,
  ): PopulationAccessRequestPayload {
    const invalid = () =>
      new BadRequestException('Code d’accès invalide ou expiré');
    const parts = token.split('.');
    if (
      parts.length !== 4 ||
      parts[0] !== POPULATION_ACCESS_REQUEST_TOKEN_VERSION
    ) {
      throw invalid();
    }
    const [, encodedIv, encodedCiphertext, encodedTag] = parts;
    const iv = Buffer.from(encodedIv, 'base64url');
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url');
    const tag = Buffer.from(encodedTag, 'base64url');
    if (
      iv.length !== 12 ||
      ciphertext.length !== POPULATION_ACCESS_REQUEST_PLAINTEXT_BYTES ||
      tag.length !== 16
    ) {
      throw invalid();
    }

    const key = this.getPopulationAccessRequestTokenKey();
    let payload: Partial<PopulationAccessRequestPayload>;
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(POPULATION_ACCESS_REQUEST_TOKEN_AAD);
      decipher.setAuthTag(tag);
      payload = JSON.parse(
        Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]).toString('utf8'),
      );
    } catch {
      throw invalid();
    }

    if (
      payload.purpose !== POPULATION_ACCESS_REQUEST_PURPOSE ||
      typeof payload.programId !== 'string' ||
      typeof payload.subscriberId !== 'string' ||
      typeof payload.verificationId !== 'string' ||
      !Object.values(PopulationVerificationChannel).includes(payload.channel!) ||
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      payload.iat > Date.now() ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now() ||
      typeof payload.jti !== 'string' ||
      !payload.jti
    ) {
      throw invalid();
    }
    return payload as PopulationAccessRequestPayload;
  }

  private createSubscriberAccessToken(
    subscriberId: string,
    programId: string,
  ) {
    const payload = {
      subscriberId,
      programId,
      exp: Date.now() + 30 * 60 * 1000,
    };

    const encodedPayload = Buffer.from(
      JSON.stringify(payload),
    ).toString('base64url');

    const signature = createHmac(
      'sha256',
      this.getPopulationAccessSecret(),
    )
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifySubscriberAccessToken(
    token: string,
    expectedSubscriberId: string,
    expectedProgramId: string,
  ) {
    const parts = token.split('.');

    if (parts.length !== 2) {
      throw new BadRequestException(
        'Jeton d’accès invalide',
      );
    }

    const [encodedPayload, suppliedSignature] = parts;

    const expectedSignature = createHmac(
      'sha256',
      this.getPopulationAccessSecret(),
    )
      .update(encodedPayload)
      .digest('base64url');

    const suppliedBuffer = Buffer.from(
      suppliedSignature,
      'utf8',
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      'utf8',
    );

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new BadRequestException(
        'Jeton d’accès invalide',
      );
    }

    let payload: {
      subscriberId?: string;
      programId?: string;
      exp?: number;
    };

    try {
      payload = JSON.parse(
        Buffer.from(
          encodedPayload,
          'base64url',
        ).toString('utf8'),
      );
    } catch {
      throw new BadRequestException(
        'Jeton d’accès invalide',
      );
    }

    if (
      payload.subscriberId !== expectedSubscriberId ||
      payload.programId !== expectedProgramId ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      throw new BadRequestException(
        'Jeton d’accès invalide ou expiré',
      );
    }

    return payload;
  }

  private createLocationResolutionToken(
    subscriberId: string,
    programId: string,
    result: Awaited<ReturnType<GeocodingService['geocode']>>,
    key: Buffer,
  ) {
    const issuedAt = Date.now();
    const payload: PopulationLocationResolutionPayload = {
      purpose: POPULATION_LOCATION_RESOLUTION_PURPOSE,
      subscriberId,
      programId,
      latitude: result.latitude,
      longitude: result.longitude,
      iat: issuedAt,
      exp: issuedAt + POPULATION_LOCATION_RESOLUTION_TTL_MS,
      jti: randomUUID(),
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(POPULATION_LOCATION_TOKEN_AAD);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const authenticationTag = cipher.getAuthTag();

    return {
      token: [
        POPULATION_LOCATION_TOKEN_VERSION,
        iv.toString('base64url'),
        ciphertext.toString('base64url'),
        authenticationTag.toString('base64url'),
      ].join('.'),
      expiresAt: payload.exp,
    };
  }

  private createLocationSelectionToken(
    subscriberId: string,
    programId: string,
    result: GeocodingResult,
    key: Buffer,
    issuedAt: number,
  ) {
    const payload: PopulationLocationSelectionPayload = {
      purpose: POPULATION_LOCATION_SELECTION_PURPOSE,
      subscriberId,
      programId,
      latitude: result.latitude,
      longitude: result.longitude,
      normalizedAddress: result.normalizedAddress,
      iat: issuedAt,
      exp: issuedAt + POPULATION_LOCATION_RESOLUTION_TTL_MS,
      jti: randomUUID(),
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(POPULATION_LOCATION_SELECTION_AAD);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    return [
      POPULATION_LOCATION_TOKEN_VERSION,
      iv.toString('base64url'),
      ciphertext.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
    ].join('.');
  }

  verifyLocationSelectionToken(
    token: string,
    expectedSubscriberId: string,
    expectedProgramId: string,
  ): PopulationLocationSelectionPayload {
    const invalidToken = () =>
      new BadRequestException(
        'Sélection de localisation invalide ou expirée',
      );
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== POPULATION_LOCATION_TOKEN_VERSION) {
      throw invalidToken();
    }
    const [, encodedIv, encodedCiphertext, encodedTag] = parts;
    const iv = Buffer.from(encodedIv, 'base64url');
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url');
    const tag = Buffer.from(encodedTag, 'base64url');
    if (iv.length !== 12 || !ciphertext.length || tag.length !== 16) {
      throw invalidToken();
    }

    let payload: Partial<PopulationLocationSelectionPayload>;
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.getPopulationLocationTokenKey(),
        iv,
      );
      decipher.setAAD(POPULATION_LOCATION_SELECTION_AAD);
      decipher.setAuthTag(tag);
      payload = JSON.parse(
        Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
          'utf8',
        ),
      );
    } catch {
      throw invalidToken();
    }

    const address = payload.normalizedAddress;
    if (
      payload.purpose !== POPULATION_LOCATION_SELECTION_PURPOSE ||
      payload.subscriberId !== expectedSubscriberId ||
      payload.programId !== expectedProgramId ||
      !Number.isFinite(payload.latitude) ||
      !Number.isFinite(payload.longitude) ||
      payload.latitude! < -90 ||
      payload.latitude! > 90 ||
      payload.longitude! < -180 ||
      payload.longitude! > 180 ||
      !address ||
      address.country !== 'CA' ||
      typeof address.province !== 'string' ||
      !address.province ||
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      payload.iat > Date.now() ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now() ||
      typeof payload.jti !== 'string' ||
      !payload.jti
    ) {
      throw invalidToken();
    }
    return payload as PopulationLocationSelectionPayload;
  }

  verifyLocationResolutionToken(
    token: string,
    expectedSubscriberId: string,
    expectedProgramId: string,
  ): PopulationLocationResolutionPayload {
    const invalidToken = () =>
      new BadRequestException(
        'Jeton de résolution de localisation invalide ou expiré',
      );
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== POPULATION_LOCATION_TOKEN_VERSION) {
      throw invalidToken();
    }

    const [, encodedIv, encodedCiphertext, encodedAuthenticationTag] = parts;
    const iv = Buffer.from(encodedIv, 'base64url');
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url');
    const authenticationTag = Buffer.from(encodedAuthenticationTag, 'base64url');
    if (iv.length !== 12 || !ciphertext.length || authenticationTag.length !== 16) {
      throw invalidToken();
    }

    const key = this.getPopulationLocationTokenKey();
    let payload: Partial<PopulationLocationResolutionPayload>;
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        iv,
      );
      decipher.setAAD(POPULATION_LOCATION_TOKEN_AAD);
      decipher.setAuthTag(authenticationTag);
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
      payload = JSON.parse(plaintext);
    } catch {
      throw invalidToken();
    }

    if (
      payload.purpose !== POPULATION_LOCATION_RESOLUTION_PURPOSE ||
      payload.subscriberId !== expectedSubscriberId ||
      payload.programId !== expectedProgramId ||
      !Number.isFinite(payload.latitude) ||
      !Number.isFinite(payload.longitude) ||
      payload.latitude! < -90 ||
      payload.latitude! > 90 ||
      payload.longitude! < -180 ||
      payload.longitude! > 180 ||
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      payload.iat > Date.now() ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now() ||
      typeof payload.jti !== 'string' ||
      !payload.jti
    ) {
      throw invalidToken();
    }

    return payload as PopulationLocationResolutionPayload;
  }

  private translateGeocodingError(error: unknown): never {
    if (!(error instanceof GeocodingError)) {
      throw new ServiceUnavailableException(
        'Résolution de localisation temporairement indisponible',
      );
    }
    if (error.code === 'GEOCODING_INVALID_INPUT') {
      throw new BadRequestException('Adresse invalide');
    }
    if (error.code === 'GEOCODING_NO_RESULT') {
      throw new UnprocessableEntityException('Adresse introuvable');
    }
    if (error.code === 'GEOCODING_AMBIGUOUS_RESULT') {
      throw new UnprocessableEntityException(
        'Adresse ambiguë; veuillez la préciser',
      );
    }
    throw new ServiceUnavailableException(
      'Résolution de localisation temporairement indisponible',
    );
  }

  private hashVerificationCode(code: string) {
    return createHmac(
      'sha256',
      this.getOtpSecret(),
    )
      .update(code)
      .digest('hex');
  }

  private verificationCodeMatches(
    code: string,
    codeHash: string,
  ) {
    const submittedHash = Buffer.from(
      this.hashVerificationCode(code),
      'hex',
    );

    const storedHash = Buffer.from(codeHash, 'hex');

    if (submittedHash.length !== storedHash.length) {
      return false;
    }

    return timingSafeEqual(submittedHash, storedHash);
  }

  private accessRequestResponse() {
    return {
      accepted: true,
      message:
        'Si les informations fournies sont admissibles, un code d’accès sera transmis.',
    };
  }

  /**
   * Inscrit un citoyen à un programme Sentinelle Population.
   *
   * L'inscription n'active jamais immédiatement l'abonné :
   * la vérification du téléphone ou du courriel sera effectuée
   * par le workflow OTP.
   */
  async registerSubscriber(
    publicSlug: string,
    dto: RegisterPopulationSubscriberDto,
  ) {
    const program = await this.prisma.populationProgram.findUnique({
      where: {
        publicSlug,
      },
      select: {
        id: true,
        status: true,
        registrationEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        consentVersion: true,

        rueFacilityProfile: {
          select: {
            assessmentStatus: true,
            populationEnabled: true,
          },
        },
      },
    });

    if (
      !program ||
      program.status !== PopulationProgramStatus.ACTIVE ||
      program.rueFacilityProfile.assessmentStatus !==
        RueAssessmentStatus.CONFIRMED_SUBJECT ||
      !program.rueFacilityProfile.populationEnabled
    ) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    if (!program.registrationEnabled) {
      throw new BadRequestException(
        'Les inscriptions à ce programme sont actuellement fermées',
      );
    }

    const phone = dto.phone?.trim() || null;
    const email = dto.email?.trim().toLowerCase() || null;

    if (!phone && !email) {
      throw new BadRequestException(
        'Un numéro de téléphone ou une adresse courriel est requis',
      );
    }

    if (phone && !program.smsEnabled) {
      throw new BadRequestException(
        'Les inscriptions par SMS ne sont pas disponibles pour ce programme',
      );
    }

    if (email && !program.emailEnabled) {
      throw new BadRequestException(
        'Les inscriptions par courriel ne sont pas disponibles pour ce programme',
      );
    }

    if (
      !program.consentVersion ||
      dto.consentVersion !== program.consentVersion
    ) {
      throw new BadRequestException(
        'La version du consentement n’est plus valide',
      );
    }

    const verificationChannel =
      phone && program.smsEnabled
        ? PopulationVerificationChannel.SMS
        : PopulationVerificationChannel.EMAIL;

    this.readiness.assertVerificationChannelReady(verificationChannel);

    const verificationCode = this.generateVerificationCode();

    const verificationExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    );

    const result = await this.prisma.$transaction(
      async (tx) => {
        const subscriber =
          await tx.populationSubscriber.create({
            data: {
              programId: program.id,
              phone,
              email,
              preferredLanguage: dto.preferredLanguage,
              status:
                PopulationSubscriberStatus.PENDING_VERIFICATION,
            },
            select: {
              id: true,
              status: true,
              preferredLanguage: true,
              createdAt: true,
            },
          });

        await tx.populationVerification.create({
          data: {
            subscriberId: subscriber.id,
            channel: verificationChannel,
            codeHash:
              this.hashVerificationCode(verificationCode),
            expiresAt: verificationExpiresAt,
            maxAttempts: 5,
          },
        });

        return subscriber;
      },
    );

    const deliveryStatus = await this.sendSubscriberOtp({
      channel: verificationChannel,
      destination:
        verificationChannel === PopulationVerificationChannel.SMS
          ? phone!
          : email!,
      code: verificationCode,
      preferredLanguage: dto.preferredLanguage,
      purpose: 'VERIFICATION',
    });

    return {
      subscriber: result,
      verificationRequired: true,
      verificationChannel,
      verificationExpiresAt,

      deliveryStatus,
    };
  }

  /**
   * Génère un nouveau code OTP pour une inscription en attente.
   *
   * Protections V1 :
   * - minimum 60 secondes entre deux codes;
   * - maximum 5 codes sur une période glissante de 60 minutes;
   * - expiration après 10 minutes;
   * - le workflow de vérification n'accepte que le code le plus récent
   *   du canal demandé.
   */
  async resendVerification(
    publicSlug: string,
    subscriberId: string,
    dto: ResendPopulationVerificationDto,
  ) {
    this.readiness.assertVerificationChannelReady(dto.channel);
    const program =
      await this.prisma.populationProgram.findUnique({
        where: {
          publicSlug,
        },
        select: {
          id: true,
          status: true,
          smsEnabled: true,
          emailEnabled: true,

          rueFacilityProfile: {
            select: {
              assessmentStatus: true,
              populationEnabled: true,
            },
          },
        },
      });

    if (
      !program ||
      program.status !== PopulationProgramStatus.ACTIVE ||
      program.rueFacilityProfile.assessmentStatus !==
        RueAssessmentStatus.CONFIRMED_SUBJECT ||
      !program.rueFacilityProfile.populationEnabled
    ) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    const subscriber =
      await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
        },
        select: {
          id: true,
          status: true,
          phone: true,
          email: true,
          preferredLanguage: true,
        },
      });

    if (!subscriber) {
      throw new NotFoundException(
        'Inscription introuvable',
      );
    }

    if (
      subscriber.status !==
      PopulationSubscriberStatus.PENDING_VERIFICATION
    ) {
      throw new BadRequestException(
        'Cette inscription n’est pas en attente de vérification',
      );
    }

    if (
      dto.channel === PopulationVerificationChannel.SMS &&
      (!subscriber.phone || !program.smsEnabled)
    ) {
      throw new BadRequestException(
        'La vérification SMS n’est pas disponible pour cette inscription',
      );
    }

    if (
      dto.channel === PopulationVerificationChannel.EMAIL &&
      (!subscriber.email || !program.emailEnabled)
    ) {
      throw new BadRequestException(
        'La vérification par courriel n’est pas disponible pour cette inscription',
      );
    }

    const latestVerification =
      await this.prisma.populationVerification.findFirst({
        where: {
          subscriberId,
          channel: dto.channel,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      });

    const now = new Date();

    if (
      latestVerification &&
      now.getTime() -
        latestVerification.createdAt.getTime() <
        60 * 1000
    ) {
      throw new BadRequestException(
        'Veuillez attendre avant de demander un nouveau code',
      );
    }

    const oneHourAgo = new Date(
      now.getTime() - 60 * 60 * 1000,
    );

    const recentVerificationCount =
      await this.prisma.populationVerification.count({
        where: {
          subscriberId,
          channel: dto.channel,
          createdAt: {
            gte: oneHourAgo,
          },
        },
      });

    if (recentVerificationCount >= 5) {
      throw new BadRequestException(
        'Trop de codes de vérification ont été demandés. Veuillez réessayer plus tard',
      );
    }

    const verificationCode =
      this.generateVerificationCode();

    const verificationExpiresAt = new Date(
      now.getTime() + 10 * 60 * 1000,
    );

    await this.prisma.populationVerification.create({
      data: {
        subscriberId,
        channel: dto.channel,
        codeHash:
          this.hashVerificationCode(verificationCode),
        expiresAt: verificationExpiresAt,
        maxAttempts: 5,
      },
    });

    const deliveryStatus = await this.sendSubscriberOtp({
      channel: dto.channel,
      destination:
        dto.channel === PopulationVerificationChannel.SMS
          ? subscriber.phone!
          : subscriber.email!,
      code: verificationCode,
      preferredLanguage: subscriber.preferredLanguage,
      purpose: 'VERIFICATION',
    });

    return {
      verificationRequired: true,
      verificationChannel: dto.channel,
      verificationExpiresAt,

      deliveryStatus,
    };
  }

  async requestSubscriberAccess(
    publicSlug: string,
    subscriberId: string,
    dto: ResendPopulationVerificationDto,
  ) {
    this.readiness.assertAccessRecoveryReady();
    this.readiness.assertVerificationChannelReady(dto.channel);
    const genericResponse = this.accessRequestResponse();
    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: {
        id: true,
        status: true,
        smsEnabled: true,
        emailEnabled: true,
        rueFacilityProfile: {
          select: {
            assessmentStatus: true,
            populationEnabled: true,
          },
        },
      },
    });

    if (
      !program ||
      program.status !== PopulationProgramStatus.ACTIVE ||
      program.rueFacilityProfile.assessmentStatus !==
        RueAssessmentStatus.CONFIRMED_SUBJECT ||
      !program.rueFacilityProfile.populationEnabled
    ) {
      return genericResponse;
    }

    const subscriber =
      await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
          status: PopulationSubscriberStatus.ACTIVE,
        },
        select: {
          id: true,
          phone: true,
          email: true,
          smsEnabled: true,
          emailEnabled: true,
          preferredLanguage: true,
        },
      });

    const destination =
      dto.channel === PopulationVerificationChannel.SMS
        ? subscriber?.smsEnabled && program.smsEnabled
          ? subscriber.phone
          : null
        : subscriber?.emailEnabled && program.emailEnabled
          ? subscriber.email
          : null;

    if (!subscriber || !destination) {
      return genericResponse;
    }

    const latestVerification =
      await this.prisma.populationVerification.findFirst({
        where: {
          subscriberId: subscriber.id,
          channel: dto.channel,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
    const now = new Date();

    if (
      latestVerification &&
      now.getTime() - latestVerification.createdAt.getTime() < 60 * 1000
    ) {
      return genericResponse;
    }

    const recentVerificationCount =
      await this.prisma.populationVerification.count({
        where: {
          subscriberId: subscriber.id,
          channel: dto.channel,
          createdAt: {
            gte: new Date(now.getTime() - 60 * 60 * 1000),
          },
        },
      });

    if (recentVerificationCount >= 5) {
      return genericResponse;
    }

    const verificationCode = this.generateVerificationCode();
    await this.prisma.populationVerification.create({
      data: {
        subscriberId: subscriber.id,
        channel: dto.channel,
        codeHash: this.hashVerificationCode(verificationCode),
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        maxAttempts: 5,
      },
    });

    await this.sendSubscriberOtp({
      channel: dto.channel,
      destination,
      code: verificationCode,
      preferredLanguage: subscriber.preferredLanguage,
      purpose: 'ACCESS',
    });

    return genericResponse;
  }

  async requestSubscriberAccessByDestination(
    publicSlug: string,
    dto: RequestPopulationAccessByDestinationDto,
  ) {
    this.readiness.assertAccessRecoveryReady();
    this.readiness.assertVerificationChannelReady(dto.channel);
    const key = this.getPopulationAccessRequestTokenKey();
    const now = Date.now();
    const verificationCode = this.generateVerificationCode();
    // This work is intentionally performed for real and decoy requests.
    const verificationCodeHash = this.hashVerificationCode(verificationCode);
    let programId: string = randomUUID();
    let subscriberId: string = randomUUID();
    let verificationId: string = randomUUID();

    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: {
        id: true,
        status: true,
        smsEnabled: true,
        emailEnabled: true,
        rueFacilityProfile: {
          select: { assessmentStatus: true, populationEnabled: true },
        },
      },
    });
    const operational = Boolean(
      program &&
        program.status === PopulationProgramStatus.ACTIVE &&
        program.rueFacilityProfile.assessmentStatus ===
          RueAssessmentStatus.CONFIRMED_SUBJECT &&
        program.rueFacilityProfile.populationEnabled,
    );
    const destination =
      dto.channel === PopulationVerificationChannel.EMAIL
        ? dto.destination.trim().toLowerCase()
        : dto.destination.trim();

    if (operational && destination) {
      const channelAvailable =
        dto.channel === PopulationVerificationChannel.SMS
          ? program!.smsEnabled
          : program!.emailEnabled;
      if (channelAvailable) {
        const candidates = await this.prisma.populationSubscriber.findMany({
          where: {
            programId: program!.id,
            status: PopulationSubscriberStatus.ACTIVE,
            ...(dto.channel === PopulationVerificationChannel.SMS
              ? { phone: destination, smsEnabled: true }
              : { email: destination, emailEnabled: true }),
          },
          select: {
            id: true,
            phone: true,
            email: true,
            preferredLanguage: true,
          },
          take: 2,
        });

        if (candidates.length === 1) {
          const subscriber = candidates[0];
          const latest = await this.prisma.populationVerification.findFirst({
            where: { subscriberId: subscriber.id, channel: dto.channel },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });
          const recentCount = await this.prisma.populationVerification.count({
            where: {
              subscriberId: subscriber.id,
              channel: dto.channel,
              createdAt: { gte: new Date(now - 60 * 60 * 1000) },
            },
          });
          if (
            (!latest || now - latest.createdAt.getTime() >= 60 * 1000) &&
            recentCount < 5
          ) {
            const verification =
              await this.prisma.populationVerification.create({
                data: {
                  subscriberId: subscriber.id,
                  channel: dto.channel,
                  codeHash: verificationCodeHash,
                  expiresAt: new Date(now + POPULATION_ACCESS_REQUEST_TTL_MS),
                  maxAttempts: 5,
                },
                select: { id: true },
              });
            programId = program!.id;
            subscriberId = subscriber.id;
            verificationId = verification.id;
            await this.sendSubscriberOtp({
              channel: dto.channel,
              destination:
                dto.channel === PopulationVerificationChannel.SMS
                  ? subscriber.phone!
                  : subscriber.email!,
              code: verificationCode,
              preferredLanguage: subscriber.preferredLanguage,
              purpose: 'ACCESS',
            });
          }
        }
      }
    }

    const expiresAt = now + POPULATION_ACCESS_REQUEST_TTL_MS;
    const accessRequestToken = this.createPopulationAccessRequestToken(
      {
        purpose: POPULATION_ACCESS_REQUEST_PURPOSE,
        programId,
        subscriberId,
        verificationId,
        channel: dto.channel,
        iat: now,
        exp: expiresAt,
        jti: randomUUID(),
      },
      key,
    );
    return {
      ...this.accessRequestResponse(),
      accessRequestToken,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async verifySubscriberAccessRequest(
    publicSlug: string,
    dto: VerifyPopulationAccessRequestDto,
  ) {
    this.readiness.assertAccessRecoveryReady();
    const invalid = () =>
      new BadRequestException('Code d’accès invalide ou expiré');
    const payload = this.verifyPopulationAccessRequestToken(
      dto.accessRequestToken,
    );
    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: { id: true },
    });
    if (!program || program.id !== payload.programId) throw invalid();

    const verification = await this.prisma.populationVerification.findFirst({
      where: {
        id: payload.verificationId,
        subscriberId: payload.subscriberId,
        channel: payload.channel,
        verifiedAt: null,
      },
      include: {
        subscriber: {
          select: { id: true, programId: true, status: true },
        },
      },
    });
    if (
      !verification ||
      verification.subscriber.programId !== program.id ||
      verification.subscriber.status !== PopulationSubscriberStatus.ACTIVE ||
      verification.expiresAt.getTime() <= Date.now() ||
      verification.attemptCount >= verification.maxAttempts
    ) {
      throw invalid();
    }
    if (!this.verificationCodeMatches(dto.code, verification.codeHash)) {
      await this.prisma.populationVerification.updateMany({
        where: {
          id: verification.id,
          verifiedAt: null,
          attemptCount: { lt: verification.maxAttempts },
        },
        data: { attemptCount: { increment: 1 } },
      });
      throw invalid();
    }
    const consumed = await this.prisma.populationVerification.updateMany({
      where: {
        id: verification.id,
        verifiedAt: null,
        attemptCount: { lt: verification.maxAttempts },
        expiresAt: { gt: new Date() },
      },
      data: { verifiedAt: new Date() },
    });
    if (consumed.count !== 1) throw invalid();

    return {
      verified: true,
      subscriberId: verification.subscriber.id,
      accessToken: this.createSubscriberAccessToken(
        verification.subscriber.id,
        program.id,
      ),
      accessTokenExpiresInSeconds: 30 * 60,
    };
  }

  async verifySubscriberAccess(
    publicSlug: string,
    subscriberId: string,
    dto: VerifyPopulationSubscriberDto,
  ) {
    this.readiness.assertAccessReady();
    this.readiness.assertOtpReady();
    const invalidAccess = () =>
      new BadRequestException('Code d’accès invalide ou expiré');
    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: { id: true },
    });

    if (!program) {
      throw invalidAccess();
    }

    const subscriber =
      await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
          status: PopulationSubscriberStatus.ACTIVE,
        },
        select: {
          id: true,
          smsEnabled: true,
          emailEnabled: true,
        },
      });

    const channelEnabled =
      dto.channel === PopulationVerificationChannel.SMS
        ? subscriber?.smsEnabled
        : subscriber?.emailEnabled;

    if (!subscriber || !channelEnabled) {
      throw invalidAccess();
    }

    const verification =
      await this.prisma.populationVerification.findFirst({
        where: {
          subscriberId: subscriber.id,
          channel: dto.channel,
          verifiedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

    if (
      !verification ||
      verification.expiresAt.getTime() <= Date.now() ||
      verification.attemptCount >= verification.maxAttempts
    ) {
      throw invalidAccess();
    }

    if (!this.verificationCodeMatches(dto.code, verification.codeHash)) {
      await this.prisma.populationVerification.update({
        where: { id: verification.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw invalidAccess();
    }

    const consumed =
      await this.prisma.populationVerification.updateMany({
        where: {
          id: verification.id,
          verifiedAt: null,
          attemptCount: { lt: verification.maxAttempts },
        },
        data: { verifiedAt: new Date() },
      });

    if (consumed.count !== 1) {
      throw invalidAccess();
    }

    return {
      verified: true,
      accessToken: this.createSubscriberAccessToken(
        subscriber.id,
        program.id,
      ),
      accessTokenExpiresInSeconds: 30 * 60,
    };
  }

  /**
   * Vérifie le code OTP d'un abonnement public.
   */
  async verifySubscriber(
    publicSlug: string,
    subscriberId: string,
    dto: VerifyPopulationSubscriberDto,
  ) {
    // Must run before a valid OTP can irreversibly activate the subscriber.
    this.readiness.assertAccessReady();
    this.readiness.assertOtpReady();
    const program =
      await this.prisma.populationProgram.findUnique({
        where: {
          publicSlug,
        },
        select: {
          id: true,
          status: true,
          consentVersion: true,

          rueFacilityProfile: {
            select: {
              assessmentStatus: true,
              populationEnabled: true,
            },
          },
        },
      });

    if (
      !program ||
      program.status !== PopulationProgramStatus.ACTIVE ||
      program.rueFacilityProfile.assessmentStatus !==
        RueAssessmentStatus.CONFIRMED_SUBJECT ||
      !program.rueFacilityProfile.populationEnabled
    ) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    const subscriber =
      await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
        },
      });

    if (!subscriber) {
      throw new NotFoundException(
        'Inscription introuvable',
      );
    }

    const isInitialVerification =
      subscriber.status ===
      PopulationSubscriberStatus.PENDING_VERIFICATION;

    const isAdditionalChannelVerification =
      subscriber.status === PopulationSubscriberStatus.ACTIVE &&
      ((dto.channel === PopulationVerificationChannel.SMS &&
        !subscriber.smsEnabled &&
        Boolean(subscriber.phone)) ||
        (dto.channel === PopulationVerificationChannel.EMAIL &&
          !subscriber.emailEnabled &&
          Boolean(subscriber.email)));

    const isAlreadyVerifiedChannel =
      subscriber.status === PopulationSubscriberStatus.ACTIVE &&
      ((dto.channel === PopulationVerificationChannel.SMS &&
        subscriber.smsEnabled) ||
        (dto.channel === PopulationVerificationChannel.EMAIL &&
          subscriber.emailEnabled));

    if (isAlreadyVerifiedChannel) {
      throw new BadRequestException(
        'Ce canal est déjà vérifié; demandez un nouveau code d’accès',
      );
    }

    if (
      !isInitialVerification &&
      !isAdditionalChannelVerification
    ) {
      throw new BadRequestException(
        'Ce canal ne peut pas être vérifié',
      );
    }

    const verification =
      await this.prisma.populationVerification.findFirst({
        where: {
          subscriberId,
          channel: dto.channel,
          verifiedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    if (!verification) {
      throw new BadRequestException(
        'Aucune vérification active trouvée',
      );
    }

    if (verification.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Le code de vérification est expiré',
      );
    }

    if (
      verification.attemptCount >=
      verification.maxAttempts
    ) {
      throw new BadRequestException(
        'Le nombre maximal de tentatives est atteint',
      );
    }

    const codeMatches = this.verificationCodeMatches(
      dto.code,
      verification.codeHash,
    );

    if (!codeMatches) {
      await this.prisma.populationVerification.update({
        where: {
          id: verification.id,
        },
        data: {
          attemptCount: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException(
        'Code de vérification invalide',
      );
    }

    if (!program.consentVersion) {
      throw new BadRequestException(
        'La version du consentement du programme est invalide',
      );
    }

    const consentVersion = program.consentVersion;
    const verifiedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.populationVerification.update({
        where: {
          id: verification.id,
        },
        data: {
          verifiedAt,
        },
      });

      await tx.populationSubscriber.update({
        where: {
          id: subscriber.id,
        },
        data: {
          status: PopulationSubscriberStatus.ACTIVE,

          verifiedAt:
            subscriber.verifiedAt ?? verifiedAt,

          smsEnabled:
            subscriber.smsEnabled ||
            dto.channel ===
              PopulationVerificationChannel.SMS,

          emailEnabled:
            subscriber.emailEnabled ||
            dto.channel ===
              PopulationVerificationChannel.EMAIL,
        },
      });

      await tx.populationConsentEvent.create({
        data: {
          programId: program.id,
          subscriberId: subscriber.id,
          type: isInitialVerification
            ? PopulationConsentEventType.SUBSCRIBED
            : PopulationConsentEventType.CONSENT_UPDATED,
          consentVersion,

          smsEnabled:
            subscriber.smsEnabled ||
            dto.channel ===
              PopulationVerificationChannel.SMS,

          emailEnabled:
            subscriber.emailEnabled ||
            dto.channel ===
              PopulationVerificationChannel.EMAIL,

          source: 'PUBLIC_PORTAL',
          occurredAt: verifiedAt,
        },
      });

      await tx.populationConsentEvent.create({
        data: {
          programId: program.id,
          subscriberId: subscriber.id,
          type: PopulationConsentEventType.VERIFIED,
          consentVersion,

          smsEnabled:
            subscriber.smsEnabled ||
            dto.channel ===
              PopulationVerificationChannel.SMS,

          emailEnabled:
            subscriber.emailEnabled ||
            dto.channel ===
              PopulationVerificationChannel.EMAIL,

          source: 'PUBLIC_PORTAL',
          occurredAt: verifiedAt,
        },
      });
    });

    return {
      verified: true,
      status: PopulationSubscriberStatus.ACTIVE,
      accessToken: this.createSubscriberAccessToken(
        subscriber.id,
        program.id,
      ),
      accessTokenExpiresInSeconds: 30 * 60,
    };
  }

      /**
   * Retourne les scénarios RUE disponibles pour Sentinelle Population.
   *
   * Cette lecture est disponible dès qu'un site est confirmé assujetti
   * au RUE. Le programme Population n'a pas besoin d'être ACTIVE afin
   * de permettre sa préparation et sa validation.
   *
   * Les scénarios demeurent la propriété du profil RUE partagé et ne
   * sont jamais dupliqués dans Population.
   */
  async getAvailableScenarios(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    const scenarios = await this.prisma.rueEmergencyScenario.findMany({
      where: {
        facilityProfileId: profile.id,
        isActive: true,
      },
      orderBy: [
        {
          nameFR: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        nameFR: true,
        nameEN: true,
        description: true,
        type: true,
        eventType: true,
        impactDistanceKm: true,
        impactMethod: true,
        defaultProtectiveAction: true,
        publicInstructionFR: true,
        publicInstructionEN: true,
        validatedAt: true,

        impactZones: {
          where: {
            isActive: true,
          },
          orderBy: {
            code: 'asc',
          },
          select: {
            id: true,
            code: true,
            nameFR: true,
            nameEN: true,
            protectiveAction: true,
            instructionFR: true,
            instructionEN: true,
            validatedAt: true,
            geometry: true,
            maxDistanceKm: true,
          },
        },
      },
    });

    return {
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        nameFR: scenario.nameFR,
        nameEN: scenario.nameEN,
        description: scenario.description,
        type: scenario.type,
        eventType: scenario.eventType,
        impactDistanceKm: scenario.impactDistanceKm,
        impactMethod: scenario.impactMethod,
        defaultProtectiveAction: scenario.defaultProtectiveAction,
        publicInstructionFR: scenario.publicInstructionFR,
        publicInstructionEN: scenario.publicInstructionEN,
        validatedAt: scenario.validatedAt,

        operational:
          Boolean(scenario.validatedAt) &&
          Boolean(scenario.defaultProtectiveAction) &&
          Boolean(scenario.publicInstructionFR?.trim()) &&
          scenario.impactZones.some(
            (zone) =>
              Boolean(zone.validatedAt) &&
              (Boolean(zone.geometry) || zone.maxDistanceKm != null) &&
              Boolean(zone.protectiveAction) &&
              Boolean(zone.instructionFR?.trim()),
          ),

        impactZones: scenario.impactZones.map((zone) => ({
          id: zone.id,
          code: zone.code,
          nameFR: zone.nameFR,
          nameEN: zone.nameEN,
          protectiveAction: zone.protectiveAction,
          instructionFR: zone.instructionFR,
          instructionEN: zone.instructionEN,
          validatedAt: zone.validatedAt,
          hasGeometry: Boolean(zone.geometry),
          maxDistanceKm: zone.maxDistanceKm,
          operational:
            Boolean(zone.validatedAt) &&
            (Boolean(zone.geometry) || zone.maxDistanceKm != null) &&
            Boolean(zone.protectiveAction) &&
            Boolean(zone.instructionFR?.trim()),
        })),
      })),
    };
  }

  /**
   * Calcule le ciblage géospatial interne d'un scénario RUE.
   *
   * Cette représentation conserve les informations nécessaires
   * à la création d'un snapshot historique d'alerte.
   *
   * Elle reste strictement interne au domaine Population.
   */
  private async calculateScenarioPopulationTargeting(
    buildingId: string,
    scenarioId: string,
  ) {
    const profile = await this.assertPopulationOperational(
      buildingId,
    );

    const building = await this.prisma.building.findUnique({
      where: {
        id: buildingId,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        province: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!building) {
      throw new NotFoundException(
        'Bâtiment introuvable',
      );
    }

    const program = profile.populationProgram;

    if (!program) {
      throw new BadRequestException(
        'Le programme Sentinelle Population n’est pas actif',
      );
    }

    const scenario =
      await this.prisma.rueEmergencyScenario.findFirst({
        where: {
          id: scenarioId,
          facilityProfileId: profile.id,
          isActive: true,
          validatedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          nameFR: true,
          nameEN: true,

          impactZones: {
            where: {
              isActive: true,
              validatedAt: {
                not: null,
              },
            },
            orderBy: {
              code: 'asc',
            },
            select: {
              id: true,
              code: true,
              nameFR: true,
              nameEN: true,
              geometry: true,
              maxDistanceKm: true,
              protectiveAction: true,
              instructionFR: true,
              instructionEN: true,
            },
          },
        },
      });

    if (!scenario) {
      throw new NotFoundException(
        'Scénario RUE actif et validé introuvable',
      );
    }

    const subscribers =
      await this.prisma.populationSubscriber.findMany({
        where: {
          programId: program.id,
          status: PopulationSubscriberStatus.ACTIVE,
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          phone: true,
          email: true,
          smsEnabled: true,
          emailEnabled: true,
        },
      });

    const geolocatedSubscribers = subscribers.filter(
      (
        subscriber,
      ): subscriber is typeof subscriber & {
        latitude: number;
        longitude: number;
      } =>
        subscriber.latitude !== null &&
        subscriber.longitude !== null &&
        Number.isFinite(subscriber.latitude) &&
        Number.isFinite(subscriber.longitude) &&
        subscriber.latitude >= -90 &&
        subscriber.latitude <= 90 &&
        subscriber.longitude >= -180 &&
        subscriber.longitude <= 180,
    );

    const uniqueTargetIds = new Set<string>();
    const uniqueSmsTargetIds = new Set<string>();
    const uniqueEmailTargetIds = new Set<string>();

    const zones = scenario.impactZones.map((zone) => {
      let targetCount = 0;
      let smsTargetCount = 0;
      let emailTargetCount = 0;

      for (const subscriber of geolocatedSubscribers) {
        const isInside =
          this.populationGeospatialService.isPointInsideImpactZone({
            latitude: subscriber.latitude,
            longitude: subscriber.longitude,
            geometry: zone.geometry,
            maxDistanceKm: zone.maxDistanceKm,
            referenceLatitude: building.latitude,
            referenceLongitude: building.longitude,
          });

        if (!isInside) {
          continue;
        }

        targetCount += 1;
        uniqueTargetIds.add(subscriber.id);

        if (this.canReceiveSms(program, subscriber)) {
          smsTargetCount += 1;
          uniqueSmsTargetIds.add(subscriber.id);
        }

        if (this.canReceiveEmail(program, subscriber)) {
          emailTargetCount += 1;
          uniqueEmailTargetIds.add(subscriber.id);
        }
      }

      return {
        id: zone.id,
        code: zone.code,
        nameFR: zone.nameFR,
        nameEN: zone.nameEN,
        geometry: zone.geometry,
        maxDistanceKm: zone.maxDistanceKm,
        protectiveAction: zone.protectiveAction,
        instructionFR: zone.instructionFR,
        instructionEN: zone.instructionEN,
        targetCount,
        smsTargetCount,
        emailTargetCount,
      };
    });

    return {
      profile,
      program,
      building,
      scenario: {
        id: scenario.id,
        nameFR: scenario.nameFR,
        nameEN: scenario.nameEN,
      },
      population: {
        activeSubscriberCount: subscribers.length,
        geolocatedSubscriberCount:
          geolocatedSubscribers.length,
        unlocatedSubscriberCount:
          subscribers.length -
          geolocatedSubscribers.length,
        uniqueTargetCount: uniqueTargetIds.size,
        uniqueSmsTargetCount: uniqueSmsTargetIds.size,
        uniqueEmailTargetCount:
          uniqueEmailTargetIds.size,
      },
      zones,
    };
  }

  /**
   * Retourne un aperçu agrégé de la population située dans
   * les zones d'impact d'un scénario RUE.
   *
   * Aucune identité, coordonnée ou destination individuelle
   * d'abonné n'est retournée à l'opérateur.
   */
  async getScenarioPopulationPreview(
    buildingId: string,
    scenarioId: string,
  ) {
    const targeting =
      await this.calculateScenarioPopulationTargeting(
        buildingId,
        scenarioId,
      );

    return {
      building: {
        id: targeting.building.id,
        name: targeting.building.name,
        address: targeting.building.address,
        city: targeting.building.city,
        province: targeting.building.province,
        latitude: targeting.building.latitude,
        longitude: targeting.building.longitude,
      },

      scenario: targeting.scenario,
      population: targeting.population,

      zones: targeting.zones.map((zone) => ({
        id: zone.id,
        code: zone.code,
        nameFR: zone.nameFR,
        nameEN: zone.nameEN,
        geometry: zone.geometry,
        maxDistanceKm: zone.maxDistanceKm,
        protectiveAction: zone.protectiveAction,
        instructionFR: zone.instructionFR,
        instructionEN: zone.instructionEN,
        targetCount: zone.targetCount,
        smsTargetCount: zone.smsTargetCount,
        emailTargetCount: zone.emailTargetCount,
      })),
    };
  }

  /**
   * Crée un brouillon d'alerte Population à partir d'un scénario
   * RUE actif et validé.
   *
   * Aucun SMS ou courriel n'est créé ou envoyé ici.
   * Le brouillon conserve un snapshot du contexte et des zones
   * utilisés au moment de sa création.
   */
  async createAlertDraft(
    buildingId: string,
    dto: CreatePopulationAlertDraftDto,
    actor: {
      type: string;
      id: string;
    },
  ) {
    if (
      dto.type === PopulationAlertType.UPDATE ||
      dto.type === PopulationAlertType.ALL_CLEAR
    ) {
      throw new BadRequestException(
        'UPDATE et ALL_CLEAR doivent être créés depuis le cycle de communication de l’incident',
      );
    }

    const targeting =
      await this.calculateScenarioPopulationTargeting(
        buildingId,
        dto.scenarioId,
      );

    const titleFR = dto.titleFR.trim();
    const messageFR = dto.messageFR.trim();

    if (!titleFR || !messageFR) {
      throw new BadRequestException(
        'Le titre et le message français sont requis',
      );
    }

    let incidentEventId: string | null = null;

    if (dto.incidentEventId?.trim()) {
      const incidentContext =
        await this.getPopulationAlertContextForIncident(
          buildingId,
          dto.incidentEventId.trim(),
        );

      incidentEventId =
        incidentContext.incident.id;
    }

    const createdAt = new Date();

    const contextSnapshot = {
      snapshotVersion: 1,

      building: {
        id: targeting.building.id,
        name: targeting.building.name,
        address: targeting.building.address,
        city: targeting.building.city,
        province: targeting.building.province,
        latitude: targeting.building.latitude,
        longitude: targeting.building.longitude,
      },

      scenario: {
        id: targeting.scenario.id,
        nameFR: targeting.scenario.nameFR,
        nameEN: targeting.scenario.nameEN,
      },

      population: targeting.population,

      targeting: {
        zoneCount: targeting.zones.length,
        calculatedAt: createdAt.toISOString(),
      },

      communication: {
        incidentEventId,
        type: dto.type,
      },
    };

    return this.prisma.$transaction(async (tx) => {
      const alert = await tx.populationAlert.create({
        data: {
          programId: targeting.program.id,
          incidentEventId,
          emergencyScenarioId: targeting.scenario.id,

          type: dto.type,
          status: PopulationAlertStatus.DRAFT,

          titleFR,
          titleEN: dto.titleEN?.trim() || null,

          messageFR,
          messageEN: dto.messageEN?.trim() || null,

          instructionFR:
            dto.instructionFR?.trim() || null,
          instructionEN:
            dto.instructionEN?.trim() || null,

          createdByType: actor.type as any,
          createdById: actor.id,

          contextSnapshot,
        },
      });

      if (targeting.zones.length > 0) {
        await tx.populationAlertZone.createMany({
          data: targeting.zones.map((zone) => ({
            alertId: alert.id,
            impactZoneId: zone.id,

            zoneCodeSnapshot: zone.code,
            zoneNameFRSnapshot: zone.nameFR,
            zoneNameENSnapshot: zone.nameEN,

            geometrySnapshot:
              zone.geometry === null
                ? Prisma.JsonNull
                : (zone.geometry as Prisma.InputJsonValue),

            maxDistanceKmSnapshot:
              zone.maxDistanceKm,

            protectiveActionSnapshot:
              zone.protectiveAction,

            instructionFRSnapshot:
              zone.instructionFR,

            instructionENSnapshot:
              zone.instructionEN,

            targetedSubscriberCount:
              zone.targetCount,
          })),
        });
      }

      return tx.populationAlert.findUnique({
        where: {
          id: alert.id,
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });
    });
  }

  /**
   * Charge une alerte Population appartenant au programme
   * opérationnel du bâtiment.
   */
  private async getPopulationAlertForBuilding(
    buildingId: string,
    alertId: string,
  ) {
    const profile = await this.assertPopulationOperational(
      buildingId,
    );

    const program = profile.populationProgram;

    if (!program) {
      throw new BadRequestException(
        'Le programme Sentinelle Population n’est pas actif',
      );
    }

    const alert = await this.prisma.populationAlert.findFirst({
      where: {
        id: alertId,
        programId: program.id,
      },
      include: {
        zones: {
          orderBy: {
            zoneCodeSnapshot: 'asc',
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException(
        'Alerte Sentinelle Population introuvable',
      );
    }

    return {
      profile,
      program,
      alert,
    };
  }

  /**
   * Charge une alerte Population historique appartenant au
   * programme du bâtiment.
   *
   * Contrairement à getPopulationAlertForBuilding(), cette
   * lecture n'exige pas que Sentinelle Population soit encore
   * opérationnel.
   *
   * Elle permet notamment de clôturer proprement une alerte
   * déjà diffusée après suspension ou désactivation du programme,
   * sans rouvrir les opérations de création ou de diffusion.
   */
  private async getPopulationAlertHistoricalForBuilding(
    buildingId: string,
    alertId: string,
  ) {
    const profile =
      await this.prisma.rueFacilityProfile.findUnique({
        where: {
          buildingId,
        },
        include: {
          populationProgram: true,
        },
      });

    if (!profile) {
      throw new NotFoundException(
        'Profil RUE introuvable pour ce bâtiment',
      );
    }

    const program = profile.populationProgram;

    if (!program) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    const alert =
      await this.prisma.populationAlert.findFirst({
        where: {
          id: alertId,
          programId: program.id,
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });

    if (!alert) {
      throw new NotFoundException(
        'Alerte Sentinelle Population introuvable',
      );
    }

    return {
      profile,
      program,
      alert,
    };
  }

  /**
   * Retourne une alerte Population et ses zones figées.
   *
   * Les livraisons individuelles ne sont volontairement pas
   * chargées par cette vue.
   */
  async getAlert(
    buildingId: string,
    alertId: string,
  ) {
    const { alert } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    return alert;
  }

  /**
   * Retourne l'état de diffusion d'une alerte Population.
   *
   * Cette vue est volontairement non nominative :
   * - aucune destination SMS ou courriel;
   * - aucune identité d'abonné;
   * - uniquement les statuts, canaux, langues et horodatages
   *   nécessaires au suivi opérationnel et à la preuve de diffusion.
   *
   * La lecture est historique : elle demeure disponible même si
   * le programme Population est ensuite suspendu ou désactivé.
   */
  async getAlertDeliveryStatus(
    buildingId: string,
    alertId: string,
  ) {
    const { alert } =
      await this.getPopulationAlertHistoricalForBuilding(
        buildingId,
        alertId,
      );

    const deliveries =
      await this.prisma.populationAlertDelivery.findMany({
        where: {
          alertId: alert.id,
        },
        select: {
          id: true,
          channel: true,
          status: true,
          language: true,
          queuedAt: true,
          sentAt: true,
          deliveredAt: true,
          failedAt: true,
          cancelledAt: true,
          provider: true,
        },
        orderBy: [
          {
            queuedAt: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    const counts = {
      total: deliveries.length,
      queued: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
      sms: 0,
      email: 0,
    };

    for (const delivery of deliveries) {
      if (delivery.channel === PopulationAlertChannel.SMS) {
        counts.sms += 1;
      }

      if (delivery.channel === PopulationAlertChannel.EMAIL) {
        counts.email += 1;
      }

      switch (delivery.status) {
        case PopulationDeliveryStatus.QUEUED:
          counts.queued += 1;
          break;

        case PopulationDeliveryStatus.SENDING:
          counts.sending += 1;
          break;

        case PopulationDeliveryStatus.SENT:
          counts.sent += 1;
          break;

        case PopulationDeliveryStatus.DELIVERED:
          counts.delivered += 1;
          break;

        case PopulationDeliveryStatus.FAILED:
          counts.failed += 1;
          break;

        case PopulationDeliveryStatus.CANCELLED:
          counts.cancelled += 1;
          break;
      }
    }

    return {
      alert: {
        id: alert.id,
        status: alert.status,
        type: alert.type,
        titleFR: alert.titleFR,
        incidentEventId: alert.incidentEventId,
        recipientsFrozenAt: alert.recipientsFrozenAt,
        sendingAt: alert.sendingAt,
        activatedAt: alert.activatedAt,
        endedAt: alert.endedAt,
        cancelledAt: alert.cancelledAt,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt,
      },
      counts,
      deliveries,
    };
  }

  /**
   * Retourne la chronologie immuable des communications Population
   * rattachées à un incident.
   *
   * Les destinations individuelles et les identités des abonnés
   * ne sont jamais exposées dans cette vue.
   */
  async getIncidentAlertHistory(
    buildingId: string,
    incidentEventId: string,
  ) {
        const {
      program,
    } =
      await this.getPopulationAlertHistoricalContextForIncident(
        buildingId,
        incidentEventId,
      );

    const alerts =
      await this.prisma.populationAlert.findMany({
        where: {
          programId: program.id,
          incidentEventId,
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
          deliveries: {
            select: {
              id: true,
              channel: true,
              status: true,
              language: true,
              queuedAt: true,
              sentAt: true,
              deliveredAt: true,
              failedAt: true,
              cancelledAt: true,
              provider: true,
            },
            orderBy: {
              queuedAt: 'asc',
            },
          },
        },
        orderBy: [
          {
            createdAt: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    return alerts;
  }

  /**
   * Vérifie qu'un incident appartient au bâtiment et à l'organisation
   * couverts par le programme Population courant.
   *
   * Cette méthode constitue la frontière entre le module Incident
   * et le cycle historique des communications Population.
   */
  /**
   * Résout le contexte nécessaire à la consultation de
   * l'historique Population d'un incident.
   *
   * Contrairement aux opérations de diffusion, la lecture
   * historique ne dépend pas de l'état opérationnel actuel
   * de Sentinelle Population.
   *
   * Un programme suspendu, archivé ou ultérieurement
   * désactivé conserve donc son historique consultable.
   */
  private async getPopulationAlertHistoricalContextForIncident(
    buildingId: string,
    incidentEventId: string,
  ) {
    const profile =
      await this.prisma.rueFacilityProfile.findUnique({
        where: {
          buildingId,
        },
        include: {
          populationProgram: true,
        },
      });

    if (!profile) {
      throw new NotFoundException(
        'Profil RUE introuvable pour ce bâtiment',
      );
    }

    const program = profile.populationProgram;

    if (!program) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    const building =
      await this.prisma.building.findUnique({
        where: {
          id: buildingId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      });

    if (!building) {
      throw new NotFoundException(
        'Bâtiment introuvable',
      );
    }

    const incident =
      await this.prisma.incidentEvent.findFirst({
        where: {
          id: incidentEventId,
          buildingId: building.id,
          organizationId: building.organizationId,
        },
        select: {
          id: true,
          buildingId: true,
          organizationId: true,
        },
      });

    if (!incident) {
      throw new NotFoundException(
        'Incident introuvable pour ce bâtiment',
      );
    }

    return {
      profile,
      program,
      incident,
    };
  }

  private async getPopulationAlertContextForIncident(
    buildingId: string,
    incidentEventId: string,
  ) {
    const profile =
      await this.assertPopulationOperational(
        buildingId,
      );

    const program = profile.populationProgram;

    if (!program) {
      throw new BadRequestException(
        'Le programme Sentinelle Population n’est pas actif',
      );
    }

    const building =
      await this.prisma.building.findUnique({
        where: {
          id: buildingId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      });

    if (!building) {
      throw new NotFoundException(
        'Bâtiment introuvable',
      );
    }

    const incident =
      await this.prisma.incidentEvent.findFirst({
        where: {
          id: incidentEventId,
          buildingId,
          organizationId:
            building.organizationId,
        },
        select: {
          id: true,
          buildingId: true,
          organizationId: true,
        },
      });

    if (!incident) {
      throw new NotFoundException(
        'Incident introuvable pour ce bâtiment',
      );
    }

    return {
      profile,
      program,
      incident,
    };
  }

  /**
   * Crée une nouvelle communication UPDATE ou ALL_CLEAR
   * dans le cycle d'un incident existant.
   *
   * Chaque communication est un PopulationAlert distinct.
   * Une communication historique n'est jamais réécrite.
   */
  async createIncidentFollowUpDraft(
    buildingId: string,
    incidentEventId: string,
    sourceAlertId: string,
    type: PopulationAlertType,
    content: {
      titleFR: string;
      titleEN?: string;
      messageFR: string;
      messageEN?: string;
      instructionFR?: string;
      instructionEN?: string;
    },
    actor: {
      type: string;
      id: string;
    },
  ) {
    if (
      type !== PopulationAlertType.UPDATE &&
      type !== PopulationAlertType.ALL_CLEAR
    ) {
      throw new BadRequestException(
        'Le type de suivi doit être UPDATE ou ALL_CLEAR',
      );
    }

        const titleFR = content.titleFR?.trim();
    const messageFR = content.messageFR?.trim();

    if (!titleFR) {
      throw new BadRequestException(
        'Le titre français est obligatoire',
      );
    }

    if (!messageFR) {
      throw new BadRequestException(
        'Le message français est obligatoire',
      );
    }

    const {
      program,
      incident,
    } =
      await this.getPopulationAlertContextForIncident(
        buildingId,
        incidentEventId,
      );

    const sourceAlert =
      await this.prisma.populationAlert.findFirst({
        where: {
          id: sourceAlertId,
          programId: program.id,
          incidentEventId,
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });

    if (!sourceAlert) {
      throw new NotFoundException(
        'Alerte source introuvable pour cet incident',
      );
    }

    if (
      sourceAlert.status !==
        PopulationAlertStatus.ACTIVE &&
      sourceAlert.status !==
        PopulationAlertStatus.ENDED
    ) {
      throw new BadRequestException(
        'Le suivi doit être créé à partir d’une alerte déjà diffusée',
      );
    }

    if (!sourceAlert.emergencyScenarioId) {
      throw new BadRequestException(
        'L’alerte source n’est liée à aucun scénario RUE',
      );
    }

    /*
     * Dès qu'un ALL_CLEAR non annulé existe pour l'incident,
     * aucun second ALL_CLEAR ni nouvel UPDATE ne peut être créé.
     *
     * Cette vérification protège le workflow normal.
     * L'index unique partiel PostgreSQL protège en complément
     * contre les créations ALL_CLEAR concurrentes.
     */
    const existingAllClear =
      await this.prisma.populationAlert.findFirst({
        where: {
          programId: program.id,
          incidentEventId,
          type: PopulationAlertType.ALL_CLEAR,
          status: {
            not: PopulationAlertStatus.CANCELLED,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (
      type === PopulationAlertType.ALL_CLEAR &&
      existingAllClear
    ) {
      throw new BadRequestException(
        'Un ALL_CLEAR existe déjà pour cet incident',
      );
    }

    if (
  type === PopulationAlertType.UPDATE &&
  existingAllClear
) {
  throw new BadRequestException(
    'Une mise à jour ne peut plus être créée dès qu’un ALL_CLEAR existe pour cet incident',
  );
}

    /*
     * Le ciblage est recalculé au moment du nouveau message.
     * Le nouvel UPDATE / ALL_CLEAR possède donc son propre
     * snapshot historique de population et de zones.
     */
    const targeting =
      await this.calculateScenarioPopulationTargeting(
        buildingId,
        sourceAlert.emergencyScenarioId,
      );

    const createdAt = new Date();

    const contextSnapshot = {
      snapshotVersion: 1,

      building: {
        id: targeting.building.id,
        name: targeting.building.name,
        address: targeting.building.address,
        city: targeting.building.city,
        province: targeting.building.province,
        latitude: targeting.building.latitude,
        longitude: targeting.building.longitude,
      },

      scenario: {
        id: targeting.scenario.id,
        nameFR: targeting.scenario.nameFR,
        nameEN: targeting.scenario.nameEN,
      },

      population: targeting.population,

      targeting: {
        zoneCount: targeting.zones.length,
        calculatedAt: createdAt.toISOString(),
      },

      communication: {
        incidentEventId,
        sourceAlertId: sourceAlert.id,
        type,
      },
    };

    return this.prisma.$transaction(async (tx) => {
      let alert;

      try {
        alert =
          await tx.populationAlert.create({
            data: {
              programId: program.id,
              incidentEventId,
              emergencyScenarioId:
                targeting.scenario.id,

              type,
              status:
                PopulationAlertStatus.DRAFT,

              titleFR,
              titleEN:
                content.titleEN?.trim() || null,

              messageFR,
              messageEN:
                content.messageEN?.trim() || null,

              instructionFR:
                content.instructionFR?.trim() || null,

              instructionEN:
                content.instructionEN?.trim() || null,

              createdByType: actor.type as any,
              createdById: actor.id,

              contextSnapshot,
            },
          });
      } catch (error) {
        /*
         * La vérification applicative effectuée avant la
         * transaction couvre le fonctionnement normal.
         *
         * L'index unique partiel PostgreSQL constitue la
         * dernière barrière contre deux créations ALL_CLEAR
         * réellement concurrentes.
         */
        if (
          type === PopulationAlertType.ALL_CLEAR &&
          error instanceof
            Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException(
            'Un ALL_CLEAR existe déjà pour cet incident',
          );
        }

        throw error;
      }

      if (targeting.zones.length > 0) {
        await tx.populationAlertZone.createMany({
          data: targeting.zones.map(
            (zone) => ({
              alertId: alert.id,
              impactZoneId: zone.id,

              zoneCodeSnapshot: zone.code,
              zoneNameFRSnapshot:
                zone.nameFR,
              zoneNameENSnapshot:
                zone.nameEN,

              geometrySnapshot:
                zone.geometry === null
                  ? Prisma.JsonNull
                  : (zone.geometry as Prisma.InputJsonValue),

              maxDistanceKmSnapshot:
                zone.maxDistanceKm,

              protectiveActionSnapshot:
                zone.protectiveAction,

              instructionFRSnapshot:
                zone.instructionFR,

              instructionENSnapshot:
                zone.instructionEN,

              targetedSubscriberCount:
                zone.targetCount,
            }),
          ),
        });
      }

      return tx.populationAlert.findUnique({
        where: {
          id: alert.id,
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });
    });
  }

  /**
   * Clôture une communication Population déjà diffusée.
   *
   * END ne modifie jamais son contenu, ses zones, son roster
   * ou ses preuves de livraison.
   *
   * La clôture reste possible après suspension ou désactivation
   * du programme : elle termine un événement historique existant
   * et ne constitue pas une nouvelle opération de diffusion.
   */
  async endAlert(
    buildingId: string,
    alertId: string,
  ) {
    const { alert, program } =
      await this.getPopulationAlertHistoricalForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status === PopulationAlertStatus.ENDED) {
      return alert;
    }

    if (alert.status !== PopulationAlertStatus.ACTIVE) {
      throw new BadRequestException(
        'Seule une alerte ACTIVE peut être clôturée',
      );
    }

    const endedAt = new Date();

    const ended =
      await this.prisma.populationAlert.updateMany({
        where: {
          id: alert.id,
          programId: program.id,
          status: PopulationAlertStatus.ACTIVE,
        },
        data: {
          status: PopulationAlertStatus.ENDED,
          endedAt,
        },
      });

    /*
     * Le compare-and-set peut perdre une course si une autre
     * requête vient de clôturer la même alerte.
     *
     * On relit alors l'état historique courant sans exiger que
     * le programme soit encore opérationnel.
     */
    if (ended.count !== 1) {
      const current =
        await this.getPopulationAlertHistoricalForBuilding(
          buildingId,
          alertId,
        );

      return current.alert;
    }

    const current =
      await this.getPopulationAlertHistoricalForBuilding(
        buildingId,
        alertId,
      );

    return current.alert;
  }

  /**
   * Annule une communication Population qui n'a pas encore
   * commencé sa diffusion.
   *
   * L'annulation est historique : l'alerte n'est jamais supprimée
   * et ses snapshots éventuels sont conservés.
   *
   * DRAFT / READY -> CANCELLED
   * CANCELLED     -> CANCELLED (idempotent)
   *
   * Dès que l'envoi a commencé, l'alerte ne peut plus être annulée.
   *
   * Comme pour END, l'annulation reste possible après suspension
   * ou désactivation du programme puisqu'elle ne constitue pas
   * une nouvelle opération de diffusion.
   */
  async cancelAlert(
    buildingId: string,
    alertId: string,
  ) {
    const { alert, program } =
      await this.getPopulationAlertHistoricalForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status === PopulationAlertStatus.CANCELLED) {
      return alert;
    }

    if (
      alert.status !== PopulationAlertStatus.DRAFT &&
      alert.status !== PopulationAlertStatus.READY
    ) {
      throw new BadRequestException(
        'Seule une alerte DRAFT ou READY peut être annulée',
      );
    }

    const cancelledAt = new Date();

    const cancelled =
      await this.prisma.populationAlert.updateMany({
        where: {
          id: alert.id,
          programId: program.id,
          status: {
            in: [
              PopulationAlertStatus.DRAFT,
              PopulationAlertStatus.READY,
            ],
          },
        },
        data: {
          status: PopulationAlertStatus.CANCELLED,
          cancelledAt,
        },
      });

    /*
     * Le compare-and-set protège contre deux annulations concurrentes
     * ou contre une transition d'état survenue entre la lecture
     * initiale et l'écriture.
     *
     * Dans tous les cas, on retourne l'état historique réellement
     * persisté sans exiger que le programme soit encore opérationnel.
     */
    if (cancelled.count !== 1) {
      const current =
        await this.getPopulationAlertHistoricalForBuilding(
          buildingId,
          alertId,
        );

      return current.alert;
    }

    const current =
      await this.getPopulationAlertHistoricalForBuilding(
        buildingId,
        alertId,
      );

    return current.alert;
  }

  /**
   * Modifie uniquement le contenu éditorial d'un brouillon.
   *
   * Une alerte READY ou plus avancée ne peut plus être
   * silencieusement modifiée.
   */
  async updateAlertDraft(
    buildingId: string,
    alertId: string,
    dto: UpdatePopulationAlertDraftDto,
  ) {
    const { alert } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status !== PopulationAlertStatus.DRAFT) {
      throw new BadRequestException(
        'Seule une alerte DRAFT peut être modifiée',
      );
    }

    const data: {
      type?: typeof dto.type;
      titleFR?: string;
      titleEN?: string | null;
      messageFR?: string;
      messageEN?: string | null;
      instructionFR?: string | null;
      instructionEN?: string | null;
    } = {};

    if (dto.type !== undefined) {
      /*
       * Dès qu'une communication appartient à un incident,
       * son rôle dans la chronologie devient immuable.
       *
       * Cela protège aussi bien l'EMERGENCY initial que
       * les UPDATE et le ALL_CLEAR.
       */
      if (
        alert.incidentEventId &&
        dto.type !== alert.type
      ) {
        throw new BadRequestException(
          'Le type d’une communication rattachée à un incident ne peut pas être modifié',
        );
      }

      data.type = dto.type;
    }

    if (dto.titleFR !== undefined) {
      const value = dto.titleFR.trim();

      if (!value) {
        throw new BadRequestException(
          'Le titre français ne peut pas être vide',
        );
      }

      data.titleFR = value;
    }

    if (dto.titleEN !== undefined) {
      data.titleEN = dto.titleEN.trim() || null;
    }

    if (dto.messageFR !== undefined) {
      const value = dto.messageFR.trim();

      if (!value) {
        throw new BadRequestException(
          'Le message français ne peut pas être vide',
        );
      }

      data.messageFR = value;
    }

    if (dto.messageEN !== undefined) {
      data.messageEN = dto.messageEN.trim() || null;
    }

    if (dto.instructionFR !== undefined) {
      data.instructionFR =
        dto.instructionFR.trim() || null;
    }

    if (dto.instructionEN !== undefined) {
      data.instructionEN =
        dto.instructionEN.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return alert;
    }

    return this.prisma.populationAlert.update({
      where: {
        id: alert.id,
      },
      data,
      include: {
        zones: {
          orderBy: {
            zoneCodeSnapshot: 'asc',
          },
        },
      },
    });
  }

  /**
   * Recalcule le ciblage d'un brouillon à partir de l'état
   * courant du scénario, des zones et des abonnés.
   *
   * Les anciens snapshots de zones sont remplacés atomiquement.
   */
  async refreshAlertDraftTargeting(
    buildingId: string,
    alertId: string,
  ) {
    const { alert } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status !== PopulationAlertStatus.DRAFT) {
      throw new BadRequestException(
        'Le ciblage ne peut être recalculé que pour une alerte DRAFT',
      );
    }

    if (!alert.emergencyScenarioId) {
      throw new BadRequestException(
        'Cette alerte n’est liée à aucun scénario RUE',
      );
    }

    const targeting =
      await this.calculateScenarioPopulationTargeting(
        buildingId,
        alert.emergencyScenarioId,
      );

    const calculatedAt = new Date();

    const contextSnapshot = {
      snapshotVersion: 1,

      building: {
        id: targeting.building.id,
        name: targeting.building.name,
        address: targeting.building.address,
        city: targeting.building.city,
        province: targeting.building.province,
        latitude: targeting.building.latitude,
        longitude: targeting.building.longitude,
      },

      scenario: {
        id: targeting.scenario.id,
        nameFR: targeting.scenario.nameFR,
        nameEN: targeting.scenario.nameEN,
      },

      population: targeting.population,

      targeting: {
        zoneCount: targeting.zones.length,
        calculatedAt: calculatedAt.toISOString(),
      },
    };

    return this.prisma.$transaction(async (tx) => {
      await tx.populationAlertZone.deleteMany({
        where: {
          alertId: alert.id,
        },
      });

      if (targeting.zones.length > 0) {
        await tx.populationAlertZone.createMany({
          data: targeting.zones.map((zone) => ({
            alertId: alert.id,
            impactZoneId: zone.id,

            zoneCodeSnapshot: zone.code,
            zoneNameFRSnapshot: zone.nameFR,
            zoneNameENSnapshot: zone.nameEN,

            geometrySnapshot:
              zone.geometry === null
                ? Prisma.JsonNull
                : (zone.geometry as Prisma.InputJsonValue),

            maxDistanceKmSnapshot:
              zone.maxDistanceKm,

            protectiveActionSnapshot:
              zone.protectiveAction,

            instructionFRSnapshot:
              zone.instructionFR,

            instructionENSnapshot:
              zone.instructionEN,

            targetedSubscriberCount:
              zone.targetCount,
          })),
        });
      }

      await tx.populationAlert.update({
        where: {
          id: alert.id,
        },
        data: {
          contextSnapshot,
        },
      });

      return tx.populationAlert.findUnique({
        where: {
          id: alert.id,
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });
    });
  }

  /**
   * Fige un brouillon comme READY.
   *
   * READY signifie que le contenu et le ciblage ont été
   * recalculés et sont prêts pour le workflow humain
   * d'approbation du Lot 7.
   *
   * READY ne signifie pas APPROUVÉ.
   */
  async markAlertDraftReady(
    buildingId: string,
    alertId: string,
  ) {
    const { alert } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status === PopulationAlertStatus.READY) {
      return alert;
    }

    if (alert.status !== PopulationAlertStatus.DRAFT) {
      throw new BadRequestException(
        'Seule une alerte DRAFT peut passer à READY',
      );
    }

    if (!alert.titleFR?.trim()) {
      throw new BadRequestException(
        'Le titre français est requis',
      );
    }

    if (!alert.messageFR?.trim()) {
      throw new BadRequestException(
        'Le message français est requis',
      );
    }

    if (!alert.emergencyScenarioId) {
      throw new BadRequestException(
        'Un scénario RUE est requis',
      );
    }

    /*
     * Le ciblage est recalculé immédiatement avant READY.
     * On ne se contente jamais du snapshot potentiellement
     * ancien créé avec le brouillon.
     */
    await this.refreshAlertDraftTargeting(
      buildingId,
      alert.id,
    );

    return this.prisma.populationAlert.update({
      where: {
        id: alert.id,
      },
      data: {
        status: PopulationAlertStatus.READY,
      },
      include: {
        zones: {
          orderBy: {
            zoneCodeSnapshot: 'asc',
          },
        },
      },
    });
  }

  /**
   * Approuve humainement une alerte READY.
   *
   * L'approbation ne déclenche aucune diffusion et ne crée
   * aucune PopulationAlertDelivery.
   *
   * L'identité de l'approbateur est fournie par la couche
   * authentifiée du portail client, jamais par le DTO public.
   */
  async approveAlert(
    buildingId: string,
    alertId: string,
    actor: {
      type: string;
      id: string;
    },
  ) {
    const { alert } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status !== PopulationAlertStatus.READY) {
      throw new BadRequestException(
        'Seule une alerte READY peut être approuvée',
      );
    }

    /*
     * Approbation déjà enregistrée :
     * comportement idempotent.
     *
     * On ne remplace jamais silencieusement l'identité
     * de la personne ayant approuvé l'alerte.
     */
    if (alert.approvedAt) {
      return alert;
    }

    const approvedAt = new Date();

    return this.prisma.populationAlert.update({
      where: {
        id: alert.id,
      },
      data: {
        approvedByType: actor.type as any,
        approvedById: actor.id,
        approvedAt,
      },
      include: {
        zones: {
          orderBy: {
            zoneCodeSnapshot: 'asc',
          },
        },
      },
    });
  }

  /**
   * Fige les destinataires d'une alerte Population approuvée.
   *
   * Cette opération crée uniquement des PopulationAlertDelivery
   * QUEUED. Aucun fournisseur SMS/email n'est appelé ici.
   *
   * Le ciblage géographique repose exclusivement sur les snapshots
   * approuvés de l'alerte, jamais sur la configuration RUE courante.
   */
  async freezeAlertRecipients(
  buildingId: string,
  alertId: string,
) {
  const { alert, program } =
    await this.getPopulationAlertForBuilding(
      buildingId,
      alertId,
    );

  if (alert.status !== PopulationAlertStatus.READY) {
    throw new BadRequestException(
      'Seule une alerte READY peut figer ses destinataires',
    );
  }

  if (
    !alert.approvedAt ||
    !alert.approvedByType ||
    !alert.approvedById
  ) {
    throw new BadRequestException(
      'L’alerte doit être approuvée avant de figer les destinataires',
    );
  }

  /*
   * Un freeze déjà effectué est immuable.
   *
   * On ne relit ni les abonnés, ni leur localisation,
   * ni les zones pour recalculer le roster.
   */
  if (alert.recipientsFrozenAt) {
    const frozenDeliveries =
      await this.prisma.populationAlertDelivery.findMany({
        where: {
          alertId: alert.id,
        },
        select: {
          id: true,
          channel: true,
          status: true,
          language: true,
          queuedAt: true,
          sentAt: true,
          deliveredAt: true,
          failedAt: true,
        },
        orderBy: [
          { channel: 'asc' },
          { queuedAt: 'asc' },
        ],
      });

    const frozenSubscriberCount =
      await this.prisma.populationAlertDelivery.findMany({
        where: {
          alertId: alert.id,
          subscriberId: {
            not: null,
          },
        },
        select: {
          subscriberId: true,
        },
        distinct: ['subscriberId'],
      });

    return {
      alertId: alert.id,
      status: alert.status,
      approvedAt: alert.approvedAt,
      recipientsFrozenAt:
        alert.recipientsFrozenAt,
      targeting: {
        subscriberCount:
          frozenSubscriberCount.length,
        deliveryCount:
          frozenDeliveries.length,
        smsDeliveryCount:
          frozenDeliveries.filter(
            delivery =>
              delivery.channel ===
              PopulationAlertChannel.SMS,
          ).length,
        emailDeliveryCount:
          frozenDeliveries.filter(
            delivery =>
              delivery.channel ===
              PopulationAlertChannel.EMAIL,
          ).length,
      },
      deliveries: frozenDeliveries,
    };
  }

  const subscribers =
    await this.prisma.populationSubscriber.findMany({
      where: {
        programId: program.id,
        status:
          PopulationSubscriberStatus.ACTIVE,
      },
      select: {
        id: true,
        preferredLanguage: true,
        phone: true,
        email: true,
        smsEnabled: true,
        emailEnabled: true,
        latitude: true,
        longitude: true,
      },
    });

  const contextSnapshot =
    alert.contextSnapshot &&
    typeof alert.contextSnapshot === 'object' &&
    !Array.isArray(alert.contextSnapshot)
      ? (alert.contextSnapshot as Record<
          string,
          any
        >)
      : null;

  const buildingSnapshot =
    contextSnapshot?.building &&
    typeof contextSnapshot.building === 'object'
      ? contextSnapshot.building
      : null;

  const referenceLatitude =
    typeof buildingSnapshot?.latitude === 'number'
      ? buildingSnapshot.latitude
      : null;

  const referenceLongitude =
    typeof buildingSnapshot?.longitude === 'number'
      ? buildingSnapshot.longitude
      : null;

  const targetedSubscriberIds =
    new Set<string>();

  for (const subscriber of subscribers) {
    if (
      subscriber.latitude === null ||
      subscriber.longitude === null ||
      !Number.isFinite(subscriber.latitude) ||
      !Number.isFinite(subscriber.longitude)
    ) {
      continue;
    }

    const isTargeted = alert.zones.some(
      zone =>
        this.populationGeospatialService
          .isPointInsideImpactZone({
            latitude: subscriber.latitude!,
            longitude: subscriber.longitude!,
            geometry: zone.geometrySnapshot,
            maxDistanceKm:
              zone.maxDistanceKmSnapshot,
            referenceLatitude,
            referenceLongitude,
          }),
    );

    if (isTargeted) {
      targetedSubscriberIds.add(
        subscriber.id,
      );
    }
  }

  const targetedSubscribers =
    subscribers.filter(subscriber =>
      targetedSubscriberIds.has(
        subscriber.id,
      ),
    );

  const deliveries: Array<{
    idempotencyKey: string;
    alertId: string;
    subscriberId: string;
    channel: PopulationAlertChannel;
    status: PopulationDeliveryStatus;
    language: PopulationPreferredLanguage;
    messageSnapshot: string;
    destinationSnapshot: string;
  }> = [];

  for (const subscriber of targetedSubscribers) {
    const language =
      subscriber.preferredLanguage ===
        PopulationPreferredLanguage.EN &&
      alert.messageEN?.trim()
        ? PopulationPreferredLanguage.EN
        : PopulationPreferredLanguage.FR;

    const messageSnapshot =
      language === PopulationPreferredLanguage.EN
        ? alert.messageEN!.trim()
        : alert.messageFR.trim();

    if (this.canReceiveSms(program, subscriber)) {
      deliveries.push({
        idempotencyKey:
          `${alert.id}:${subscriber.id}:SMS`,
        alertId: alert.id,
        subscriberId: subscriber.id,
        channel: PopulationAlertChannel.SMS,
        status:
          PopulationDeliveryStatus.QUEUED,
        language,
        messageSnapshot,
        destinationSnapshot:
          subscriber.phone!,
      });
    }

    if (this.canReceiveEmail(program, subscriber)) {
      deliveries.push({
        idempotencyKey:
          `${alert.id}:${subscriber.id}:EMAIL`,
        alertId: alert.id,
        subscriberId: subscriber.id,
        channel:
          PopulationAlertChannel.EMAIL,
        status:
          PopulationDeliveryStatus.QUEUED,
        language,
        messageSnapshot,
        destinationSnapshot:
          subscriber.email!,
      });
    }
  }

  for (const channel of new Set(deliveries.map(delivery => delivery.channel))) {
    this.readiness.assertAlertChannelReady(channel);
  }

  const recipientsFrozenAt = new Date();

  /*
   * Le claim du freeze et la matérialisation du roster
   * forment une seule unité atomique.
   *
   * Si createMany échoue, recipientsFrozenAt est rollbacké.
   */
  const freezeResult =
    await this.prisma.$transaction(async tx => {
      const freezeClaim =
        await tx.populationAlert.updateMany({
          where: {
            id: alert.id,
            programId: program.id,
            status: PopulationAlertStatus.READY,
            recipientsFrozenAt: null,
          },
          data: {
            recipientsFrozenAt,
          },
        });

      /*
       * Un autre processus a déjà figé cette alerte.
       * Cette transaction ne doit alors rien créer.
       */
      if (freezeClaim.count !== 1) {
        return {
          claimed: false as const,
        };
      }

      if (deliveries.length > 0) {
        await tx.populationAlertDelivery.createMany({
          data: deliveries,
          skipDuplicates: true,
        });
      }

      return {
        claimed: true as const,
      };
    });

  /*
   * Si nous avons perdu la course, nous relisons uniquement
   * le roster déjà matérialisé par le processus gagnant.
   */
  if (!freezeResult.claimed) {
    const currentAlert =
      await this.prisma.populationAlert.findFirst({
        where: {
          id: alert.id,
          programId: program.id,
        },
        select: {
          recipientsFrozenAt: true,
        },
      });

    if (!currentAlert?.recipientsFrozenAt) {
      throw new Error(
        'Impossible de confirmer le freeze des destinataires',
      );
    }

    const frozenDeliveries =
      await this.prisma.populationAlertDelivery.findMany({
        where: {
          alertId: alert.id,
        },
        select: {
          id: true,
          channel: true,
          status: true,
          language: true,
          queuedAt: true,
          sentAt: true,
          deliveredAt: true,
          failedAt: true,
        },
        orderBy: [
          { channel: 'asc' },
          { queuedAt: 'asc' },
        ],
      });

    const frozenSubscriberCount =
      await this.prisma.populationAlertDelivery.findMany({
        where: {
          alertId: alert.id,
          subscriberId: {
            not: null,
          },
        },
        select: {
          subscriberId: true,
        },
        distinct: ['subscriberId'],
      });

    return {
      alertId: alert.id,
      status: alert.status,
      approvedAt: alert.approvedAt,
      recipientsFrozenAt:
        currentAlert.recipientsFrozenAt,
      targeting: {
        subscriberCount:
          frozenSubscriberCount.length,
        deliveryCount:
          frozenDeliveries.length,
        smsDeliveryCount:
          frozenDeliveries.filter(
            delivery =>
              delivery.channel ===
              PopulationAlertChannel.SMS,
          ).length,
        emailDeliveryCount:
          frozenDeliveries.filter(
            delivery =>
              delivery.channel ===
              PopulationAlertChannel.EMAIL,
          ).length,
      },
      deliveries: frozenDeliveries,
    };
  }

  const frozenDeliveries =
    await this.prisma.populationAlertDelivery.findMany({
      where: {
        alertId: alert.id,
      },
      select: {
        id: true,
        channel: true,
        status: true,
        language: true,
        queuedAt: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
      },
      orderBy: [
        { channel: 'asc' },
        { queuedAt: 'asc' },
      ],
    });

  return {
    alertId: alert.id,
    status: alert.status,
    approvedAt: alert.approvedAt,
    recipientsFrozenAt,
    targeting: {
      subscriberCount:
        targetedSubscriberIds.size,
      deliveryCount:
        frozenDeliveries.length,
      smsDeliveryCount:
        frozenDeliveries.filter(
          delivery =>
            delivery.channel ===
            PopulationAlertChannel.SMS,
        ).length,
      emailDeliveryCount:
        frozenDeliveries.filter(
          delivery =>
            delivery.channel ===
            PopulationAlertChannel.EMAIL,
        ).length,
    },
    deliveries: frozenDeliveries,
  };
}

  /**
   * Orchestre l'envoi initial d'une alerte Population.
   *
   * Conditions :
   * - l'alerte doit être READY;
   * - elle doit avoir été approuvée humainement;
   * - ses destinataires doivent avoir été figés;
   * - le roster figé doit contenir au moins une livraison.
   *
   * Un seul orchestrateur concurrent peut effectuer
   * READY -> SENDING.
   */
  async sendAlert(
    buildingId: string,
    alertId: string,
  ) {
    const { alert, program } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    /*
     * Une alerte déjà prise en charge ne doit jamais
     * déclencher une seconde diffusion.
     */
    if (alert.status !== PopulationAlertStatus.READY) {
      if (
        alert.status === PopulationAlertStatus.SENDING ||
        alert.status === PopulationAlertStatus.ACTIVE ||
        alert.status === PopulationAlertStatus.FAILED
      ) {
        return this.getAlert(
          buildingId,
          alertId,
        );
      }

      throw new BadRequestException(
        'Seule une alerte READY peut être envoyée',
      );
    }

    if (
      !alert.approvedAt ||
      !alert.approvedByType ||
      !alert.approvedById
    ) {
      throw new BadRequestException(
        'L’alerte doit être approuvée avant son envoi',
      );
    }

    if (!alert.recipientsFrozenAt) {
      throw new BadRequestException(
        'Les destinataires doivent être figés avant l’envoi',
      );
    }

    const deliveryCount =
      await this.prisma.populationAlertDelivery.count({
        where: {
          alertId: alert.id,
        },
      });

    if (deliveryCount === 0) {
      throw new BadRequestException(
        'Aucun destinataire figé pour cette alerte',
      );
    }

    const frozenChannels =
      await this.prisma.populationAlertDelivery.findMany({
        where: {
          alertId: alert.id,
        },
        select: { channel: true },
        distinct: ['channel'],
      });

    for (const delivery of frozenChannels) {
      this.readiness.assertAlertChannelReady(delivery.channel);
    }

    const sendingAt = new Date();

    /*
     * Compare-and-set atomique au niveau de l'alerte.
     *
     * Deux workers peuvent arriver ici simultanément,
     * mais un seul peut effectuer READY -> SENDING.
     */
    const alertClaim =
      await this.prisma.populationAlert.updateMany({
        where: {
          id: alert.id,
          programId: program.id,
          status: PopulationAlertStatus.READY,
          recipientsFrozenAt: {
            not: null,
          },
          approvedAt: {
            not: null,
          },
        },
        data: {
          status: PopulationAlertStatus.SENDING,
          sendingAt,
        },
      });

    if (alertClaim.count !== 1) {
      return this.getAlert(
        buildingId,
        alertId,
      );
    }

    /*
     * Après le claim de l'alerte, seules les deliveries
     * encore QUEUED sont candidates à la diffusion.
     */
    const queuedDeliveries =
      await this.prisma.populationAlertDelivery.findMany({
        where: {
          alertId: alert.id,
          status: PopulationDeliveryStatus.QUEUED,
        },
        select: {
          id: true,
        },
        orderBy: {
          queuedAt: 'asc',
        },
      });

    /*
     * Une anomalie sur une livraison ne doit pas empêcher
     * les autres destinataires d'être traités.
     */
    for (const delivery of queuedDeliveries) {
      try {
        const claim =
          await this.claimAlertDelivery(
            buildingId,
            alert.id,
            delivery.id,
          );

        if (!claim.claimed) {
          continue;
        }

        await this.dispatchAlertDelivery(
          buildingId,
          alert.id,
          delivery.id,
        );
      } catch {
        /*
         * dispatchAlertDelivery() matérialise déjà les erreurs
         * fournisseur en FAILED.
         *
         * Les anomalies d'une livraison sont isolées afin
         * de poursuivre le traitement du roster.
         */
      }
    }

    /*
     * Le résultat global est déterminé depuis l'état
     * réellement enregistré en base.
     */
    const deliverySummary =
      await this.prisma.populationAlertDelivery.groupBy({
        by: ['status'],
        where: {
          alertId: alert.id,
        },
        _count: {
          _all: true,
        },
      });

    const countByStatus = new Map<
      PopulationDeliveryStatus,
      number
    >();

    for (const row of deliverySummary) {
      countByStatus.set(
        row.status,
        row._count._all,
      );
    }

    const successfulCount =
      (countByStatus.get(
        PopulationDeliveryStatus.SENT,
      ) ?? 0) +
      (countByStatus.get(
        PopulationDeliveryStatus.DELIVERED,
      ) ?? 0);

    const failedCount =
      countByStatus.get(
        PopulationDeliveryStatus.FAILED,
      ) ?? 0;

    const pendingCount =
      (countByStatus.get(
        PopulationDeliveryStatus.QUEUED,
      ) ?? 0) +
      (countByStatus.get(
        PopulationDeliveryStatus.SENDING,
      ) ?? 0);

    /*
     * ACTIVE signifie qu'au moins une diffusion initiale
     * a été acceptée par le fournisseur.
     *
     * DELIVERED restera réservé à une confirmation
     * fournisseur ultérieure.
     */
    if (successfulCount > 0) {
      await this.prisma.populationAlert.updateMany({
        where: {
          id: alert.id,
          programId: program.id,
          status: PopulationAlertStatus.SENDING,
        },
        data: {
          status: PopulationAlertStatus.ACTIVE,
          activatedAt: new Date(),
        },
      });
    } else if (
      pendingCount === 0 &&
      failedCount > 0
    ) {
      await this.prisma.populationAlert.updateMany({
        where: {
          id: alert.id,
          programId: program.id,
          status: PopulationAlertStatus.SENDING,
        },
        data: {
          status: PopulationAlertStatus.FAILED,
        },
      });
    }

    return this.getAlert(
      buildingId,
      alertId,
    );
  }

  /**
   * Tente de réserver atomiquement une livraison QUEUED
   * pour un worker de diffusion.
   *
   * Un seul appel concurrent peut effectuer la transition
   * QUEUED -> SENDING.
   *
   * Aucun fournisseur SMS/email n'est appelé ici.
   */
  async claimAlertDelivery(
    buildingId: string,
    alertId: string,
    deliveryId: string,
  ) {
    const { alert } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status !== PopulationAlertStatus.SENDING) {
      throw new BadRequestException(
        'Les livraisons ne peuvent être réclamées que pour une alerte SENDING',
      );
    }

    if (
      !alert.approvedAt ||
      !alert.approvedByType ||
      !alert.approvedById
    ) {
      throw new BadRequestException(
        'L’alerte doit être approuvée avant toute diffusion',
      );
    }

    /*
     * Sécurité importante :
     *
     * updateMany produit ici un compare-and-set atomique.
     *
     * Seul un delivery :
     * - appartenant à cette alerte
     * - encore QUEUED
     *
     * peut passer à SENDING.
     */
    const claim =
      await this.prisma.populationAlertDelivery.updateMany({
        where: {
          id: deliveryId,
          alertId: alert.id,
          status: PopulationDeliveryStatus.QUEUED,
        },
        data: {
          status: PopulationDeliveryStatus.SENDING,
        },
      });

    if (claim.count !== 1) {
      return {
        claimed: false,
        delivery: null,
      };
    }

    const delivery =
      await this.prisma.populationAlertDelivery.findFirst({
        where: {
          id: deliveryId,
          alertId: alert.id,
          status: PopulationDeliveryStatus.SENDING,
        },
        select: {
          id: true,
          channel: true,
          status: true,
          language: true,
          messageSnapshot: true,
          destinationSnapshot: true,
          queuedAt: true,
        },
      });

    if (!delivery) {
      throw new Error(
        'La livraison réclamée est introuvable après le claim atomique',
      );
    }

    /*
     * Cette méthode est interne au moteur de diffusion.
     * Contrairement à freezeAlertRecipients(), elle retourne
     * destinationSnapshot parce que 7C.2 devra réellement
     * remettre cette destination au fournisseur.
     *
     * Elle ne doit donc pas être exposée telle quelle dans
     * une réponse publique.
     */
    return {
      claimed: true,
      delivery,
    };
  }

  /**
   * Exécute une livraison déjà réclamée par le moteur de diffusion.
   *
   * IMPORTANT :
   * - seul SENDING peut provoquer un appel fournisseur;
   * - QUEUED doit d'abord passer par claimAlertDelivery();
   * - un succès fournisseur devient SENT;
   * - une erreur fournisseur devient FAILED.
   */
  async dispatchAlertDelivery(
    buildingId: string,
    alertId: string,
    deliveryId: string,
  ) {
    const { alert } =
      await this.getPopulationAlertForBuilding(
        buildingId,
        alertId,
      );

    if (alert.status !== PopulationAlertStatus.SENDING) {
      throw new BadRequestException(
        'Les livraisons ne peuvent être diffusées que pour une alerte SENDING',
      );
    }

    if (
      !alert.approvedAt ||
      !alert.approvedByType ||
      !alert.approvedById
    ) {
      throw new BadRequestException(
        'L’alerte doit être approuvée avant toute diffusion',
      );
    }

    const delivery =
      await this.prisma.populationAlertDelivery.findFirst({
        where: {
          id: deliveryId,
          alertId: alert.id,
        },
        select: {
          id: true,
          channel: true,
          status: true,
          language: true,
          messageSnapshot: true,
          destinationSnapshot: true,
        },
      });

    if (!delivery) {
      throw new NotFoundException(
        'Livraison Population introuvable',
      );
    }

    /*
     * C'est la barrière anti-double-envoi.
     *
     * dispatchAlertDelivery() n'effectue jamais elle-même
     * QUEUED -> SENDING.
     */
    if (
      delivery.status !==
      PopulationDeliveryStatus.SENDING
    ) {
      throw new BadRequestException(
        'La livraison doit être réclamée avant sa diffusion',
      );
    }

    if (!delivery.destinationSnapshot) {
      const failedAt = new Date();

      await this.prisma.populationAlertDelivery.updateMany({
        where: {
          id: delivery.id,
          alertId: alert.id,
          status: PopulationDeliveryStatus.SENDING,
        },
        data: {
          status: PopulationDeliveryStatus.FAILED,
          failedAt,
          errorCode: 'DESTINATION_MISSING',
          errorMessage:
            'Destination de communication absente',
        },
      });

      return {
        deliveryId: delivery.id,
        status: PopulationDeliveryStatus.FAILED,
        provider: null,
        providerMessageId: null,
        sentAt: null,
        failedAt,
        errorCode: 'DESTINATION_MISSING',
      };
    }

    try {
      let providerResult;

      if (
        delivery.channel ===
        PopulationAlertChannel.SMS
      ) {
        providerResult =
          await this.populationDeliveryService.sendSms(
            delivery.destinationSnapshot,
            delivery.messageSnapshot,
          );
      } else if (
        delivery.channel ===
        PopulationAlertChannel.EMAIL
      ) {
        const subject =
          delivery.language ===
            PopulationPreferredLanguage.EN &&
          alert.titleEN?.trim()
            ? alert.titleEN.trim()
            : alert.titleFR.trim();

        /*
         * messageSnapshot contient le contenu approuvé
         * figé au moment du freeze.
         *
         * Le HTML est volontairement minimal pour le moment :
         * aucun contenu métier supplémentaire n'est inventé
         * au moment de l'envoi.
         */
        const escapedMessage =
          delivery.messageSnapshot
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\r?\n/g, '<br>');

        providerResult =
          await this.populationDeliveryService.sendEmail({
            destination:
              delivery.destinationSnapshot,
            subject,
            html: `<p>${escapedMessage}</p>`,
          });
      } else {
        throw new PopulationProviderError(
          'UNSUPPORTED_CHANNEL',
          'Canal de communication non pris en charge',
        );
      }

      const sentAt = new Date();

      /*
       * Compare-and-set également au retour fournisseur.
       * On ne doit pas écraser un état qui aurait changé.
       */
      const updated =
        await this.prisma.populationAlertDelivery.updateMany({
          where: {
            id: delivery.id,
            alertId: alert.id,
            status: PopulationDeliveryStatus.SENDING,
          },
          data: {
            status: PopulationDeliveryStatus.SENT,
            provider: providerResult.provider,
            providerMessageId:
              providerResult.providerMessageId,
            sentAt,
            failedAt: null,
            errorCode: null,
            errorMessage: null,
          },
        });

      if (updated.count !== 1) {
        throw new Error(
          'État de livraison modifié pendant la diffusion',
        );
      }

      return {
        deliveryId: delivery.id,
        status: PopulationDeliveryStatus.SENT,
        provider: providerResult.provider,
        providerMessageId:
          providerResult.providerMessageId,
        sentAt,
        failedAt: null,
        errorCode: null,
      };
    } catch (error) {
      /*
       * Une erreur fournisseur connue peut être conservée
       * sous forme contrôlée.
       *
       * Une erreur interne ne doit jamais injecter un objet,
       * une stack ou une destination dans errorMessage.
       */
      const providerError =
        error instanceof PopulationProviderError
          ? error
          : new PopulationProviderError(
              'DELIVERY_INTERNAL_ERROR',
              'Erreur interne lors de la diffusion',
            );

      const failedAt = new Date();

      const failed =
        await this.prisma.populationAlertDelivery.updateMany({
          where: {
            id: delivery.id,
            alertId: alert.id,
            status: PopulationDeliveryStatus.SENDING,
          },
          data: {
            status: PopulationDeliveryStatus.FAILED,
            failedAt,
            errorCode: providerError.code,
            errorMessage:
              providerError.message.slice(0, 500),
          },
        });

      /*
       * Si le succès fournisseur a déjà été enregistré SENT
       * mais qu'une erreur interne est survenue ensuite,
       * le compare-and-set empêche SENT -> FAILED.
       */
      if (failed.count !== 1) {
        throw error;
      }

      return {
        deliveryId: delivery.id,
        status: PopulationDeliveryStatus.FAILED,
        provider: null,
        providerMessageId: null,
        sentAt: null,
        failedAt,
        errorCode: providerError.code,
      };
    }
  }

  /**
   * Résout temporairement une adresse citoyenne sans persister l'adresse
   * ni les coordonnées. La confirmation sera traitée dans le lot suivant.
   */
  async resolveSubscriberLocation(
    publicSlug: string,
    subscriberId: string,
    dto: ResolvePopulationLocationDto,
  ) {
    this.readiness.assertAccessReady();
    this.readiness.assertLocationTokenReady();
    this.readiness.assertGeocodingReady();
    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: {
        id: true,
        rueFacilityProfile: {
          select: { buildingId: true },
        },
      },
    });

    if (!program) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    this.verifySubscriberAccessToken(
      dto.accessToken,
      subscriberId,
      program.id,
    );

    const operationalProfile = await this.assertPopulationOperational(
      program.rueFacilityProfile.buildingId,
    );
    if (operationalProfile.populationProgram?.id !== program.id) {
      throw new BadRequestException(
        'Le programme Sentinelle Population n’est pas actif',
      );
    }

    const subscriber = await this.prisma.populationSubscriber.findFirst({
      where: {
        id: subscriberId,
        programId: program.id,
        status: PopulationSubscriberStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!subscriber) {
      throw new BadRequestException('Accès citoyen invalide');
    }

    const locationTokenKey = this.getPopulationLocationTokenKey();
    let results: Awaited<ReturnType<GeocodingService['geocodeCandidates']>>;
    try {
      results = await this.geocodingService.geocodeCandidates({
        addressLine: dto.addressLine,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        country: 'CA',
      });
    } catch (error) {
      this.translateGeocodingError(error);
    }

    if (results.length > 1) {
      const issuedAt = Date.now();
      return {
        status: 'SELECTION_REQUIRED' as const,
        candidates: results.slice(0, 5).map((result) => ({
          label:
            result.normalizedAddress.addressLine!,
          locality: [
            result.normalizedAddress.city,
            result.normalizedAddress.province,
            result.normalizedAddress.postalCode,
          ]
            .filter(Boolean)
            .join(', ')
            .replace(/, ([A-Z]\d[A-Z] \d[A-Z]\d)$/, ' $1'),
          selectionToken: this.createLocationSelectionToken(
            subscriber.id,
            program.id,
            result,
            locationTokenKey,
            issuedAt,
          ),
        })),
        expiresAt: new Date(
          issuedAt + POPULATION_LOCATION_RESOLUTION_TTL_MS,
        ).toISOString(),
      };
    }

    const result = results[0];

    const resolution = this.createLocationResolutionToken(
      subscriber.id,
      program.id,
      result,
      locationTokenKey,
    );

    return {
      status: 'RESOLVED' as const,
      location: result.normalizedAddress,
      resolutionToken: resolution.token,
      expiresAt: new Date(resolution.expiresAt).toISOString(),
    };
  }

  async selectSubscriberLocation(
    publicSlug: string,
    subscriberId: string,
    dto: SelectPopulationLocationDto,
  ) {
    this.readiness.assertAccessReady();
    this.readiness.assertLocationTokenReady();
    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: {
        id: true,
        rueFacilityProfile: { select: { buildingId: true } },
      },
    });
    if (!program) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    this.verifySubscriberAccessToken(dto.accessToken, subscriberId, program.id);
    const operationalProfile = await this.assertPopulationOperational(
      program.rueFacilityProfile.buildingId,
    );
    if (operationalProfile.populationProgram?.id !== program.id) {
      throw new BadRequestException(
        'Le programme Sentinelle Population n’est pas actif',
      );
    }
    const subscriber = await this.prisma.populationSubscriber.findFirst({
      where: {
        id: subscriberId,
        programId: program.id,
        status: PopulationSubscriberStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!subscriber) throw new BadRequestException('Accès citoyen invalide');

    const selected = this.verifyLocationSelectionToken(
      dto.selectionToken,
      subscriber.id,
      program.id,
    );
    const result: GeocodingResult = {
      latitude: selected.latitude,
      longitude: selected.longitude,
      normalizedAddress: selected.normalizedAddress,
      provider: 'TOKEN',
    };
    const resolution = this.createLocationResolutionToken(
      subscriber.id,
      program.id,
      result,
      this.getPopulationLocationTokenKey(),
    );
    return {
      status: 'RESOLVED' as const,
      location: selected.normalizedAddress,
      resolutionToken: resolution.token,
      expiresAt: new Date(resolution.expiresAt).toISOString(),
    };
  }

  async confirmSubscriberLocation(
    publicSlug: string,
    subscriberId: string,
    dto: ConfirmPopulationLocationDto,
  ) {
    this.readiness.assertAccessReady();
    this.readiness.assertLocationTokenReady();
    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: {
        id: true,
        rueFacilityProfile: { select: { buildingId: true } },
      },
    });
    if (!program) {
      throw new NotFoundException('Programme Sentinelle Population introuvable');
    }

    this.verifySubscriberAccessToken(dto.accessToken, subscriberId, program.id);
    const operationalProfile = await this.assertPopulationOperational(
      program.rueFacilityProfile.buildingId,
    );
    if (operationalProfile.populationProgram?.id !== program.id) {
      throw new BadRequestException('Le programme Sentinelle Population n’est pas actif');
    }

    const subscriber = await this.prisma.populationSubscriber.findFirst({
      where: {
        id: subscriberId,
        programId: program.id,
        status: PopulationSubscriberStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!subscriber) throw new BadRequestException('Accès citoyen invalide');

    const resolution = this.verifyLocationResolutionToken(
      dto.resolutionToken,
      subscriberId,
      program.id,
    );
    const resolvedAt = new Date(resolution.iat);
    const updated = await this.prisma.populationSubscriber.updateMany({
      where: {
        id: subscriberId,
        programId: program.id,
        status: PopulationSubscriberStatus.ACTIVE,
        OR: [
          { locationResolvedAt: null },
          { locationResolvedAt: { lt: resolvedAt } },
        ],
      },
      data: {
        latitude: resolution.latitude,
        longitude: resolution.longitude,
        locationSource: 'GEOCODED_ADDRESS',
        locationResolvedAt: resolvedAt,
      },
    });

    if (updated.count === 0) {
      const current = await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
          status: PopulationSubscriberStatus.ACTIVE,
        },
        select: { latitude: true, longitude: true, locationResolvedAt: true },
      });
      const idempotent =
        current?.locationResolvedAt?.getTime() === resolution.iat &&
        current.latitude === resolution.latitude &&
        current.longitude === resolution.longitude;
      if (!idempotent) {
        throw new ConflictException('Cette confirmation de localisation est obsolète');
      }
    }

    return {
      confirmed: true,
      locationConfigured: true,
      resolvedAt: resolvedAt.toISOString(),
    };
  }

  /**
   * Retourne le profil minimal d'un citoyen authentifié.
   *
   * Les coordonnées sont masquées : le portail n'a pas besoin
   * de retourner inutilement le téléphone ou le courriel complet.
   */
  async getSubscriberProfile(
    publicSlug: string,
    subscriberId: string,
    dto: PopulationAccessDto,
  ) {
    const program =
      await this.prisma.populationProgram.findUnique({
        where: {
          publicSlug,
        },
        select: {
          id: true,
        },
      });

    if (!program) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    this.verifySubscriberAccessToken(
      dto.accessToken,
      subscriberId,
      program.id,
    );

    const subscriber =
      await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
        },
        select: {
          id: true,
          status: true,
          preferredLanguage: true,
          phone: true,
          email: true,
          smsEnabled: true,
          emailEnabled: true,
          verifiedAt: true,
          unsubscribedAt: true,
          latitude: true,
          longitude: true,
          locationResolvedAt: true,
        },
      });

    if (!subscriber) {
      throw new NotFoundException(
        'Inscription introuvable',
      );
    }

    const maskPhone = (phone: string | null) => {
      if (!phone) return null;

      const visible = phone.slice(-4);

      return `${'*'.repeat(
        Math.max(phone.length - 4, 0),
      )}${visible}`;
    };

    const maskEmail = (email: string | null) => {
      if (!email) return null;

      const [localPart, domain] = email.split('@');

      if (!domain) return '***';

      const visibleLocal =
        localPart.length <= 1
          ? '*'
          : `${localPart[0]}***`;

      return `${visibleLocal}@${domain}`;
    };

    return {
      id: subscriber.id,
      status: subscriber.status,
      preferredLanguage: subscriber.preferredLanguage,

      channels: {
        sms: {
          available: Boolean(subscriber.phone),
          enabled: subscriber.smsEnabled,
          destination: maskPhone(subscriber.phone),
        },

        email: {
          available: Boolean(subscriber.email),
          enabled: subscriber.emailEnabled,
          destination: maskEmail(subscriber.email),
        },
      },

      verifiedAt: subscriber.verifiedAt,
      unsubscribedAt: subscriber.unsubscribedAt,
      locationConfigured:
        subscriber.latitude != null && subscriber.longitude != null,
      locationResolvedAt: subscriber.locationResolvedAt,
    };
  }

  /**
   * Modifie les préférences non sensibles d'un citoyen authentifié.
   */
  async updateSubscriberPreferences(
    publicSlug: string,
    subscriberId: string,
    dto: UpdatePopulationPreferencesDto,
  ) {
    const program =
      await this.prisma.populationProgram.findUnique({
        where: {
          publicSlug,
        },
        select: {
          id: true,
          consentVersion: true,
        },
      });

    if (!program) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    this.verifySubscriberAccessToken(
      dto.accessToken,
      subscriberId,
      program.id,
    );

    const subscriber =
      await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
        },
      });

    if (!subscriber) {
      throw new NotFoundException(
        'Inscription introuvable',
      );
    }

    if (
      subscriber.status !== PopulationSubscriberStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Cette inscription ne peut pas être modifiée',
      );
    }

    if (!program.consentVersion) {
      throw new BadRequestException(
        'La version du consentement du programme est invalide',
      );
    }

    if (
      subscriber.preferredLanguage === dto.preferredLanguage
    ) {
      return {
        updated: false,
        preferredLanguage: subscriber.preferredLanguage,
      };
    }

    const occurredAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.populationSubscriber.update({
        where: {
          id: subscriber.id,
        },
        data: {
          preferredLanguage: dto.preferredLanguage,
        },
      });

      await tx.populationConsentEvent.create({
        data: {
          programId: program.id,
          subscriberId: subscriber.id,
          type: PopulationConsentEventType.CONSENT_UPDATED,
          consentVersion: program.consentVersion!,
          smsEnabled: subscriber.smsEnabled,
          emailEnabled: subscriber.emailEnabled,
          source: 'PUBLIC_PORTAL',
          occurredAt,
        },
      });
    });

    return {
      updated: true,
      preferredLanguage: dto.preferredLanguage,
    };
  }

  /**
   * Désabonne un citoyen authentifié.
   *
   * Le subscriberId seul n'est jamais considéré comme une preuve
   * d'autorisation. Un jeton signé obtenu après vérification OTP
   * est obligatoire.
   */
  async unsubscribeSubscriber(
    publicSlug: string,
    subscriberId: string,
    dto: UnsubscribePopulationSubscriberDto,
  ) {
    const program =
      await this.prisma.populationProgram.findUnique({
        where: {
          publicSlug,
        },
        select: {
          id: true,
          consentVersion: true,
        },
      });

    if (!program) {
      throw new NotFoundException(
        'Programme Sentinelle Population introuvable',
      );
    }

    this.verifySubscriberAccessToken(
      dto.accessToken,
      subscriberId,
      program.id,
    );

    const subscriber =
      await this.prisma.populationSubscriber.findFirst({
        where: {
          id: subscriberId,
          programId: program.id,
        },
      });

    if (!subscriber) {
      throw new NotFoundException(
        'Inscription introuvable',
      );
    }

    if (
      subscriber.status ===
      PopulationSubscriberStatus.UNSUBSCRIBED
    ) {
      return {
        unsubscribed: true,
        status: PopulationSubscriberStatus.UNSUBSCRIBED,
      };
    }

    if (
      subscriber.status !== PopulationSubscriberStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Cette inscription ne peut pas être désabonnée',
      );
    }

    if (!program.consentVersion) {
      throw new BadRequestException(
        'La version du consentement du programme est invalide',
      );
    }

    const consentVersion = program.consentVersion;
    const unsubscribedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.populationSubscriber.update({
        where: {
          id: subscriber.id,
        },
        data: {
          status: PopulationSubscriberStatus.UNSUBSCRIBED,
          smsEnabled: false,
          emailEnabled: false,
          unsubscribedAt,
        },
      });

      await tx.populationConsentEvent.create({
        data: {
          programId: program.id,
          subscriberId: subscriber.id,
          type: PopulationConsentEventType.UNSUBSCRIBED,
          consentVersion,

          smsEnabled: false,
          emailEnabled: false,

          source: 'PUBLIC_PORTAL',
          occurredAt: unsubscribedAt,
        },
      });
    });

    return {
      unsubscribed: true,
      status: PopulationSubscriberStatus.UNSUBSCRIBED,
    };
  }

  /**
   * Retourne la configuration opérationnelle de Sentinelle Population.
   *
   * Cette vue est volontairement limitée à la configuration du programme :
   * aucune donnée nominative d'abonné n'est retournée ici.
   *
   * Le site doit être confirmé comme assujetti au RUE, mais le programme
   * n'a pas besoin d'être ACTIVE pour être consulté/configuré.
   */
  async getProgramConfiguration(buildingId: string) {
    const profile = await this.assertPopulationEligible(buildingId);

    const program = profile.populationProgram;

    if (!program) {
      return {
        configured: false,
        rueFacilityProfileId: profile.id,
        status: PopulationProgramStatus.NOT_CONFIGURED,
        program: null,
      };
    }

    return {
      configured: true,
      rueFacilityProfileId: profile.id,
      status: program.status,
      program: {
        id: program.id,
        publicSlug: program.publicSlug,

        nameFR: program.nameFR,
        nameEN: program.nameEN,

        descriptionFR: program.descriptionFR,
        descriptionEN: program.descriptionEN,

        publicPhone: program.publicPhone,
        publicEmail: program.publicEmail,
        websiteUrl: program.websiteUrl,

        registrationEnabled: program.registrationEnabled,

        smsEnabled: program.smsEnabled,
        emailEnabled: program.emailEnabled,

        privacyTextFR: program.privacyTextFR,
        privacyTextEN: program.privacyTextEN,

        consentTextFR: program.consentTextFR,
        consentTextEN: program.consentTextEN,
        consentVersion: program.consentVersion,

        activatedAt: program.activatedAt,
        suspendedAt: program.suspendedAt,
        archivedAt: program.archivedAt,

        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      },
    };
  }
    /**
   * Crée ou met à jour la configuration Sentinelle Population.
   *
   * Cette opération :
   * - exige un site confirmé assujetti au RUE;
   * - ne peut jamais activer le programme;
   * - place un nouveau programme en CONFIGURING;
   * - conserve l'état existant lors des modifications ultérieures.
   *
   * Les transitions READY / ACTIVE / SUSPENDED / ARCHIVED sont gérées
   * par des opérations métier distinctes.
   */
  private getProgramConfigurationRequirements(
    program: {
      publicSlug: string;
      nameFR: string;
      smsEnabled: boolean;
      emailEnabled: boolean;
      privacyTextFR?: string | null;
      consentTextFR?: string | null;
      consentVersion?: string | null;
    },
  ) {
    const missingRequirements: string[] = [];

    if (!program.publicSlug?.trim()) {
      missingRequirements.push('PUBLIC_SLUG_REQUIRED');
    }

    if (!program.nameFR?.trim()) {
      missingRequirements.push('NAME_FR_REQUIRED');
    }

    if (!program.smsEnabled && !program.emailEnabled) {
      missingRequirements.push('DELIVERY_CHANNEL_REQUIRED');
    }

    if (!program.privacyTextFR?.trim()) {
      missingRequirements.push('PRIVACY_TEXT_FR_REQUIRED');
    }

    if (!program.consentTextFR?.trim()) {
      missingRequirements.push('CONSENT_TEXT_FR_REQUIRED');
    }

    if (!program.consentVersion?.trim()) {
      missingRequirements.push('CONSENT_VERSION_REQUIRED');
    }

    return missingRequirements;
  }

  async configureProgram(
    buildingId: string,
    dto: ConfigurePopulationProgramDto,
  ) {
    const profile = await this.assertPopulationEligible(buildingId);

    const data = {
      publicSlug: dto.publicSlug,
      nameFR: dto.nameFR,
      nameEN: dto.nameEN ?? null,
      descriptionFR: dto.descriptionFR ?? null,
      descriptionEN: dto.descriptionEN ?? null,
      publicPhone: dto.publicPhone ?? null,
      publicEmail: dto.publicEmail ?? null,
      websiteUrl: dto.websiteUrl ?? null,
      registrationEnabled: dto.registrationEnabled,
      smsEnabled: dto.smsEnabled,
      emailEnabled: dto.emailEnabled,
      privacyTextFR: dto.privacyTextFR ?? null,
      privacyTextEN: dto.privacyTextEN ?? null,
      consentTextFR: dto.consentTextFR ?? null,
      consentTextEN: dto.consentTextEN ?? null,
      consentVersion: dto.consentVersion ?? null,
    };

    const existingProgram = profile.populationProgram;

    if (existingProgram?.status === PopulationProgramStatus.ARCHIVED) {
      throw new BadRequestException(
        'Un programme archivé ne peut plus être modifié',
      );
    }

    if (
      existingProgram?.status === PopulationProgramStatus.READY ||
      existingProgram?.status === PopulationProgramStatus.ACTIVE
    ) {
      const missingRequirements =
        this.getProgramConfigurationRequirements(data);

      if (missingRequirements.length > 0) {
        throw new BadRequestException({
          message:
            'Cette modification rendrait le programme Sentinelle Population invalide',
          missingRequirements,
        });
      }
    }

    const program = await this.prisma.populationProgram.upsert({
      where: {
        rueFacilityProfileId: profile.id,
      },
      create: {
        rueFacilityProfileId: profile.id,
        status: PopulationProgramStatus.CONFIGURING,
        ...data,
      },
      update: data,
    });

    return program;
  }
}
