import { Injectable } from '@nestjs/common';
import { PopulationSubscriberStatus, Prisma, UserRole } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  populationIdentityLockKey,
  PopulationIdentityType,
} from './population-identity-lock';

const CURRENT_STATUSES: PopulationSubscriberStatus[] = [
  PopulationSubscriberStatus.PENDING_VERIFICATION,
  PopulationSubscriberStatus.ACTIVE,
  PopulationSubscriberStatus.SUSPENDED,
];

const REMEDIATION_ACTION = 'POPULATION_IDENTITY_REMEDIATED';
const REMEDIATION_VERSION = 'population-identity-remediation/v1';

export class PopulationIdentityRemediationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'PopulationIdentityRemediationError';
  }
}

export type PopulationIdentityRemediationInput = {
  programId: string;
  identityType: PopulationIdentityType;
  authoritySubscriberId: string;
  abandonSubscriberId: string;
  dryRun: boolean;
  confirmRemediation: boolean;
  actorUserId?: string;
  injectFailureAfterAbandon?: boolean;
};

type SubscriberSnapshot = {
  id: string;
  programId: string;
  status: PopulationSubscriberStatus;
  email: string | null;
  emailCanonical: string | null;
  phoneCanonical: string | null;
  identityAuthorityAt: Date | null;
  unsubscribedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: string | null;
  locationResolvedAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
  counts: {
    verifications: number;
    consentEvents: number;
    smsEvidence: number;
    alertDeliveries: number;
  };
};

