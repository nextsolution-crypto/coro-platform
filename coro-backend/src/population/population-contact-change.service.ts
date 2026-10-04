import { Inject, Injectable } from '@nestjs/common';
import {
  PopulationContactChangePurpose,
  PopulationContactChangeStatus,
  PopulationContactChangeType,
  PopulationConsentEventType,
  PopulationPreferredLanguage,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  Prisma,
} from '@prisma/client';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PhoneNumberService } from '../common/phone/phone-number.service';
import { POPULATION_ENVIRONMENT } from './population-environment';
import { PopulationService } from './population.service';
import { PopulationReadinessService } from './population-readiness.service';
import { PopulationDeliveryService } from './population-delivery.service';
import { PopulationContactCryptoService } from './population-contact-crypto.service';
import { PopulationSmsSuppressionService } from './population-sms-suppression.service';
import {
  populationGlobalPhoneLockKey,
  populationIdentityLockKey,
} from './population-identity-lock';
import { buildPopulationSmsConsentSnapshot } from './population-sms-compliance';
import {
  POPULATION_CONTACT_CHANGE_MAX_ATTEMPTS,
  POPULATION_CONTACT_CHANGE_MAX_RESENDS,
  POPULATION_CONTACT_CHANGE_OPERATION_VERSION,
  POPULATION_CONTACT_CHANGE_SOURCE,
  POPULATION_CONTACT_CHANGE_SURFACE,
  POPULATION_CONTACT_CHANGE_TTL_MS,
} from './population-contact-change.constants';
import { PopulationContactChangeError } from './population-contact-change.errors';

type InitiateInput = {
  accessToken: string;
  destination: string;
  smsConsent?: boolean;
  consentVersion?: string;
};

type TokenPayload = {
  purpose: 'POPULATION_CONTACT_CHANGE';
  challengeId: string;
  subscriberId: string;
  programId: string;
  type: PopulationContactChangeType;
  exp: number;
};

const OPERATIONAL: PopulationContactChangeStatus[] = [
  PopulationContactChangeStatus.DELIVERY_PENDING,
  PopulationContactChangeStatus.OTP_REQUIRED,
];

