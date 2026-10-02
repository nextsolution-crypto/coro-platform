import { Prisma, PrismaClient } from '@prisma/client';
import { PopulationPhoneAuditService } from '../common/phone/population-phone-audit.service';
import type { PopulationPhoneAuditInput } from '../common/phone/population-phone-audit.types';
import { PhoneNumberService } from '../common/phone/phone-number.service';

const CA_CONTEXT = { defaultCountry: 'CA' as const, purpose: 'SMS' as const };
const subscriberSelect = {
  id: true,
  programId: true,
  phone: true,
  phoneCanonical: true,
  email: true,
  status: true,
  smsEnabled: true,
  emailEnabled: true,
  preferredLanguage: true,
  verifiedAt: true,
  unsubscribedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      consentEvents: true,
      smsConsentEvidence: true,
      alertDeliveries: true,
    },
  },
} satisfies Prisma.PopulationSubscriberSelect;

type ReadClient = Pick<PrismaClient, 'populationSubscriber'>;
type Subscriber = Prisma.PopulationSubscriberGetPayload<{
  select: typeof subscriberSelect;
}>;
type Candidate = {
  subscriberId: string;
  expectedPhone: string;
  expectedCanonical: string;
  expectedUpdatedAt: Date;
  maskedPhone: string;
};

export type PopulationPhoneBackfillResult = {
  mode: 'DRY_RUN' | 'APPLY';
  eligibleCount: number;
  appliedCount: number;
  candidateIds: string[];
  candidates: Array<{ subscriberId: string; maskedPhone: string }>;
  auditBefore: Record<string, number>;
  auditAfter: Record<string, number> | null;
  updatedAtBehavior:
    | 'UNCHANGED'
    | 'CHANGED_FOR_APPLIED_ROWS'
    | 'NOT_APPLICABLE';
};

export class PopulationPhoneBackfillService {
  constructor(
    private readonly auditService = new PopulationPhoneAuditService(),
    private readonly phoneNumbers = new PhoneNumberService(),
  ) {}

  async dryRun(client: ReadClient): Promise<PopulationPhoneBackfillResult> {
    const plan = await this.plan(client);
    return this.safeResult('DRY_RUN', plan, 0, null, 'NOT_APPLICABLE');
  }

