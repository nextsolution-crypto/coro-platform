import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommercialSubscriptionStatus, Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSubscriptionDto,
  SubscriptionRenewDto,
  SubscriptionTransitionDto,
} from './commercial-subscriptions.dto';

type Actor = { userId: string };
const include = {
  contract: { select: { id: true, reference: true, status: true } },
  contractRevision: { select: { id: true, revisionNumber: true, status: true } },
  proposalRevision: { select: { id: true, revisionNumber: true, status: true } },
  priceBookVersion: { include: { priceBook: true } },
  items: { include: { capability: true }, orderBy: { createdAt: 'asc' as const } },
  renewals: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class CommercialSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(organizationId: string) {
    return this.serialize(await this.prisma.commercialSubscription.findMany({
      where: { organizationId },
      include,
      orderBy: { createdAt: 'desc' },
    }));
  }

  async detail(organizationId: string, id: string) {
    const value = await this.prisma.commercialSubscription.findFirst({
      where: { id, organizationId },
      include: { ...include, invoices: { orderBy: { createdAt: 'desc' } } },
    });
    if (!value) throw new NotFoundException('Souscription introuvable.');
    return this.serialize(value);
  }

  async create(organizationId: string, dto: CreateSubscriptionDto, actor: Actor) {
    if (!['MONTHLY', 'ANNUAL'].includes(dto.billingCadence))
      throw new BadRequestException('BILLING_CADENCE_NOT_AUTHORIZED');
    const start = new Date(dto.effectiveFrom);
    const end = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    const renewal = dto.renewalAt ? new Date(dto.renewalAt) : null;
    if ((end && end <= start) || (renewal && renewal < start))
      throw new BadRequestException('SUBSCRIPTION_PERIOD_INVALID');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`commercial-subscription:${organizationId}`}, 0))`;
      const existing = await tx.commercialSubscription.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include,
      });
      if (existing) {
        if (existing.organizationId !== organizationId)
          throw new ConflictException('IDEMPOTENCY_KEY_CONFLICT');
        return this.serialize(existing);
      }
      const contract = await tx.organizationContract.findFirst({
        where: { id: dto.contractId, organizationId, status: 'ACTIVE' },
      });
      const revision = await tx.organizationContractRevision.findFirst({
        where: {
          id: dto.contractRevisionId,
          contractId: dto.contractId,
          status: 'SIGNED',
          priceBookVersionId: dto.priceBookVersionId,
        },
        include: { priceLines: { include: { capability: true } } },
      });
      const proposalRevision = await tx.commercialProposalRevision.findFirst({
        where: {
          id: dto.proposalRevisionId,
          status: 'ACCEPTED',
          sourcePriceBookVersionId: dto.priceBookVersionId,
          proposal: { organizationId, acceptedRevisionId: dto.proposalRevisionId },
        },
      });
      if (!contract) throw new BadRequestException('ACTIVE_CONTRACT_REQUIRED');
      if (!revision) throw new BadRequestException('SIGNED_CONTRACT_REVISION_REQUIRED');
      if (!proposalRevision) throw new BadRequestException('ACCEPTED_PROPOSAL_REQUIRED');
      if (revision.sourceProposalRevisionId !== proposalRevision.id)
        throw new BadRequestException('COMMERCIAL_PROVENANCE_MISMATCH');
      if (revision.billingCadence !== dto.billingCadence)
        throw new BadRequestException('BILLING_CADENCE_CONTRACT_MISMATCH');
      const requested = new Set(dto.items.map((item) => item.contractSnapshotLineId));
      if (requested.size !== dto.items.length)
        throw new BadRequestException('SUBSCRIPTION_ITEM_DUPLICATE');
      const lines = revision.priceLines.filter((line) => requested.has(line.id));
      if (lines.length !== requested.size || lines.some((line) => !line.capabilityId))
        throw new BadRequestException('SUBSCRIPTION_ITEM_INVALID');
      const created = await tx.commercialSubscription.create({
        data: {
          organizationId,
          reference: dto.reference,
          contractId: contract.id,
          contractRevisionId: revision.id,
          proposalRevisionId: proposalRevision.id,
          priceBookVersionId: dto.priceBookVersionId,
          billingCadence: dto.billingCadence,
          currency: 'CAD',
          effectiveFrom: start,
          effectiveUntil: end,
          renewalAt: renewal,
          paymentTermsDays: 30,
          graceMonitoringDays: 15,
          idempotencyKey: dto.idempotencyKey,
          lifecycleReason: this.audit.normalizeReason(dto.reason, true),
          createdByUserId: actor.userId,
          items: {
            create: lines.map((line) => ({
              capabilityId: line.capabilityId!,
              contractSnapshotLineId: line.id,
              quantity: line.quantity,
              quantityUnit: line.quantityUnit,
              amountMinor: line.contractExtendedAmountMinor ?? line.contractAmountMinor,
              billingPeriod: line.billingPeriod,
            })),
          },
        },
        include,
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_SUBSCRIPTION_CREATED',
        targetType: 'CommercialSubscription',
        targetId: created.id,
        targetLabel: created.reference,
        organizationId,
        reason: this.audit.normalizeReason(dto.reason, true),
        afterData: this.json({ status: created.status, contractId: created.contractId }),
      });
      return this.serialize(created);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async transition(
    organizationId: string,
    id: string,
    action: 'activate' | 'past-due' | 'suspend' | 'reactivate' | 'terminate',
    dto: SubscriptionTransitionDto,
    actor: Actor,
  ) {
    const rules: Record<string, { from: CommercialSubscriptionStatus[]; to: CommercialSubscriptionStatus }> = {
      activate: { from: ['DRAFT'], to: 'ACTIVE' },
      'past-due': { from: ['ACTIVE'], to: 'PAST_DUE' },
      suspend: { from: ['ACTIVE', 'PAST_DUE'], to: 'SUSPENDED' },
      reactivate: { from: ['PAST_DUE', 'SUSPENDED'], to: 'ACTIVE' },
      terminate: { from: ['DRAFT', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'], to: 'TERMINATED' },
    };
    const rule = rules[action];
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.commercialSubscription.findFirst({ where: { id, organizationId }, include });
      if (!before) throw new NotFoundException('Souscription introuvable.');
      if (!rule.from.includes(before.status)) throw new BadRequestException('SUBSCRIPTION_TRANSITION_INVALID');
      if (action === 'activate') {
        const contract = await tx.organizationContract.findFirst({ where: { id: before.contractId, organizationId, status: 'ACTIVE' } });
        if (!contract) throw new BadRequestException('ACTIVE_CONTRACT_REQUIRED');
      }
      const now = new Date();
      const result = await tx.commercialSubscription.updateMany({
        where: { id, organizationId, status: before.status, lockVersion: dto.lockVersion },
        data: {
          status: rule.to,
          lifecycleReason: reason,
          lockVersion: { increment: 1 },
          activatedAt: action === 'activate' || action === 'reactivate' ? now : undefined,
          pastDueAt: action === 'past-due' ? now : undefined,
          suspendedAt: action === 'suspend' ? now : undefined,
          terminatedAt: action === 'terminate' ? now : undefined,
        },
      });
      if (result.count !== 1) throw new ConflictException('SUBSCRIPTION_VERSION_CONFLICT');
      if (action === 'activate' || action === 'reactivate')
        await tx.commercialSubscriptionItem.updateMany({ where: { subscriptionId: id }, data: { active: true } });
      if (action === 'suspend' || action === 'terminate')
        await tx.commercialSubscriptionItem.updateMany({ where: { subscriptionId: id }, data: { active: false } });
      const after = await tx.commercialSubscription.findUniqueOrThrow({ where: { id }, include });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: `COMMERCIAL_SUBSCRIPTION_${rule.to}`,
        targetType: 'CommercialSubscription', targetId: id, targetLabel: after.reference,
        organizationId, reason,
        beforeData: this.json({ status: before.status }),
        afterData: this.json({ status: after.status, entitlementMutation: 'NONE_EXPLICIT_APPLY_REQUIRED' }),
      });
      return this.serialize(after);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async entitlementContinuity(organizationId: string, id: string) {
    const subscription = await this.detail(organizationId, id);
    const entitlements = await this.prisma.capabilityEntitlement.findMany({
      where: { organizationId, sourceContractId: subscription.contractId },
      include: { capability: true, revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    return {
      subscriptionId: id,
      subscriptionStatus: subscription.status,
      automaticSuspension: false,
      criticalEmergencyAutomaticDisable: false,
      items: subscription.items.map((item) => ({
        capabilityCode: item.capability.code,
        subscriptionActive: item.active,
        entitlement: entitlements.find((e) => e.capabilityId === item.capabilityId) ?? null,
      })),
      applyRequired: true,
    };
  }

  async renew(organizationId: string, id: string, dto: SubscriptionRenewDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.commercialSubscription.findFirst({ where: { id, organizationId } });
      if (!before || !['ACTIVE', 'PAST_DUE'].includes(before.status))
        throw new BadRequestException('SUBSCRIPTION_NOT_RENEWABLE');
      const termEffectiveFrom = new Date(dto.effectiveFrom);
      const nextRenewalAt = new Date(dto.renewalAt);
      if (nextRenewalAt <= termEffectiveFrom)
        throw new BadRequestException('SUBSCRIPTION_RENEWAL_PERIOD_INVALID');
      const result = await tx.commercialSubscription.updateMany({
        where: { id, organizationId, lockVersion: dto.lockVersion },
        data: { renewalAt: nextRenewalAt, lifecycleReason: reason, lockVersion: { increment: 1 } },
      });
      if (result.count !== 1) throw new ConflictException('SUBSCRIPTION_VERSION_CONFLICT');
      await tx.commercialSubscriptionRenewal.create({ data: {
        subscriptionId: id,
        previousRenewalAt: before.renewalAt,
        termEffectiveFrom,
        nextRenewalAt,
        termMonths: dto.termMonths,
        reason,
        renewedByUserId: actor.userId,
      } });
      const after = await tx.commercialSubscription.findUniqueOrThrow({ where: { id }, include });
      await this.audit.record(tx, {
        actorUserId: actor.userId, action: 'COMMERCIAL_SUBSCRIPTION_RENEWED',
        targetType: 'CommercialSubscription', targetId: id, targetLabel: after.reference,
        organizationId, reason,
        beforeData: this.json({ renewalAt: before.renewalAt }),
        afterData: this.json({ renewalAt: after.renewalAt, termEffectiveFrom, termMonths: dto.termMonths ?? null }),
      });
      return this.serialize(after);
    });
  }

  private json(value: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item)) as Prisma.InputJsonValue;
  }

  private serialize<T>(value: T): T {
    return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item)) as T;
  }
}