@Injectable()
export class PopulationIdentityRemediationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAudit: AdminAuditService,
  ) {}

  private fail(code: string): never {
    throw new PopulationIdentityRemediationError(code);
  }

  private tryCanonicalIdentity(
    subscriber: Pick<
      SubscriberSnapshot,
      'email' | 'emailCanonical' | 'phoneCanonical'
    >,
    identityType: PopulationIdentityType,
  ) {
    if (identityType === 'PHONE') {
      return subscriber.phoneCanonical;
    }
    return (
      subscriber.emailCanonical ??
      subscriber.email?.trim().toLowerCase() ??
      null
    );
  }

  private canonicalIdentity(
    subscriber: Pick<
      SubscriberSnapshot,
      'email' | 'emailCanonical' | 'phoneCanonical'
    >,
    identityType: PopulationIdentityType,
  ) {
    return (
      this.tryCanonicalIdentity(subscriber, identityType) ||
      this.fail('IDENTITY_MISMATCH')
    );
  }

  private async subscriberSnapshot(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<SubscriberSnapshot | null> {
    const row = await tx.populationSubscriber.findUnique({
      where: { id },
      select: {
        id: true,
        programId: true,
        status: true,
        email: true,
        emailCanonical: true,
        phoneCanonical: true,
        identityAuthorityAt: true,
        unsubscribedAt: true,
        latitude: true,
        longitude: true,
        locationSource: true,
        locationResolvedAt: true,
        verifiedAt: true,
        createdAt: true,
        _count: {
          select: {
            verifications: true,
            consentEvents: true,
            smsConsentEvidence: true,
            alertDeliveries: true,
          },
        },
      },
    });
    if (!row) return null;
    const { _count, ...subscriber } = row;
    return {
      ...subscriber,
      counts: {
        verifications: _count.verifications,
        consentEvents: _count.consentEvents,
        smsEvidence: _count.smsConsentEvidence,
        alertDeliveries: _count.alertDeliveries,
      },
    };
  }

  private sameHistory(before: SubscriberSnapshot, after: SubscriberSnapshot) {
    return (
      JSON.stringify(before.counts) === JSON.stringify(after.counts) &&
      before.latitude === after.latitude &&
      before.longitude === after.longitude &&
      before.locationSource === after.locationSource &&
      before.locationResolvedAt?.getTime() ===
        after.locationResolvedAt?.getTime() &&
      before.verifiedAt?.getTime() === after.verifiedAt?.getTime() &&
      before.createdAt.getTime() === after.createdAt.getTime()
    );
  }

  async remediate(input: PopulationIdentityRemediationInput) {
    if (input.authoritySubscriberId === input.abandonSubscriberId) {
      this.fail('REMEDIATION_CONFLICT');
    }
    if (input.dryRun === input.confirmRemediation) {
      this.fail('CONFIRMATION_REQUIRED');
    }
    if (input.confirmRemediation && !input.actorUserId) {
      this.fail('CONFIRMATION_REQUIRED');
    }

    return this.prisma.$transaction(async (tx) => {
      const program = await tx.populationProgram.findUnique({
        where: { id: input.programId },
        select: { id: true },
      });
      if (!program) this.fail('PROGRAM_NOT_FOUND');

      const initialAuthority = await this.subscriberSnapshot(
        tx,
        input.authoritySubscriberId,
      );
      const initialDuplicate = await this.subscriberSnapshot(
        tx,
        input.abandonSubscriberId,
      );
      if (!initialAuthority || !initialDuplicate) {
        this.fail('SUBSCRIBER_NOT_FOUND');
      }
      if (
        initialAuthority.programId !== input.programId ||
        initialDuplicate.programId !== input.programId
      ) {
        this.fail('PROGRAM_MISMATCH');
      }
      const initialCanonical = this.canonicalIdentity(
        initialAuthority,
        input.identityType,
      );
      if (
        initialCanonical !==
        this.canonicalIdentity(initialDuplicate, input.identityType)
      ) {
        this.fail('IDENTITY_MISMATCH');
      }

      const lockKey = populationIdentityLockKey({
        programId: input.programId,
        identityType: input.identityType,
        canonicalIdentity: initialCanonical,
      });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      await tx.$executeRaw`
        SELECT 1
        FROM "PopulationSubscriber"
        WHERE "id" IN (${input.authoritySubscriberId}, ${input.abandonSubscriberId})
        ORDER BY "id"
        FOR UPDATE
      `;

      const authority = await this.subscriberSnapshot(
        tx,
        input.authoritySubscriberId,
      );
      const duplicate = await this.subscriberSnapshot(
        tx,
        input.abandonSubscriberId,
      );
      if (!authority || !duplicate) this.fail('SUBSCRIBER_NOT_FOUND');
      if (
        authority.programId !== input.programId ||
        duplicate.programId !== input.programId
      ) {
        this.fail('PROGRAM_MISMATCH');
      }
      const canonical = this.canonicalIdentity(authority, input.identityType);
      if (
        canonical !== this.canonicalIdentity(duplicate, input.identityType) ||
        canonical !== initialCanonical
      ) {
        this.fail('IDENTITY_MISMATCH');
      }

      if (
        CURRENT_STATUSES.includes(authority.status) &&
        duplicate.status === PopulationSubscriberStatus.ABANDONED &&
        authority.identityAuthorityAt &&
        !duplicate.identityAuthorityAt
      ) {
        return this.result('ALREADY_REMEDIATED', input, authority, duplicate);
      }
      if (
        authority.status === PopulationSubscriberStatus.ABANDONED ||
        duplicate.identityAuthorityAt
      ) {
        this.fail('REMEDIATION_CONFLICT');
      }
      if (
        !CURRENT_STATUSES.includes(authority.status) ||
        !CURRENT_STATUSES.includes(duplicate.status)
      ) {
        this.fail('INVALID_LIFECYCLE');
      }

      const possible = await tx.populationSubscriber.findMany({
        where: {
          programId: input.programId,
          status: { in: CURRENT_STATUSES },
        },
        select: {
          id: true,
          email: true,
          emailCanonical: true,
          phoneCanonical: true,
          identityAuthorityAt: true,
        },
      });
      const group = possible.filter(
        (candidate) =>
          this.tryCanonicalIdentity(candidate, input.identityType) ===
          canonical,
      );
      if (
        group.some(
          (candidate) =>
            candidate.identityAuthorityAt &&
            candidate.id !== input.authoritySubscriberId,
        )
      ) {
        this.fail('AUTHORITY_CONFLICT');
      }
      if (
        group.length !== 2 ||
        !group.some((candidate) => candidate.id === authority.id) ||
        !group.some((candidate) => candidate.id === duplicate.id)
      ) {
        this.fail('AMBIGUOUS_IDENTITY_GROUP');
      }

      if (input.dryRun) {
        return this.result('DRY_RUN_OK', input, authority, duplicate);
      }

      const actor = await tx.user.findUnique({
        where: { id: input.actorUserId! },
        select: { role: true },
      });
      if (!actor || actor.role !== UserRole.SUPER_ADMIN) {
        this.fail('ACTOR_NOT_AUTHORIZED');
      }

      const remediationAt = new Date();
      const abandoned = await tx.populationSubscriber.updateMany({
        where: {
          id: duplicate.id,
          programId: input.programId,
          status: duplicate.status,
          identityAuthorityAt: null,
        },
        data: { status: PopulationSubscriberStatus.ABANDONED },
      });
      if (abandoned.count !== 1) this.fail('REMEDIATION_CONFLICT');
      if (input.injectFailureAfterAbandon) {
        throw new Error('INJECTED_REMEDIATION_FAILURE');
      }

      const authorityData: Prisma.PopulationSubscriberUpdateInput = {
        identityAuthorityAt: authority.identityAuthorityAt ?? remediationAt,
      };
      if (input.identityType === 'EMAIL') {
        authorityData.emailCanonical = canonical;
      }
      await tx.populationSubscriber.update({
        where: { id: authority.id },
        data: authorityData,
      });

      const afterAuthority = await this.subscriberSnapshot(tx, authority.id);
      const afterDuplicate = await this.subscriberSnapshot(tx, duplicate.id);
      if (!afterAuthority || !afterDuplicate) this.fail('REMEDIATION_CONFLICT');
      if (
        afterAuthority.status !== authority.status ||
        afterDuplicate.status !== PopulationSubscriberStatus.ABANDONED ||
        !afterAuthority.identityAuthorityAt ||
        afterDuplicate.identityAuthorityAt ||
        !this.sameHistory(authority, afterAuthority) ||
        !this.sameHistory(duplicate, afterDuplicate) ||
        afterDuplicate.unsubscribedAt?.getTime() !==
          duplicate.unsubscribedAt?.getTime()
      ) {
        this.fail('HISTORY_PRESERVATION_FAILED');
      }

      await this.adminAudit.record(tx, {
        actorUserId: input.actorUserId!,
        action: REMEDIATION_ACTION,
        targetType: 'PopulationSubscriberIdentity',
        targetId: authority.id,
        reason: 'Historical duplicate Population identity remediation',
        beforeData: {
          version: REMEDIATION_VERSION,
          programId: input.programId,
          identityType: input.identityType,
          authoritySubscriberId: authority.id,
          abandonSubscriberId: duplicate.id,
          authorityStatus: authority.status,
          duplicateStatus: duplicate.status,
          authorityHistoryCounts: authority.counts,
          duplicateHistoryCounts: duplicate.counts,
        },
        afterData: {
          version: REMEDIATION_VERSION,
          result: 'REMEDIATED',
          authorityStatus: afterAuthority.status,
          duplicateStatus: afterDuplicate.status,
          historyPreserved: true,
        },
      });
      return this.result('REMEDIATED', input, afterAuthority, afterDuplicate, {
        authority: authority.status,
        duplicate: duplicate.status,
      });
    });
  }

  private result(
    status: 'DRY_RUN_OK' | 'REMEDIATED' | 'ALREADY_REMEDIATED',
    input: PopulationIdentityRemediationInput,
    authority: SubscriberSnapshot,
    duplicate: SubscriberSnapshot,
    beforeStatus = {
      authority: authority.status,
      duplicate: duplicate.status,
    },
  ) {
    return {
      status,
      version: REMEDIATION_VERSION,
      programId: input.programId,
      identityType: input.identityType,
      authoritySubscriberId: authority.id,
      authorityBeforeStatus: beforeStatus.authority,
      authorityAfterStatus: authority.status,
      duplicateSubscriberId: duplicate.id,
      duplicateBeforeStatus: beforeStatus.duplicate,
      duplicateAfterStatus:
        status === 'DRY_RUN_OK'
          ? PopulationSubscriberStatus.ABANDONED
          : duplicate.status,
      thirdCurrentCandidates: 0,
      historyPreserved: true,
      historyMutation: false,
      crossDomainMutation: false,
      smsSuppressionMutation: false,
      authorityHistoryCounts: authority.counts,
      duplicateHistoryCounts: duplicate.counts,
    };
  }
}