  async apply(
    prisma: PrismaClient,
    confirmation: string,
    testHooks?: {
      beforeTransaction?: () => Promise<void>;
      afterCandidate?: (
        appliedCount: number,
        tx: Prisma.TransactionClient,
      ) => Promise<void>;
    },
  ): Promise<PopulationPhoneBackfillResult> {
    if (confirmation !== 'PHONE-01D') {
      throw new Error('Apply requires exact PHONE-01D confirmation');
    }
    const initial = await this.plan(prisma);
    this.assertApplySafe(initial);
    if (testHooks?.beforeTransaction) await testHooks.beforeTransaction();

    const transactionResult = await prisma.$transaction(
      async (tx) => {
        const current = await this.plan(tx);
        this.assertApplySafe(current);
        this.assertSameCandidates(initial.candidates, current.candidates);
        if (current.candidates.length === 0) {
          return {
            appliedCount: 0,
            updatedAtChanged: false,
            auditAfter: current.audit.aggregate,
          };
        }

        const beforeById = new Map(current.rows.map((row) => [row.id, row]));
        for (const [index, candidate] of current.candidates.entries()) {
          const result = await tx.populationSubscriber.updateMany({
            where: {
              id: candidate.subscriberId,
              phone: candidate.expectedPhone,
              phoneCanonical: null,
              updatedAt: candidate.expectedUpdatedAt,
            },
            data: { phoneCanonical: candidate.expectedCanonical },
          });
          if (result.count !== 1) {
            throw new Error(
              'Concurrent subscriber change detected; complete rollback required',
            );
          }
          if (testHooks?.afterCandidate) {
            await testHooks.afterCandidate(index + 1, tx);
          }
        }

        const afterRows = await tx.populationSubscriber.findMany({
          where: {
            id: {
              in: current.candidates.map((candidate) => candidate.subscriberId),
            },
          },
          select: subscriberSelect,
        });
        let updatedAtChanged = false;
        for (const after of afterRows) {
          const before = beforeById.get(after.id);
          const candidate = current.candidates.find(
            (item) => item.subscriberId === after.id,
          );
          if (
            !before ||
            !candidate ||
            after.phoneCanonical !== candidate.expectedCanonical
          ) {
            throw new Error('Post-apply canonical invariant failed');
          }
          updatedAtChanged ||=
            after.updatedAt.getTime() !== before.updatedAt.getTime();
          if (this.businessSnapshot(before) !== this.businessSnapshot(after)) {
            throw new Error(
              'Non-target subscriber field changed; complete rollback required',
            );
          }
        }
        const after = await this.plan(tx);
        if (
          after.audit.aggregate.SAME_PROGRAM_COLLISION_GROUPS !== 0 ||
          after.audit.aggregate.MALFORMED_PHONE_CANONICAL !== 0 ||
          after.audit.aggregate.CANONICAL_RAW_MISMATCH !== 0 ||
          after.audit.aggregate.SAFE_TO_BACKFILL !==
            initial.audit.aggregate.SAFE_TO_BACKFILL -
              current.candidates.length ||
          after.audit.aggregate.ALREADY_COMPLETE !==
            initial.audit.aggregate.ALREADY_COMPLETE + current.candidates.length
        ) {
          throw new Error(
            'Post-apply audit invariant failed; complete rollback required',
          );
        }
        return {
          appliedCount: current.candidates.length,
          updatedAtChanged,
          auditAfter: after.audit.aggregate,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.safeResult(
      'APPLY',
      initial,
      transactionResult.appliedCount,
      transactionResult.auditAfter,
      transactionResult.appliedCount === 0
        ? 'NOT_APPLICABLE'
        : transactionResult.updatedAtChanged
          ? 'CHANGED_FOR_APPLIED_ROWS'
          : 'UNCHANGED',
    );
  }

  private async plan(client: ReadClient) {
    const rows = (await client.populationSubscriber.findMany({
      orderBy: [{ programId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: subscriberSelect,
    })) as Subscriber[];
    const inputs = rows.map((row) => this.toAuditInput(row));
    const audit = this.auditService.audit(inputs, { detailedCollisions: true });
    const canonicalGroups = new Map<string, Subscriber[]>();
    const canonicalById = new Map<string, string>();
    for (const row of rows) {
      if (!row.phone?.trim()) continue;
      try {
        const canonical = this.phoneNumbers.normalizePhoneNumber(
          row.phone,
          CA_CONTEXT,
        ).canonical;
        canonicalById.set(row.id, canonical);
        const key = `${row.programId}\u0000${canonical}`;
        canonicalGroups.set(key, [...(canonicalGroups.get(key) ?? []), row]);
      } catch {
        // Non-eligible values remain represented by the authoritative audit.
      }
    }
    const candidates: Candidate[] = rows
      .filter((row) => row.phoneCanonical === null && canonicalById.has(row.id))
      .filter((row) => {
        const canonical = canonicalById.get(row.id)!;
        return (
          canonicalGroups.get(`${row.programId}\u0000${canonical}`)?.length ===
          1
        );
      })
      .map((row) => {
        const canonical = canonicalById.get(row.id)!;
        return {
          subscriberId: row.id,
          expectedPhone: row.phone!,
          expectedCanonical: canonical,
          expectedUpdatedAt: row.updatedAt,
          maskedPhone: this.phoneNumbers.maskPhoneNumber(canonical)!,
        };
      });
    if (candidates.length !== audit.aggregate.SAFE_TO_BACKFILL) {
      throw new Error('Backfill eligibility does not match PHONE-01C audit');
    }
    return { rows, audit, candidates };
  }

  private assertApplySafe(
    plan: Awaited<ReturnType<PopulationPhoneBackfillService['plan']>>,
  ) {
    if (
      plan.audit.aggregate.REVIEW_REQUIRED !== 0 ||
      plan.audit.aggregate.SAME_PROGRAM_COLLISION_GROUPS !== 0 ||
      plan.audit.aggregate.MALFORMED_PHONE_CANONICAL !== 0 ||
      plan.audit.aggregate.CANONICAL_RAW_MISMATCH !== 0
    ) {
      throw new Error('PHONE-01C review findings prevent backfill apply');
    }
  }

  private assertSameCandidates(expected: Candidate[], current: Candidate[]) {
    const identity = (candidate: Candidate) =>
      `${candidate.subscriberId}\u0000${candidate.expectedCanonical}\u0000${candidate.expectedPhone}\u0000${candidate.expectedUpdatedAt.toISOString()}`;
    if (
      expected.map(identity).sort().join('\n') !==
      current.map(identity).sort().join('\n')
    ) {
      throw new Error(
        'Candidate set changed concurrently; complete rollback required',
      );
    }
  }

  private toAuditInput(row: Subscriber): PopulationPhoneAuditInput {
    return {
      id: row.id,
      programId: row.programId,
      phone: row.phone,
      phoneCanonical: row.phoneCanonical,
      status: row.status,
      smsEnabled: row.smsEnabled,
      emailEnabled: row.emailEnabled,
      verifiedAt: row.verifiedAt,
      createdAt: row.createdAt,
      consentEvidenceCount:
        row._count.consentEvents + row._count.smsConsentEvidence,
      historicalDeliveryCount: row._count.alertDeliveries,
    };
  }

  private businessSnapshot(row: Subscriber) {
    return JSON.stringify({
      id: row.id,
      programId: row.programId,
      phone: row.phone,
      email: row.email,
      status: row.status,
      smsEnabled: row.smsEnabled,
      emailEnabled: row.emailEnabled,
      preferredLanguage: row.preferredLanguage,
      verifiedAt: row.verifiedAt,
      unsubscribedAt: row.unsubscribedAt,
      createdAt: row.createdAt,
      consentEvents: row._count.consentEvents,
      smsConsentEvidence: row._count.smsConsentEvidence,
      alertDeliveries: row._count.alertDeliveries,
    });
  }

  private safeResult(
    mode: PopulationPhoneBackfillResult['mode'],
    plan: Awaited<ReturnType<PopulationPhoneBackfillService['plan']>>,
    appliedCount: number,
    auditAfter: Record<string, number> | null,
    updatedAtBehavior: PopulationPhoneBackfillResult['updatedAtBehavior'],
  ): PopulationPhoneBackfillResult {
    return {
      mode,
      eligibleCount: plan.candidates.length,
      appliedCount,
      candidateIds: plan.candidates
        .map((candidate) => candidate.subscriberId)
        .sort(),
      candidates: plan.candidates
        .map(({ subscriberId, maskedPhone }) => ({ subscriberId, maskedPhone }))
        .sort((left, right) =>
          left.subscriberId.localeCompare(right.subscriberId),
        ),
      auditBefore: plan.audit.aggregate,
      auditAfter,
      updatedAtBehavior,
    };
  }
}
