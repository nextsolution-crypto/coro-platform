import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CapabilityCode,
  CommercialScope,
  EntitlementLifecycle,
  EntitlementSource,
  Prisma,
} from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementLimitDto } from './capability-entitlements.dto';
import {
  EntitlementCommand,
  EntitlementOperation,
  EntitlementWarning,
  NormalizedLimit,
} from './entitlement-command.types';
import {
  rejectPendingRevision,
  validateEffectiveFrom,
  validateSourceRelationship,
  validateTarget,
  validateTemporaryPeriod,
} from './entitlement-policies';
import { EntitlementResolver } from './entitlement-resolver.service';
import { CapabilityObservationService } from '../control-center/capability-observation.service';

type Actor = { userId: string };
type Db = Prisma.TransactionClient;
type RevisionWithLimits = Prisma.CapabilityEntitlementRevisionGetPayload<{
  include: { limits: true };
}>;
type ExistingGrant = Prisma.CapabilityEntitlementGetPayload<{
  include: {
    revisions: { include: { limits: true } };
  };
}>;

@Injectable()
export class EntitlementCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly resolver: EntitlementResolver,
    private readonly observations: CapabilityObservationService,
  ) {}

  normalizeLimits(items?: EntitlementLimitDto[]): NormalizedLimit[] {
    const seen = new Set<string>();
    return (items ?? []).map((item) => {
      const metricCode = (item.metricCode ?? 'DEFAULT').trim();
      const identity = `${item.type}:${metricCode}`;
      if (!metricCode || seen.has(identity))
        throw new BadRequestException('ENTITLEMENT_LIMIT_DUPLICATE');
      seen.add(identity);
      if (item.unlimited && item.quantity != null)
        throw new BadRequestException('ENTITLEMENT_LIMIT_UNLIMITED_QUANTITY');
      if (!item.unlimited && item.quantity == null)
        throw new BadRequestException('ENTITLEMENT_LIMIT_QUANTITY_REQUIRED');
      if (
        item.quantity != null &&
        new Prisma.Decimal(item.quantity).isNegative()
      )
        throw new BadRequestException('ENTITLEMENT_LIMIT_NEGATIVE');
      const periodStart = item.periodStart ? new Date(item.periodStart) : null;
      const periodEnd = item.periodEnd ? new Date(item.periodEnd) : null;
      if (periodEnd && (!periodStart || periodEnd <= periodStart))
        throw new BadRequestException('ENTITLEMENT_LIMIT_PERIOD_INVALID');
      return {
        type: item.type,
        metricCode,
        unlimited: item.unlimited,
        quantity: item.quantity ?? null,
        periodStart,
        periodEnd,
      };
    });
  }

  async preview(command: EntitlementCommand) {
    const observed = await this.observations.observeOrganization(
      command.organizationId,
    );
    const result = await this.prisma.$transaction(async (tx) => {
      const derived = command.entitlementId
        ? await this.deriveTransition(tx, command, new Date())
        : await this.deriveCreation(tx, command, new Date());
      const currentResolvedState = await this.resolveCommand(command);
      const projectedResolvedState = this.project(
        currentResolvedState,
        command.entitlementId,
        derived.lifecycle,
        derived.enabled,
        derived.distributable,
      );
      return {
        operation: command.operation,
        organization: derived.organization,
        capability: derived.capability,
        target: derived.target,
        targetGrant: derived.entitlement,
        currentResolvedState,
        projectedResolvedState,
        semanticSourceRevision: derived.sourceRevision,
        proposedRevision: {
          lifecycle: derived.lifecycle,
          enabled: derived.enabled,
          distributable: derived.distributable,
          effectiveFrom: derived.effectiveFrom,
          effectiveUntil: derived.effectiveUntil,
        },
        completeProjectedLimits: derived.limits,
        otherContributingGrants:
          currentResolvedState?.contributingGrants?.filter(
            (grant: { id: string }) => grant.id !== command.entitlementId,
          ) ?? [],
        distributedChildren: derived.distributedChildren,
        partnerCapacity: derived.partnerCapacity,
        observations: derived.warnings.filter((warning) =>
          warning.code.endsWith('_OBSERVED'),
        ),
        observationQuality: derived.warnings.length
          ? 'INFERRED'
          : 'NOT_AVAILABLE',
        reconciliationBefore: [] as Array<Record<string, unknown>>,
        reconciliationProjected: [] as Array<Record<string, unknown>>,
        warnings: derived.warnings,
        requiredConfirmations: derived.warnings
          .filter((warning) => warning.acknowledgementRequired)
          .map((warning) => warning.code),
        expectedLockVersion:
          derived.entitlement && 'lockVersion' in derived.entitlement
            ? derived.entitlement.lockVersion
            : null,
        expectedRevisionId: derived.sourceRevision?.id ?? null,
        operationalMutationPerformed: false,
        enforcement: 'NONE',
      };
    });
    const warnings = this.operationalWarningsFromResult(
      command.capabilityCode!,
      observed,
    );
    result.warnings.push(...warnings);
    result.observations.push(...warnings);
    result.requiredConfirmations.push(
      ...warnings.map((warning) => warning.code),
    );
    const capabilityObservation =
      observed[command.capabilityCode! as keyof typeof observed];
    const observedValue = capabilityObservation?.observed.value ?? null;
    result.reconciliationBefore.push({
      capabilityCode: command.capabilityCode,
      mismatch:
        'mismatch' in result.currentResolvedState
          ? result.currentResolvedState.mismatch
          : 'UNKNOWN',
      persisted: false,
    });
    result.reconciliationProjected.push({
      capabilityCode: command.capabilityCode,
      mismatch:
        observedValue == null
          ? 'UNKNOWN'
          : result.projectedResolvedState.licensed
            ? observedValue
              ? 'ENTITLED_AND_OBSERVED'
              : 'ENTITLED_NOT_OBSERVED'
            : observedValue
              ? 'NOT_ENTITLED_OBSERVED'
              : 'NOT_ENTITLED_NOT_OBSERVED',
      persisted: false,
    });
    return result;
  }

  async execute(command: EntitlementCommand, actor: Actor) {
    const observed = await this.observations.observeOrganization(
      command.organizationId,
    );
    return this.prisma.$transaction(async (tx) => {
      const lockKey = command.entitlementId ?? command.organizationId;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      const now = new Date();
      if (command.entitlementId) {
        const derived = await this.deriveTransition(tx, command, now);
        derived.warnings.push(
          ...this.operationalWarningsFromResult(
            command.capabilityCode!,
            observed,
          ),
        );
        this.validateAcknowledgements(command, derived.warnings);
        return this.appendRevision(tx, command, derived, actor, now);
      }
      const derived = await this.deriveCreation(tx, command, now);
      derived.warnings.push(
        ...this.operationalWarningsFromResult(
          command.capabilityCode!,
          observed,
        ),
      );
      this.validateAcknowledgements(command, derived.warnings);
      return this.createGrant(tx, command, derived, actor);
    });
  }

  private async deriveCreation(tx: Db, command: EntitlementCommand, now: Date) {
    if (
      command.source === 'CONTRACT' &&
      !command.capabilityCode &&
      command.sourceSnapshotLineId
    ) {
      const source = await tx.contractPriceSnapshotLine.findUnique({
        where: { id: command.sourceSnapshotLineId },
        include: { capability: { select: { code: true } } },
      });
      command.capabilityCode = source?.capability?.code;
    }
    if (!command.capabilityCode || !command.scope || !command.source)
      throw new BadRequestException('ENTITLEMENT_CREATE_COMMAND_INCOMPLETE');
    const organization = await tx.organization.findUnique({
      where: { id: command.organizationId },
      select: { id: true, name: true, commercialRelationship: true },
    });
    if (!organization) throw new NotFoundException('Organization introuvable.');
    validateSourceRelationship(
      command.source,
      organization.commercialRelationship,
    );
    validateTarget(command.scope, command.clientId, command.buildingId);
    const capability = await tx.commercialCapability.findUnique({
      where: { code: command.capabilityCode as CapabilityCode },
      include: { scopePolicies: true },
    });
    if (!capability) throw new NotFoundException('Capability introuvable.');
    if (!capability.isAvailable || capability.lifecycle !== 'CURRENT')
      throw new BadRequestException('CAPABILITY_NOT_ASSIGNABLE');
    const policy = capability.scopePolicies.find(
      (item) => item.scope === command.scope,
    );
    if (policy?.status !== 'ALLOWED')
      throw new BadRequestException('CAPABILITY_SCOPE_NOT_ALLOWED');
    await this.validateTenantTarget(tx, command);
    const effectiveFrom = command.effectiveFrom ?? now;
    validateEffectiveFrom(effectiveFrom, now);
    if (command.source === 'TRIAL' || command.source === 'MANUAL_OVERRIDE')
      validateTemporaryPeriod(effectiveFrom, command.effectiveUntil ?? null);

    let enabled = command.enabled ?? false;
    let distributable = command.distributable ?? false;
    let limits = command.limits ?? [];
    let existing: ExistingGrant | null = null;
    if (command.source === 'CONTRACT') {
      const contract = await this.validateContract(tx, command, capability.id);
      enabled = command.enabled ?? contract.internalUse === true;
      distributable = command.distributable ?? contract.distributable === true;
      if (enabled && contract.internalUse !== true)
        throw new BadRequestException('CONTRACT_INTERNAL_USE_EXCEEDED');
      if (distributable && contract.distributable !== true)
        throw new BadRequestException('CONTRACT_DISTRIBUTION_EXCEEDED');
      const mapped = this.contractLimit(contract);
      limits = command.limits ?? (mapped ? [mapped] : []);
      this.validateContractLimits(limits, mapped);
      const matches = await tx.capabilityEntitlement.findMany({
        where: {
          organizationId: command.organizationId,
          sourceSnapshotLineId: command.sourceSnapshotLineId,
        },
        include: {
          revisions: {
            orderBy: { versionNumber: 'asc' },
            take: 1,
            include: { limits: true },
          },
        },
      });
      existing =
        matches.find(
          (item) =>
            item.scope === command.scope &&
            item.clientId === (command.clientId ?? null) &&
            item.buildingId === (command.buildingId ?? null),
        ) ?? null;
      if (!existing && matches.length)
        throw new ConflictException('CONTRACT_PROVISIONING_TARGET_CONFLICT');
    }
    if (command.source === 'DISTRIBUTION') {
      await this.validateDistributionParent(
        tx,
        command,
        capability.id,
        effectiveFrom,
      );
      const matches = await tx.capabilityEntitlement.findMany({
        where: {
          parentEntitlementId: command.parentEntitlementId,
          capabilityId: capability.id,
          scope: command.scope,
          clientId: command.clientId ?? null,
          buildingId: command.buildingId ?? null,
        },
        include: {
          revisions: {
            orderBy: { versionNumber: 'asc' },
            take: 1,
            include: { limits: true },
          },
        },
      });
      existing = matches[0] ?? null;
      distributable = false;
    }
    if (existing)
      this.validateIdempotentCreation(
        existing,
        command,
        capability.id,
        enabled,
        distributable,
        effectiveFrom,
        command.effectiveUntil ?? null,
        limits,
      );
    if (
      command.source === 'CONTRACT' &&
      distributable &&
      (organization.commercialRelationship !== 'PARTNER' ||
        command.scope !== 'ORGANIZATION')
    )
      throw new BadRequestException('DISTRIBUTABLE_PARTNER_ORGANIZATION_ONLY');
    const warnings = this.creationWarnings(
      command,
      organization.commercialRelationship,
    );
    return {
      organization,
      capability,
      target: {
        scope: command.scope,
        clientId: command.clientId ?? null,
        buildingId: command.buildingId ?? null,
      },
      entitlement: existing,
      sourceRevision: null as RevisionWithLimits | null,
      lifecycle: 'GRANTED' as EntitlementLifecycle,
      enabled,
      distributable,
      effectiveFrom,
      effectiveUntil: command.effectiveUntil ?? null,
      limits,
      warnings,
      distributedChildren: { total: 0, projectedInvalid: 0 },
      partnerCapacity: await this.partnerCapacity(
        tx,
        command.parentEntitlementId,
      ),
    };
  }

  private async deriveTransition(
    tx: Db,
    command: EntitlementCommand,
    now: Date,
  ) {
    const entitlement = await tx.capabilityEntitlement.findFirst({
      where: {
        id: command.entitlementId,
        organizationId: command.organizationId,
      },
      include: {
        organization: {
          select: { id: true, name: true, commercialRelationship: true },
        },
        capability: true,
        revisions: {
          orderBy: { versionNumber: 'desc' },
          include: { limits: true },
        },
        distributedEntitlements: { select: { id: true } },
      },
    });
    if (!entitlement) throw new NotFoundException('Entitlement introuvable.');
    command.capabilityCode = entitlement.capability.code;
    command.scope = entitlement.scope;
    command.clientId = entitlement.clientId ?? undefined;
    command.buildingId = entitlement.buildingId ?? undefined;
    rejectPendingRevision(entitlement.revisions, now);
    const sourceRevision = entitlement.revisions
      .filter((item) => item.effectiveFrom <= now)
      .sort(
        (a, b) =>
          b.effectiveFrom.getTime() - a.effectiveFrom.getTime() ||
          b.versionNumber - a.versionNumber,
      )[0];
    if (!sourceRevision)
      throw new ConflictException('ENTITLEMENT_HAS_NO_APPLICABLE_REVISION');
    if (sourceRevision.lifecycle === 'REVOKED')
      throw new ConflictException('ENTITLEMENT_REVOKED');
    if (
      command.expectedLockVersion !== entitlement.lockVersion ||
      command.expectedRevisionId !== sourceRevision.id
    )
      throw new ConflictException('STALE_ENTITLEMENT_PREVIEW');
    const effectiveFrom =
      command.operation === 'REVOKE' ? now : (command.effectiveFrom ?? now);
    validateEffectiveFrom(effectiveFrom, now);
    let lifecycle: EntitlementLifecycle = sourceRevision.lifecycle;
    let enabled = sourceRevision.enabled;
    let distributable = sourceRevision.distributable;
    if (command.operation === 'ENABLE') {
      if (lifecycle !== 'GRANTED')
        throw new ConflictException('ENABLE_REQUIRES_GRANTED');
      enabled = true;
    } else if (command.operation === 'DISABLE') {
      if (lifecycle !== 'GRANTED')
        throw new ConflictException('DISABLE_REQUIRES_GRANTED');
      enabled = false;
    } else if (command.operation === 'SUSPEND') {
      if (lifecycle !== 'GRANTED')
        throw new ConflictException('SUSPEND_REQUIRES_GRANTED');
      lifecycle = 'SUSPENDED';
    } else if (command.operation === 'RESUME') {
      if (lifecycle !== 'SUSPENDED')
        throw new ConflictException('RESUME_REQUIRES_SUSPENDED');
      lifecycle = 'GRANTED';
    } else if (command.operation === 'REVOKE') lifecycle = 'REVOKED';
    else if (command.operation === 'SET_DISTRIBUTABLE') {
      distributable = command.distributable ?? false;
    }
    let limits = sourceRevision.limits.map((item) => ({
      type: item.type,
      metricCode: item.metricCode,
      unlimited: item.unlimited,
      quantity: item.quantity?.toString() ?? null,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
    }));
    if (command.operation === 'CHANGE_LIMITS')
      if (command.removeAllLimits) limits = [];
      else if (command.limits) limits = command.limits;
      else throw new BadRequestException('COMPLETE_LIMIT_SNAPSHOT_REQUIRED');
    const projectedUntil =
      command.operation === 'CHANGE_DATES'
        ? (command.effectiveUntil ?? null)
        : sourceRevision.effectiveUntil;
    if (entitlement.source === 'CONTRACT')
      await this.validateContractAuthority(tx, {
        organizationId: entitlement.organizationId,
        capabilityId: entitlement.capabilityId,
        sourceContractId: entitlement.sourceContractId,
        sourceContractRevisionId: entitlement.sourceContractRevisionId,
        sourceSnapshotLineId: entitlement.sourceSnapshotLineId,
        enabled,
        distributable,
        effectiveFrom,
        effectiveUntil: projectedUntil,
        limits,
      });
    if (entitlement.source === 'DISTRIBUTION')
      await this.validateParentAuthority(tx, {
        organizationId: entitlement.organizationId,
        capabilityId: entitlement.capabilityId,
        parentEntitlementId: entitlement.parentEntitlementId,
        effectiveFrom,
        effectiveUntil: projectedUntil,
        limits,
      });
    if (
      distributable &&
      (entitlement.scope !== 'ORGANIZATION' ||
        entitlement.organization.commercialRelationship !== 'PARTNER')
    )
      throw new BadRequestException('DISTRIBUTABLE_PARTNER_ORGANIZATION_ONLY');
    const warnings: EntitlementWarning[] = [];
    if (
      ['REVOKE', 'SUSPEND'].includes(command.operation) ||
      (command.operation === 'SET_DISTRIBUTABLE' && !distributable)
    ) {
      if (entitlement.distributedEntitlements.length)
        warnings.push(
          this.warning(
            'CHILD_DISTRIBUTIONS_WILL_BECOME_INVALID',
            entitlement.capability.code,
            entitlement.distributedEntitlements.length,
          ),
        );
    }
    return {
      organization: entitlement.organization,
      capability: entitlement.capability,
      target: {
        scope: entitlement.scope,
        clientId: entitlement.clientId,
        buildingId: entitlement.buildingId,
      },
      entitlement,
      sourceRevision,
      lifecycle,
      enabled,
      distributable,
      effectiveFrom,
      effectiveUntil: projectedUntil,
      limits,
      warnings,
      distributedChildren: {
        total: entitlement.distributedEntitlements.length,
        projectedInvalid: warnings.length
          ? entitlement.distributedEntitlements.length
          : 0,
      },
      partnerCapacity: await this.partnerCapacity(tx, entitlement.id),
    };
  }

  private async createGrant(
    tx: Db,
    command: EntitlementCommand,
    derived: Awaited<ReturnType<EntitlementCommandService['deriveCreation']>>,
    actor: Actor,
  ) {
    if (derived.entitlement)
      return {
        entitlement: derived.entitlement,
        alreadyExists: true,
        alreadyProvisioned: command.source === 'CONTRACT',
      };
    const user = await tx.user.findUniqueOrThrow({
      where: { id: actor.userId },
      select: { firstName: true, lastName: true },
    });
    const displayName = `${user.firstName} ${user.lastName}`.trim();
    const entitlement = await tx.capabilityEntitlement.create({
      data: {
        organizationId: command.organizationId,
        capabilityId: derived.capability.id,
        scope: command.scope!,
        clientId: command.clientId,
        buildingId: command.buildingId,
        source: command.source!,
        parentEntitlementId: command.parentEntitlementId,
        sourceContractId: command.sourceContractId,
        sourceContractRevisionId: command.sourceContractRevisionId,
        sourceSnapshotLineId: command.sourceSnapshotLineId,
        provenanceReason: command.provenanceReason ?? command.reason,
        createdByUserId: actor.userId,
        createdByDisplayName: displayName,
        revisions: {
          create: {
            versionNumber: 1,
            lifecycle: 'GRANTED',
            enabled: derived.enabled,
            distributable: derived.distributable,
            decisionAt: new Date(),
            effectiveFrom: derived.effectiveFrom,
            effectiveUntil: derived.effectiveUntil,
            reason: command.reason,
            createdByUserId: actor.userId,
            createdByDisplayName: displayName,
            limits: { create: this.limitData(derived.limits) },
          },
        },
      },
      include: { revisions: { include: { limits: true } } },
    });
    await this.audit.record(tx, {
      actorUserId: actor.userId,
      action: this.auditAction(command),
      targetType: 'CapabilityEntitlement',
      targetId: entitlement.id,
      organizationId: command.organizationId,
      reason: command.reason,
      afterData: this.auditSnapshot(entitlement, command),
    });
    return {
      entitlement,
      alreadyExists: false,
      alreadyProvisioned: false,
    };
  }

  private async appendRevision(
    tx: Db,
    command: EntitlementCommand,
    derived: Awaited<ReturnType<EntitlementCommandService['deriveTransition']>>,
    actor: Actor,
    now: Date,
  ) {
    const updated = await tx.capabilityEntitlement.updateMany({
      where: {
        id: command.entitlementId,
        organizationId: command.organizationId,
        lockVersion: command.expectedLockVersion,
      },
      data: { lockVersion: { increment: 1 } },
    });
    if (updated.count !== 1)
      throw new ConflictException('STALE_ENTITLEMENT_PREVIEW');
    const maxVersion = Math.max(
      ...derived.entitlement.revisions.map((item) => item.versionNumber),
    );
    const revision = await tx.capabilityEntitlementRevision.create({
      data: {
        entitlementId: command.entitlementId!,
        versionNumber: maxVersion + 1,
        lifecycle: derived.lifecycle,
        enabled: derived.enabled,
        distributable: derived.distributable,
        decisionAt: now,
        effectiveFrom: derived.effectiveFrom,
        effectiveUntil: derived.effectiveUntil,
        reason: command.reason,
        createdByUserId: actor.userId,
        limits: { create: this.limitData(derived.limits) },
      },
      include: { limits: true },
    });
    await this.audit.record(tx, {
      actorUserId: actor.userId,
      action: this.auditAction(command),
      targetType: 'CapabilityEntitlement',
      targetId: command.entitlementId!,
      organizationId: command.organizationId,
      reason: command.reason,
      beforeData: this.revisionSnapshot(derived.sourceRevision),
      afterData: {
        ...this.revisionSnapshot(revision),
        acknowledgedWarningCodes: command.acknowledgedWarningCodes,
      },
    });
    return revision;
  }

  private async validateTenantTarget(tx: Db, command: EntitlementCommand) {
    if (command.clientId) {
      const client = await tx.client.findFirst({
        where: { id: command.clientId, organizationId: command.organizationId },
        select: { id: true },
      });
      if (!client) throw new NotFoundException('Client introuvable.');
    }
    if (command.buildingId) {
      const building = await tx.building.findFirst({
        where: {
          id: command.buildingId,
          organizationId: command.organizationId,
          clientId: command.clientId,
        },
        select: { id: true },
      });
      if (!building) throw new NotFoundException('Site introuvable.');
    }
  }

  private async validateContract(
    tx: Db,
    command: EntitlementCommand,
    capabilityId: string,
  ) {
    const line = await tx.contractPriceSnapshotLine.findFirst({
      where: {
        id: command.sourceSnapshotLineId,
        contractRevisionId: command.sourceContractRevisionId,
        capabilityId,
        contractRevision: {
          id: command.sourceContractRevisionId,
          contractId: command.sourceContractId,
          status: 'SIGNED',
          contract: {
            id: command.sourceContractId,
            organizationId: command.organizationId,
            status: { notIn: ['CANCELLED', 'TERMINATED', 'EXPIRED'] },
          },
        },
      },
      include: { contractRevision: true },
    });
    if (!line) throw new BadRequestException('CONTRACT_PROVENANCE_INVALID');
    const from = command.effectiveFrom!;
    const until = command.effectiveUntil ?? null;
    if (
      from < line.contractRevision.effectiveFrom ||
      (line.contractRevision.effectiveUntil &&
        (!until || until > line.contractRevision.effectiveUntil))
    )
      throw new BadRequestException('CONTRACT_DATES_EXCEEDED');
    return line;
  }

  private contractLimit(line: {
    distributionLimit: Prisma.Decimal | null;
    distributionMetric: string | null;
  }): NormalizedLimit | null {
    const type =
      line.distributionMetric === 'SITE'
        ? 'SITES'
        : line.distributionMetric === 'CLIENT'
          ? 'CLIENTS'
          : null;
    if (!type || !line.distributionLimit) return null;
    return {
      type,
      metricCode: 'DEFAULT',
      unlimited: false,
      quantity: line.distributionLimit.toString(),
      periodStart: null,
      periodEnd: null,
    };
  }

  private validateContractLimits(
    limits: NormalizedLimit[],
    authority: NormalizedLimit | null,
  ) {
    if (!authority) {
      if (!limits.length) return;
      throw new BadRequestException('CONTRACT_LIMIT_NOT_COMPARABLE');
    }
    if (limits.length !== 1)
      throw new BadRequestException('CONTRACT_LIMIT_EXCEEDED');
    this.validateLimitsWithinAuthority(
      limits,
      [authority],
      'CONTRACT_LIMIT_EXCEEDED',
    );
  }

  private async validateContractAuthority(
    tx: Db,
    input: {
      organizationId: string;
      capabilityId: string;
      sourceContractId: string | null;
      sourceContractRevisionId: string | null;
      sourceSnapshotLineId: string | null;
      enabled: boolean;
      distributable: boolean;
      effectiveFrom: Date;
      effectiveUntil: Date | null;
      limits: NormalizedLimit[];
    },
  ) {
    if (
      !input.sourceContractId ||
      !input.sourceContractRevisionId ||
      !input.sourceSnapshotLineId
    )
      throw new BadRequestException('CONTRACT_PROVENANCE_INVALID');
    const line = await tx.contractPriceSnapshotLine.findFirst({
      where: {
        id: input.sourceSnapshotLineId,
        contractRevisionId: input.sourceContractRevisionId,
        capabilityId: input.capabilityId,
        contractRevision: {
          id: input.sourceContractRevisionId,
          contractId: input.sourceContractId,
          status: 'SIGNED',
          contract: {
            id: input.sourceContractId,
            organizationId: input.organizationId,
            status: { notIn: ['CANCELLED', 'TERMINATED', 'EXPIRED'] },
          },
        },
      },
      include: { contractRevision: true },
    });
    if (!line) throw new BadRequestException('CONTRACT_PROVENANCE_INVALID');
    if (input.enabled && line.internalUse !== true)
      throw new BadRequestException('CONTRACT_INTERNAL_USE_EXCEEDED');
    if (input.distributable && line.distributable !== true)
      throw new BadRequestException('CONTRACT_DISTRIBUTION_EXCEEDED');
    this.validateAuthorityDates(
      input.effectiveFrom,
      input.effectiveUntil,
      line.contractRevision.effectiveFrom,
      line.contractRevision.effectiveUntil,
      'CONTRACT_DATES_EXCEEDED',
    );
    this.validateContractLimits(input.limits, this.contractLimit(line));
  }

  private async validateDistributionParent(
    tx: Db,
    command: EntitlementCommand,
    capabilityId: string,
    at: Date,
  ) {
    return this.validateParentAuthority(tx, {
      organizationId: command.organizationId,
      capabilityId,
      parentEntitlementId: command.parentEntitlementId,
      effectiveFrom: at,
      effectiveUntil: command.effectiveUntil ?? null,
      limits: command.limits ?? [],
    });
  }

  private async validateParentAuthority(
    tx: Db,
    input: {
      organizationId: string;
      capabilityId: string;
      parentEntitlementId: string | null | undefined;
      effectiveFrom: Date;
      effectiveUntil: Date | null;
      limits: NormalizedLimit[];
    },
  ) {
    const parentId = input.parentEntitlementId;
    if (!parentId) throw new BadRequestException('DISTRIBUTION_PARENT_INVALID');
    const parent = await tx.capabilityEntitlement.findFirst({
      where: {
        id: parentId,
        organizationId: input.organizationId,
        capabilityId: input.capabilityId,
        scope: 'ORGANIZATION',
        organization: { commercialRelationship: 'PARTNER' },
      },
      include: {
        revisions: {
          where: { effectiveFrom: { lte: input.effectiveFrom } },
          orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
          take: 1,
          include: { limits: true },
        },
      },
    });
    const revision = parent?.revisions[0];
    if (
      !revision ||
      revision.lifecycle !== 'GRANTED' ||
      !revision.distributable ||
      (revision.effectiveUntil &&
        revision.effectiveUntil <= input.effectiveFrom)
    )
      throw new BadRequestException('DISTRIBUTION_PARENT_INVALID');
    this.validateAuthorityDates(
      input.effectiveFrom,
      input.effectiveUntil,
      revision.effectiveFrom,
      revision.effectiveUntil,
      'DISTRIBUTION_DATES_EXCEED_PARENT',
    );
    this.validateLimitsWithinAuthority(
      input.limits,
      revision.limits.map((item) => ({
        type: item.type,
        metricCode: item.metricCode,
        unlimited: item.unlimited,
        quantity: item.quantity?.toString() ?? null,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
      })),
      'DISTRIBUTION_LIMIT_EXCEEDED',
    );
    return parent;
  }

  private validateAuthorityDates(
    effectiveFrom: Date,
    effectiveUntil: Date | null,
    authorityFrom: Date,
    authorityUntil: Date | null,
    errorCode: string,
  ) {
    if (
      effectiveFrom < authorityFrom ||
      (authorityUntil && (!effectiveUntil || effectiveUntil > authorityUntil))
    )
      throw new BadRequestException(errorCode);
  }

  private validateLimitsWithinAuthority(
    limits: NormalizedLimit[],
    authority: NormalizedLimit[],
    errorCode: string,
  ) {
    if (!authority.length) return;
    const authorityByIdentity = new Map(
      authority.map((item) => [`${item.type}:${item.metricCode}`, item]),
    );
    const limitsByIdentity = new Map(
      limits.map((item) => [`${item.type}:${item.metricCode}`, item]),
    );
    for (const limit of limits) {
      const permitted = authorityByIdentity.get(
        `${limit.type}:${limit.metricCode}`,
      );
      if (!permitted) throw new BadRequestException(errorCode);
      if (
        !permitted.unlimited &&
        (limit.unlimited ||
          limit.quantity == null ||
          permitted.quantity == null ||
          new Prisma.Decimal(limit.quantity).greaterThan(
            new Prisma.Decimal(permitted.quantity),
          ))
      )
        throw new BadRequestException(errorCode);
    }
    for (const permitted of authority) {
      if (permitted.unlimited) continue;
      const limit = limitsByIdentity.get(
        `${permitted.type}:${permitted.metricCode}`,
      );
      if (!limit || limit.unlimited || limit.quantity == null)
        throw new BadRequestException(errorCode);
    }
  }

  private validateIdempotentCreation(
    existing: ExistingGrant,
    command: EntitlementCommand,
    capabilityId: string,
    enabled: boolean,
    distributable: boolean,
    effectiveFrom: Date,
    effectiveUntil: Date | null,
    limits: NormalizedLimit[],
  ) {
    const initial = existing.revisions[0];
    const sameProvenance =
      existing.capabilityId === capabilityId &&
      existing.source === command.source &&
      existing.parentEntitlementId === (command.parentEntitlementId ?? null) &&
      existing.sourceContractId === (command.sourceContractId ?? null) &&
      existing.sourceContractRevisionId ===
        (command.sourceContractRevisionId ?? null) &&
      existing.sourceSnapshotLineId === (command.sourceSnapshotLineId ?? null);
    const sameRevision =
      initial?.lifecycle === 'GRANTED' &&
      initial.enabled === enabled &&
      initial.distributable === distributable &&
      initial.effectiveFrom.getTime() === effectiveFrom.getTime() &&
      (initial.effectiveUntil?.getTime() ?? null) ===
        (effectiveUntil?.getTime() ?? null) &&
      this.limitSignatures(
        initial.limits.map((item) => ({
          type: item.type,
          metricCode: item.metricCode,
          unlimited: item.unlimited,
          quantity: item.quantity?.toString() ?? null,
          periodStart: item.periodStart,
          periodEnd: item.periodEnd,
        })),
      ) === this.limitSignatures(limits);
    if (!sameProvenance || !sameRevision)
      throw new ConflictException('IDEMPOTENT_COMMAND_CONFLICT');
  }

  private limitSignatures(limits: NormalizedLimit[]) {
    return limits
      .map((item) =>
        [
          item.type,
          item.metricCode,
          item.unlimited ? '1' : '0',
          item.quantity == null
            ? ''
            : new Prisma.Decimal(item.quantity).toFixed(),
          item.periodStart?.toISOString() ?? '',
          item.periodEnd?.toISOString() ?? '',
        ].join('|'),
      )
      .sort()
      .join('||');
  }

  private async partnerCapacity(tx: Db, parentId?: string) {
    if (!parentId)
      return {
        status: 'NOT_AVAILABLE',
        metric: null,
        limit: null,
        consumed: null,
        remaining: null,
        reasonCode: 'NO_DISTRIBUTION_PARENT',
        warning: null,
        billable: false,
        enforcement: 'NONE',
      };
    const now = new Date();
    const parent = await tx.capabilityEntitlement.findUnique({
      where: { id: parentId },
      include: {
        revisions: {
          where: { effectiveFrom: { lte: now } },
          orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
          take: 1,
          include: { limits: true },
        },
        distributedEntitlements: {
          include: {
            revisions: {
              where: { effectiveFrom: { lte: now } },
              orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
              take: 1,
            },
          },
        },
      },
    });
    const comparable = parent?.revisions[0]?.limits.filter(
      (item) =>
        ['SITES', 'CLIENTS'].includes(item.type) &&
        item.metricCode === 'DEFAULT' &&
        !item.unlimited &&
        item.quantity,
    );
    if (
      !parent ||
      comparable?.length !== 1 ||
      (comparable[0].periodStart && comparable[0].periodStart > now) ||
      (comparable[0].periodEnd && comparable[0].periodEnd <= now)
    )
      return {
        status: 'NOT_AVAILABLE',
        metric: null,
        limit: null,
        consumed: null,
        remaining: null,
        reasonCode: 'AMBIGUOUS_OR_UNSUPPORTED_LIMIT',
        warning: 'Partner capacity cannot be calculated exactly.',
        billable: false,
        enforcement: 'NONE',
      };
    const limit = comparable[0];
    const targets = new Set(
      parent.distributedEntitlements
        .filter((item) => {
          const revision = item.revisions[0];
          return (
            revision?.lifecycle === 'GRANTED' &&
            (!revision.effectiveUntil || revision.effectiveUntil > now)
          );
        })
        .map((item) =>
          limit.type === 'SITES' ? item.buildingId : item.clientId,
        )
        .filter(Boolean),
    );
    const consumed = new Prisma.Decimal(targets.size);
    return {
      status: 'EXACT',
      metric: limit.type,
      limit: limit.quantity!.toString(),
      consumed: consumed.toString(),
      remaining: Prisma.Decimal.max(
        new Prisma.Decimal(0),
        limit.quantity!.minus(consumed),
      ).toString(),
      reasonCode: null,
      warning: consumed.greaterThan(limit.quantity!)
        ? 'Partner capacity is exceeded; enforcement remains NONE.'
        : null,
      billable: false,
      enforcement: 'NONE',
    };
  }

  private creationWarnings(
    command: EntitlementCommand,
    relationship: string | null,
  ): EntitlementWarning[] {
    return command.source === 'TRIAL' && relationship == null
      ? [this.warning('NULL_RELATIONSHIP_TRIAL', command.capabilityCode!, true)]
      : [];
  }

  private operationalWarningsFromResult(
    capabilityCode: string,
    observed: Awaited<
      ReturnType<CapabilityObservationService['observeOrganization']>
    >,
  ): EntitlementWarning[] {
    const value = observed[capabilityCode as keyof typeof observed];
    if (!value?.observed.value) return [];
    const code =
      capabilityCode === 'SENTINELLE' ? 'SENTINELLE_ACTIVITY_OBSERVED' : null;
    return code
      ? [this.warning(code, capabilityCode, value.observed.value)]
      : [];
  }

  private warning(
    code: string,
    capabilityCode: string,
    observedValue: unknown,
  ): EntitlementWarning {
    return {
      code,
      severity: 'WARNING',
      quality: 'INFERRED',
      capabilityCode,
      message: code,
      observedValue,
      source: 'COMMERCIAL_ENTITLEMENT',
      blocking: false,
      acknowledgementRequired: true,
    };
  }

  private validateAcknowledgements(
    command: EntitlementCommand,
    warnings: EntitlementWarning[],
  ) {
    const missing = warnings
      .filter((item) => item.acknowledgementRequired)
      .map((item) => item.code)
      .filter((code) => !command.acknowledgedWarningCodes.includes(code));
    if (missing.length)
      throw new BadRequestException(
        `ENTITLEMENT_WARNINGS_NOT_ACKNOWLEDGED: ${missing.join(',')}`,
      );
  }

  private limitData(limits: NormalizedLimit[]) {
    return limits.map((item) => ({
      type: item.type,
      metricCode: item.metricCode,
      unlimited: item.unlimited,
      quantity:
        item.quantity == null ? null : new Prisma.Decimal(item.quantity),
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
    }));
  }

  private auditAction(command: EntitlementCommand) {
    const actions: Record<EntitlementOperation, string> = {
      CREATE_GRANT: 'ENTITLEMENT_CREATED',
      PROVISION_CONTRACT: 'ENTITLEMENT_PROVISIONED_FROM_CONTRACT',
      DISTRIBUTE: 'ENTITLEMENT_DISTRIBUTED',
      ENABLE: 'ENTITLEMENT_ENABLED',
      DISABLE: 'ENTITLEMENT_DISABLED',
      SET_DISTRIBUTABLE: 'ENTITLEMENT_DISTRIBUTABLE_ENABLED',
      CHANGE_LIMITS: 'ENTITLEMENT_LIMIT_CHANGED',
      CHANGE_DATES: 'ENTITLEMENT_DATES_CHANGED',
      SUSPEND: 'ENTITLEMENT_SUSPENDED',
      RESUME: 'ENTITLEMENT_RESUMED',
      REVOKE: 'ENTITLEMENT_REVOKED',
      CREATE_TRIAL: 'ENTITLEMENT_TRIAL_CREATED',
      CREATE_MANUAL_OVERRIDE: 'ENTITLEMENT_OVERRIDE_CREATED',
      CREATE_INTERNAL: 'ENTITLEMENT_INTERNAL_CREATED',
    };
    if (command.operation === 'SET_DISTRIBUTABLE')
      return command.distributable
        ? 'ENTITLEMENT_DISTRIBUTABLE_ENABLED'
        : 'ENTITLEMENT_DISTRIBUTABLE_DISABLED';
    return actions[command.operation];
  }

  private revisionSnapshot(revision: RevisionWithLimits) {
    return {
      id: revision.id,
      versionNumber: revision.versionNumber,
      lifecycle: revision.lifecycle,
      enabled: revision.enabled,
      distributable: revision.distributable,
      effectiveFrom: revision.effectiveFrom.toISOString(),
      effectiveUntil: revision.effectiveUntil?.toISOString() ?? null,
      limits: revision.limits.map((item) => ({
        type: item.type,
        metricCode: item.metricCode,
        unlimited: item.unlimited,
        quantity: item.quantity?.toString() ?? null,
      })),
    };
  }

  private auditSnapshot(
    entitlement: {
      id: string;
      source: EntitlementSource;
      scope: CommercialScope;
    },
    command: EntitlementCommand,
  ) {
    return {
      id: entitlement.id,
      source: entitlement.source,
      scope: entitlement.scope,
      capabilityCode: command.capabilityCode,
      acknowledgedWarningCodes: command.acknowledgedWarningCodes,
    };
  }

  private resolveCommand(command: EntitlementCommand) {
    if (!command.capabilityCode)
      return Promise.resolve({
        licensed: false,
        enabled: false,
        distributable: false,
        contributingGrants: [],
      });
    return this.resolver.resolve({
      organizationId: command.organizationId,
      capabilityCode: command.capabilityCode as CapabilityCode,
      clientId: command.clientId,
      buildingId: command.buildingId,
    });
  }

  private project(
    current: {
      licensed: boolean;
      enabled: boolean;
      distributable: boolean;
      grants?: Array<{
        id: string;
        effectiveState: string;
        revision?: { enabled: boolean; distributable: boolean } | null;
      }>;
    },
    targetGrantId: string | undefined,
    lifecycle: EntitlementLifecycle,
    enabled: boolean,
    distributable: boolean,
  ) {
    const otherEffective =
      current.grants?.filter(
        (grant) =>
          grant.id !== targetGrantId && grant.effectiveState === 'EFFECTIVE',
      ) ?? [];
    const contributes = lifecycle === 'GRANTED';
    return {
      ...current,
      licensed: contributes || otherEffective.length > 0,
      enabled:
        (contributes && enabled) ||
        otherEffective.some((grant) => grant.revision?.enabled),
      distributable:
        (contributes && distributable) ||
        otherEffective.some((grant) => grant.revision?.distributable),
      projectedFromCommercialMutationOnly: true,
    };
  }
}