@Injectable()
export class PopulationContactChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly population: PopulationService,
    private readonly readiness: PopulationReadinessService,
    private readonly delivery: PopulationDeliveryService,
    private readonly crypto: PopulationContactCryptoService,
    private readonly phones: PhoneNumberService,
    private readonly suppressions: PopulationSmsSuppressionService,
    @Inject(POPULATION_ENVIRONMENT) private readonly env: NodeJS.ProcessEnv,
  ) {}

  initiatePhone(
    publicSlug: string,
    subscriberId: string,
    input: InitiateInput,
  ) {
    return this.initiate(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.PHONE,
      input,
    );
  }

  initiateEmail(
    publicSlug: string,
    subscriberId: string,
    input: InitiateInput,
  ) {
    return this.initiate(
      publicSlug,
      subscriberId,
      PopulationContactChangeType.EMAIL,
      input,
    );
  }

  async verify(
    publicSlug: string,
    subscriberId: string,
    type: PopulationContactChangeType,
    input: { accessToken: string; challengeToken: string; code: string },
  ) {
    const context = await this.authorize(
      publicSlug,
      subscriberId,
      input.accessToken,
    );
    const token = this.verifyChallengeToken(
      input.challengeToken,
      context.program.id,
      subscriberId,
      type,
    );
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const initial = await tx.populationContactChangeChallenge.findUnique({
        where: { id: token.challengeId },
      });
      if (
        !initial ||
        initial.programId !== context.program.id ||
        initial.subscriberId !== subscriberId ||
        initial.type !== type
      )
        throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
      if (initial.status === PopulationContactChangeStatus.APPLIED)
        return this.response(initial, true);
      if (!OPERATIONAL.includes(initial.status))
        this.assertOperational(initial, new Date());
      const destination = this.unprotect(initial);
      const current =
        type === PopulationContactChangeType.PHONE
          ? context.subscriber.phoneCanonical
          : context.subscriber.emailCanonical;
      const lockKeys = [
        populationIdentityLockKey({
          programId: context.program.id,
          identityType: type,
          canonicalIdentity: destination,
        }),
      ];
      if (current)
        lockKeys.push(
          populationIdentityLockKey({
            programId: context.program.id,
            identityType: type,
            canonicalIdentity: current,
          }),
        );
      if (type === PopulationContactChangeType.PHONE)
        await this.lock(tx, populationGlobalPhoneLockKey(destination));
      for (const key of [...new Set(lockKeys)].sort()) await this.lock(tx, key);
      await tx.$queryRaw`SELECT id FROM "PopulationSubscriber" WHERE id = ${subscriberId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "PopulationContactChangeChallenge" WHERE id = ${token.challengeId} FOR UPDATE`;
      const challenge =
        await tx.populationContactChangeChallenge.findUniqueOrThrow({
          where: { id: token.challengeId },
        });
      if (challenge.status === PopulationContactChangeStatus.APPLIED)
        return this.response(challenge, true);
      if (
        OPERATIONAL.includes(challenge.status) &&
        challenge.expiresAt.getTime() <= now.getTime()
      ) {
        await tx.populationContactChangeChallenge.update({
          where: { id: challenge.id },
          data: {
            status: PopulationContactChangeStatus.EXPIRED,
            expiredAt: now,
            proposedDestinationProtected: null,
          },
        });
        return { domainError: 'CONTACT_CHANGE_EXPIRED' as const };
      }
      this.assertOperational(challenge, now);
      if (challenge.status !== PopulationContactChangeStatus.OTP_REQUIRED)
        throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
      if (!this.codeMatches(input.code, challenge.codeHash)) {
        const attempts = challenge.attemptCount + 1;
        if (attempts >= challenge.maxAttempts) {
          await tx.populationContactChangeChallenge.update({
            where: { id: challenge.id },
            data: {
              attemptCount: attempts,
              status: PopulationContactChangeStatus.ATTEMPTS_EXHAUSTED,
              exhaustedAt: now,
              proposedDestinationProtected: null,
            },
          });
          return { domainError: 'CONTACT_CHANGE_ATTEMPTS_EXHAUSTED' as const };
        }
        await tx.populationContactChangeChallenge.update({
          where: { id: challenge.id },
          data: { attemptCount: attempts },
        });
        return { domainError: 'CONTACT_CHANGE_INVALID_OTP' as const };
      }
      const subscriber = await tx.populationSubscriber.findUniqueOrThrow({
        where: { id: subscriberId },
      });
      if (
        subscriber.status !== PopulationSubscriberStatus.ACTIVE ||
        context.program.status !== PopulationProgramStatus.ACTIVE
      )
        throw this.error('CONTACT_CHANGE_UNAVAILABLE');
      const authoritativeCurrent =
        type === PopulationContactChangeType.PHONE
          ? subscriber.phoneCanonical
          : subscriber.emailCanonical;
      const expectedMatches = challenge.expectedCurrentDestinationAbsent
        ? !authoritativeCurrent
        : Boolean(authoritativeCurrent) &&
          this.fingerprint(type, authoritativeCurrent!) ===
            challenge.expectedCurrentDestinationFingerprint;
      if (!expectedMatches) throw this.error('CONTACT_CHANGE_CONFLICT');
      const collision = await tx.populationSubscriber.findFirst({
        where: {
          programId: context.program.id,
          id: { not: subscriberId },
          identityAuthorityAt: { not: null },
          status: {
            in: [
              PopulationSubscriberStatus.PENDING_VERIFICATION,
              PopulationSubscriberStatus.ACTIVE,
              PopulationSubscriberStatus.SUSPENDED,
            ],
          },
          ...(type === PopulationContactChangeType.PHONE
            ? { phoneCanonical: destination }
            : { emailCanonical: destination }),
        },
        select: { id: true },
      });
      if (collision) throw this.error('CONTACT_CHANGE_CONFLICT');
      let smsEnabled = subscriber.smsEnabled;
      if (type === PopulationContactChangeType.PHONE) {
        if (challenge.consentVersion !== context.program.consentVersion)
          throw this.error('CONTACT_CHANGE_CONSENT_STALE');
        smsEnabled = !(await tx.populationSmsSuppression.findUnique({
          where: { phoneCanonical: destination },
          select: { id: true },
        }));
      }
      await tx.populationSubscriber.update({
        where: { id: subscriberId },
        data:
          type === PopulationContactChangeType.PHONE
            ? { phone: destination, phoneCanonical: destination, smsEnabled }
            : { email: destination, emailCanonical: destination },
      });
      if (type === PopulationContactChangeType.PHONE) {
        const disclosure = this.disclosure(
          context.program,
          subscriber.preferredLanguage,
        );
        await tx.populationSmsConsentEvidence.create({
          data: {
            programId: context.program.id,
            subscriberId,
            contactChangeChallengeId: challenge.id,
            consentVersion: challenge.consentVersion!,
            language: subscriber.preferredLanguage,
            disclosureSnapshot: disclosure,
            source: POPULATION_CONTACT_CHANGE_SOURCE,
            surface: POPULATION_CONTACT_CHANGE_SURFACE,
            smsEnabled,
            emailEnabled: subscriber.emailEnabled,
            submittedAt: challenge.createdAt,
            verifiedAt: now,
          },
        });
        await tx.populationConsentEvent.create({
          data: {
            programId: context.program.id,
            subscriberId,
            type: PopulationConsentEventType.CONSENT_UPDATED,
            consentVersion: challenge.consentVersion!,
            smsEnabled,
            emailEnabled: subscriber.emailEnabled,
            source: POPULATION_CONTACT_CHANGE_SOURCE,
            occurredAt: now,
          },
        });
      }
      const applied = await tx.populationContactChangeChallenge.update({
        where: { id: challenge.id },
        data: {
          status: PopulationContactChangeStatus.APPLIED,
          verifiedAt: now,
          appliedAt: now,
          proposedDestinationProtected: null,
        },
      });
      return this.response(applied, true);
    });
    if ('domainError' in result) throw this.error(result.domainError);
    return result;
  }

  async resend(
    publicSlug: string,
    subscriberId: string,
    type: PopulationContactChangeType,
    input: { accessToken: string; challengeToken: string },
  ) {
    const context = await this.authorize(
      publicSlug,
      subscriberId,
      input.accessToken,
    );
    const token = this.verifyChallengeToken(
      input.challengeToken,
      context.program.id,
      subscriberId,
      type,
    );
    const now = new Date();
    const code = this.newCode();
    const challenge = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PopulationContactChangeChallenge" WHERE id = ${token.challengeId} FOR UPDATE`;
      const row = await tx.populationContactChangeChallenge.findUnique({
        where: { id: token.challengeId },
      });
      if (!row) throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
      if (
        OPERATIONAL.includes(row.status) &&
        row.expiresAt.getTime() <= now.getTime()
      ) {
        await tx.populationContactChangeChallenge.update({
          where: { id: row.id },
          data: {
            status: PopulationContactChangeStatus.EXPIRED,
            expiredAt: now,
            proposedDestinationProtected: null,
          },
        });
        return null;
      }
      this.assertOperational(row, now);
      if (
        row.status !== PopulationContactChangeStatus.OTP_REQUIRED ||
        row.resendCount >= POPULATION_CONTACT_CHANGE_MAX_RESENDS
      )
        throw this.error('CONTACT_CHANGE_RESEND_UNAVAILABLE');
      return tx.populationContactChangeChallenge.update({
        where: { id: row.id },
        data: {
          status: PopulationContactChangeStatus.DELIVERY_PENDING,
          codeHash: this.hashCode(code),
          deliveryGeneration: { increment: 1 },
          resendCount: { increment: 1 },
          attemptCount: 0,
          expiresAt: new Date(now.getTime() + POPULATION_CONTACT_CHANGE_TTL_MS),
          deliveryAttemptedAt: now,
          deliveryAcceptedAt: null,
        },
      });
    });
    if (!challenge) throw this.error('CONTACT_CHANGE_EXPIRED');
    const destination = this.unprotect(challenge);
    const sent = await this.deliver(
      type,
      destination,
      code,
      context.subscriber.preferredLanguage,
    );
    return this.finishDelivery(challenge.id, sent, input.challengeToken);
  }

  async cancel(
    publicSlug: string,
    subscriberId: string,
    type: PopulationContactChangeType,
    input: { accessToken: string; challengeToken: string },
  ) {
    const context = await this.authorize(
      publicSlug,
      subscriberId,
      input.accessToken,
    );
    const token = this.verifyChallengeToken(
      input.challengeToken,
      context.program.id,
      subscriberId,
      type,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PopulationContactChangeChallenge" WHERE id = ${token.challengeId} FOR UPDATE`;
      const row = await tx.populationContactChangeChallenge.findUnique({
        where: { id: token.challengeId },
      });
      if (!row) throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
      if (row.status === PopulationContactChangeStatus.APPLIED)
        return this.response(row, true);
      if (OPERATIONAL.includes(row.status) && row.expiresAt <= new Date()) {
        const expired = await tx.populationContactChangeChallenge.update({
          where: { id: row.id },
          data: {
            status: PopulationContactChangeStatus.EXPIRED,
            proposedDestinationProtected: null,
          },
        });
        return this.response(expired, false);
      }
      if (!OPERATIONAL.includes(row.status)) return this.response(row, false);
      const cancelled = await tx.populationContactChangeChallenge.update({
        where: { id: row.id },
        data: {
          status: PopulationContactChangeStatus.CANCELLED,
          cancelledAt: new Date(),
          proposedDestinationProtected: null,
        },
      });
      return this.response(cancelled, false);
    });
  }

  private async initiate(
    publicSlug: string,
    subscriberId: string,
    type: PopulationContactChangeType,
    input: InitiateInput,
  ) {
    const context = await this.authorize(
      publicSlug,
      subscriberId,
      input.accessToken,
    );
    this.readiness.assertOtpReady();
    if (
      this.readiness.getReadiness().population.contactChangeCrypto !== 'READY'
    )
      throw this.error('CONTACT_CHANGE_UNAVAILABLE');
    if (type === PopulationContactChangeType.PHONE)
      this.readiness.assertSmsReady();
    else this.readiness.assertEmailReady();
    const destination = this.canonicalize(type, input.destination);
    const current =
      type === PopulationContactChangeType.PHONE
        ? context.subscriber.phoneCanonical
        : context.subscriber.emailCanonical;
    if (current === destination) throw this.error('CONTACT_CHANGE_NO_CHANGE');
    if (type === PopulationContactChangeType.PHONE) {
      if (!context.program.smsEnabled)
        throw this.error('CONTACT_CHANGE_CHANNEL_DISABLED');
      if (!input.smsConsent)
        throw this.error('CONTACT_CHANGE_CONSENT_REQUIRED');
      if (
        !context.program.consentVersion ||
        input.consentVersion !== context.program.consentVersion
      )
        throw this.error('CONTACT_CHANGE_CONSENT_STALE');
      this.disclosure(context.program, context.subscriber.preferredLanguage);
      if (await this.suppressions.isSuppressed(destination))
        throw this.error('CONTACT_CHANGE_DESTINATION_SUPPRESSED');
    }
    const now = new Date();
    const id = randomUUID();
    const code = this.newCode();
    const fingerprint = this.fingerprint(type, destination);
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PopulationSubscriber" WHERE id = ${subscriberId} FOR UPDATE`;
      await tx.populationContactChangeChallenge.updateMany({
        where: { subscriberId, type, status: { in: OPERATIONAL } },
        data: {
          status: PopulationContactChangeStatus.SUPERSEDED,
          supersededAt: now,
          proposedDestinationProtected: null,
        },
      });
      return tx.populationContactChangeChallenge.create({
        data: {
          id,
          programId: context.program.id,
          subscriberId,
          type,
          purpose: current
            ? PopulationContactChangePurpose.CHANGE
            : PopulationContactChangePurpose.ADD,
          proposedDestinationProtected: this.crypto.protectDestination({
            challengeId: id,
            type,
            plaintext: destination,
          }),
          proposedDestinationFingerprint: fingerprint,
          expectedCurrentDestinationFingerprint: current
            ? this.fingerprint(type, current)
            : null,
          expectedCurrentDestinationAbsent: !current,
          codeHash: this.hashCode(code),
          expiresAt: new Date(now.getTime() + POPULATION_CONTACT_CHANGE_TTL_MS),
          maxAttempts: POPULATION_CONTACT_CHANGE_MAX_ATTEMPTS,
          operationVersion: POPULATION_CONTACT_CHANGE_OPERATION_VERSION,
          consentVersion:
            type === PopulationContactChangeType.PHONE
              ? input.consentVersion
              : null,
          source: POPULATION_CONTACT_CHANGE_SOURCE,
          surface: POPULATION_CONTACT_CHANGE_SURFACE,
          deliveryAttemptedAt: now,
        },
      });
    });
    const token = this.createChallengeToken(created);
    const sent = await this.deliver(
      type,
      destination,
      code,
      context.subscriber.preferredLanguage,
    );
    return this.finishDelivery(created.id, sent, token);
  }

  private async authorize(
    publicSlug: string,
    subscriberId: string,
    accessToken: string,
  ) {
    const program = await this.prisma.populationProgram.findUnique({
      where: { publicSlug },
      select: {
        id: true,
        status: true,
        smsEnabled: true,
        emailEnabled: true,
        consentVersion: true,
        consentTextFR: true,
        consentTextEN: true,
        privacyTextFR: true,
        privacyTextEN: true,
      },
    });
    if (!program) throw this.error('CONTACT_CHANGE_NOT_AUTHORIZED', 403);
    this.population.assertSubscriberAccessToken(
      accessToken,
      subscriberId,
      program.id,
    );
    const subscriber = await this.prisma.populationSubscriber.findFirst({
      where: { id: subscriberId, programId: program.id },
      select: {
        id: true,
        status: true,
        phone: true,
        phoneCanonical: true,
        email: true,
        emailCanonical: true,
        smsEnabled: true,
        emailEnabled: true,
        preferredLanguage: true,
        verifiedAt: true,
        identityAuthorityAt: true,
      },
    });
    if (
      !subscriber ||
      subscriber.status !== PopulationSubscriberStatus.ACTIVE ||
      program.status !== PopulationProgramStatus.ACTIVE
    )
      throw this.error('CONTACT_CHANGE_NOT_AUTHORIZED', 403);
    if (!subscriber.identityAuthorityAt)
      throw this.error('CONTACT_CHANGE_UNAVAILABLE');
    return { program, subscriber };
  }

  private async deliver(
    type: PopulationContactChangeType,
    destination: string,
    code: string,
    language: PopulationPreferredLanguage,
  ) {
    try {
      const english = language === PopulationPreferredLanguage.EN;
      if (type === PopulationContactChangeType.PHONE) {
        if (await this.suppressions.isSuppressed(destination)) return false;
        await this.delivery.sendSms(
          destination,
          english
            ? `CORO Sentinelle Population: your phone verification code is ${code}. Valid for 10 minutes.`
            : `CORO Sentinelle Population : votre code de vérification du téléphone est ${code}. Valide 10 minutes.`,
        );
      } else {
        await this.delivery.sendEmail({
          destination,
          subject: english
            ? 'Verify your Sentinelle Population email'
            : 'Vérifiez votre courriel Sentinelle Population',
          html: english
            ? `<p>Your Sentinelle Population email verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`
            : `<p>Votre code de vérification du courriel Sentinelle Population est <strong>${code}</strong>. Il expire dans 10 minutes.</p>`,
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  private async finishDelivery(
    id: string,
    sent: boolean,
    challengeToken: string,
  ) {
    const now = new Date();
    const updated =
      await this.prisma.populationContactChangeChallenge.updateMany({
        where: { id, status: PopulationContactChangeStatus.DELIVERY_PENDING },
        data: sent
          ? {
              status: PopulationContactChangeStatus.OTP_REQUIRED,
              deliveryAcceptedAt: now,
            }
          : {
              status: PopulationContactChangeStatus.DELIVERY_FAILED,
              deliveryFailedAt: now,
              proposedDestinationProtected: null,
            },
      });
    const challenge =
      await this.prisma.populationContactChangeChallenge.findUniqueOrThrow({
        where: { id },
      });
    if (
      !sent ||
      (updated.count === 0 &&
        challenge.status === PopulationContactChangeStatus.DELIVERY_FAILED)
    )
      throw this.error('CONTACT_CHANGE_DELIVERY_FAILED');
    return { ...this.response(challenge, false), challengeToken };
  }

  private response(
    challenge: {
      id: string;
      type: PopulationContactChangeType;
      purpose: PopulationContactChangePurpose;
      status: PopulationContactChangeStatus;
      expiresAt: Date;
      proposedDestinationProtected: string | null;
    },
    applied: boolean,
  ) {
    let maskedProposedDestination: string | null = null;
    if (challenge.proposedDestinationProtected) {
      const value = this.unprotect(challenge);
      maskedProposedDestination =
        challenge.type === PopulationContactChangeType.PHONE
          ? this.phones.maskPhoneNumber(value)
          : this.maskEmail(value);
    }
    return {
      contactType: challenge.type,
      purpose: challenge.purpose,
      status: challenge.status,
      maskedProposedDestination,
      expiresAt: challenge.expiresAt.toISOString(),
      applied,
    };
  }

  private canonicalize(type: PopulationContactChangeType, value: string) {
    try {
      return type === PopulationContactChangeType.PHONE
        ? this.phones.normalizePhoneNumber(value, {
            defaultCountry: 'CA',
            purpose: 'SMS',
          }).canonical
        : this.canonicalEmail(value);
    } catch {
      throw this.error('CONTACT_CHANGE_INVALID_DESTINATION');
    }
  }
  private canonicalEmail(value: string) {
    const canonical = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(canonical) || canonical.length > 254)
      throw new Error();
    return canonical;
  }
  private maskEmail(email: string | null) {
    if (!email) return null;
    const [local, domain] = email.split('@');
    return `${local.slice(0, 1) || '*'}***@${domain}`;
  }
  private fingerprint(type: PopulationContactChangeType, value: string) {
    return this.crypto.fingerprintDestination({
      type,
      canonicalDestination: value,
    });
  }
  private unprotect(challenge: {
    id: string;
    type: PopulationContactChangeType;
    proposedDestinationProtected: string | null;
  }) {
    if (!challenge.proposedDestinationProtected)
      throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
    try {
      return this.crypto.unprotectDestination({
        challengeId: challenge.id,
        type: challenge.type,
        protectedValue: challenge.proposedDestinationProtected,
      });
    } catch {
      throw this.error('CONTACT_CHANGE_UNAVAILABLE');
    }
  }
  private newCode() {
    return randomInt(100000, 1000000).toString();
  }
  private hashCode(code: string) {
    return createHmac('sha256', this.otpSecret()).update(code).digest('hex');
  }
  private codeMatches(code: string, hash: string) {
    const a = Buffer.from(this.hashCode(code), 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
  private otpSecret() {
    const value = this.env.POPULATION_OTP_SECRET?.trim();
    if (!value) throw this.error('CONTACT_CHANGE_UNAVAILABLE');
    return value;
  }
  private accessSecret() {
    const value = this.env.POPULATION_ACCESS_SECRET?.trim();
    if (!value) throw this.error('CONTACT_CHANGE_UNAVAILABLE');
    return value;
  }
  private createChallengeToken(challenge: {
    id: string;
    subscriberId: string;
    programId: string;
    type: PopulationContactChangeType;
    expiresAt: Date;
  }) {
    const payload: TokenPayload = {
      purpose: 'POPULATION_CONTACT_CHANGE',
      challengeId: challenge.id,
      subscriberId: challenge.subscriberId,
      programId: challenge.programId,
      type: challenge.type,
      exp: challenge.expiresAt.getTime() + 24 * 60 * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.accessSecret())
      .update(`contact-change:${encoded}`)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }
  private verifyChallengeToken(
    token: string,
    programId: string,
    subscriberId: string,
    type: PopulationContactChangeType,
  ) {
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra)
      throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
    const expected = createHmac('sha256', this.accessSecret())
      .update(`contact-change:${encoded}`)
      .digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch {
      throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
    const record = parsed as Record<string, unknown>;
    if (
      record.purpose !== 'POPULATION_CONTACT_CHANGE' ||
      typeof record.challengeId !== 'string' ||
      record.programId !== programId ||
      record.subscriberId !== subscriberId ||
      record.type !== type ||
      typeof record.exp !== 'number' ||
      record.exp <= Date.now()
    )
      throw this.error('CONTACT_CHANGE_INVALID_CHALLENGE');
    return record as TokenPayload;
  }
  private assertOperational(
    challenge: {
      status: PopulationContactChangeStatus;
      expiresAt: Date;
      id: string;
    },
    now: Date,
  ) {
    if (
      challenge.expiresAt.getTime() <= now.getTime() &&
      OPERATIONAL.includes(challenge.status)
    ) {
      throw this.error('CONTACT_CHANGE_EXPIRED');
    }
    if (!OPERATIONAL.includes(challenge.status)) {
      const code =
        challenge.status === PopulationContactChangeStatus.CANCELLED
          ? 'CONTACT_CHANGE_CANCELLED'
          : challenge.status === PopulationContactChangeStatus.SUPERSEDED
            ? 'CONTACT_CHANGE_SUPERSEDED'
            : challenge.status ===
                PopulationContactChangeStatus.ATTEMPTS_EXHAUSTED
              ? 'CONTACT_CHANGE_ATTEMPTS_EXHAUSTED'
              : challenge.status ===
                  PopulationContactChangeStatus.DELIVERY_FAILED
                ? 'CONTACT_CHANGE_DELIVERY_FAILED'
                : 'CONTACT_CHANGE_INVALID_CHALLENGE';
      throw this.error(code);
    }
  }
  private disclosure(
    program: {
      consentTextFR: string | null;
      consentTextEN: string | null;
      privacyTextFR: string | null;
      privacyTextEN: string | null;
    },
    language: PopulationPreferredLanguage,
  ) {
    const text = buildPopulationSmsConsentSnapshot({
      language,
      programConsentText:
        language === PopulationPreferredLanguage.EN
          ? program.consentTextEN
          : program.consentTextFR,
      programPrivacyText:
        language === PopulationPreferredLanguage.EN
          ? program.privacyTextEN
          : program.privacyTextFR,
    });
    if (!text.trim()) throw this.error('CONTACT_CHANGE_CONSENT_REQUIRED');
    return text;
  }
  private lock(tx: Prisma.TransactionClient, key: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
  private error(
    code: ConstructorParameters<typeof PopulationContactChangeError>[0],
    status?: number,
  ) {
    return new PopulationContactChangeError(code, status);
  }
}
