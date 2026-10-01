import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractRevisionStatus,
  OrganizationContractStatus,
  Prisma,
} from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as crypto from 'crypto';
import {
  AdjustmentDto,
  CommitmentDto,
  ContractDocumentDto,
  ExclusivityDto,
} from './organization-contract-children.dto';
import {
  ContractReasonDto,
  CreateContractDto,
  CreateRevisionDto,
  SignRevisionDto,
  UpdateContractDto,
} from './organization-contracts.dto';
import {
  CommercialBindingError,
  PRODUCTION_COMMERCIAL_RULE_REGISTRY,
  validateCommercialQuantityBinding,
} from '../commercial-proposals/commercial-rule-registry';
type Actor = { userId: string };
const detail = {
  organization: true,
  revisions: {
    include: {
      priceBookVersion: { include: { priceBook: true } },
      adjustments: true,
      priceLines: { include: { tiers: true, capability: true } },
      exclusivities: {
        include: {
          sectors: true,
          capabilities: { include: { capability: true } },
          economicSnapshotLine: true,
        },
      },
      commitments: true,
      documents: true,
    },
    orderBy: { revisionNumber: 'desc' as const },
  },
  documents: true,
};
@Injectable()
export class OrganizationContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly storage: StorageService,
  ) {}
  private json(v: unknown) {
    return JSON.parse(
      JSON.stringify(v, (_k: string, x: unknown) =>
        typeof x === 'bigint' ? x.toString() : x,
      ),
    ) as Prisma.InputJsonValue;
  }
  private serialize<T>(v: T): T {
    return JSON.parse(
      JSON.stringify(v, (_k: string, x: unknown) =>
        typeof x === 'bigint' ? x.toString() : x,
      ),
    ) as T;
  }
  private reason(v: string) {
    return this.audit.normalizeReason(v, true)!;
  }
  private validatePriceLineBinding(line: {
    source: 'CATALOG_COMPONENT' | 'CUSTOM_COMPONENT' | 'EXCLUSIVITY_FEE';
    capabilityId: string | null;
    capability: { code: import('@prisma/client').CapabilityCode } | null;
    commercialQuantityBasis:
      | import('@prisma/client').CommercialQuantityBasis
      | null;
    commercialRuleCode: string | null;
    commercialRuleVersion: string | null;
  }) {
    try {
      validateCommercialQuantityBinding(
        { ...line, capabilityCode: line.capability?.code },
        PRODUCTION_COMMERCIAL_RULE_REGISTRY,
        { requireExplicit: true, requireCurrentRule: true },
      );
    } catch (error) {
      if (error instanceof CommercialBindingError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }
  private async owned(
    tx: Prisma.TransactionClient,
    organizationId: string,
    id: string,
  ) {
    const c = await tx.organizationContract.findFirst({
      where: { id, organizationId },
      include: detail,
    });
    if (!c) throw new NotFoundException('Contrat introuvable.');
    return c;
  }
  list(organizationId: string) {
    return this.prisma.organizationContract
      .findMany({
        where: { organizationId },
        include: detail,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      })
      .then((v) => this.serialize(v));
  }
  async current(organizationId: string) {
    const c = await this.prisma.organizationContract.findFirst({
      where: { organizationId, isPrimary: true, status: 'ACTIVE' },
      include: detail,
    });
    return c ? this.serialize(c) : null;
  }
  async get(organizationId: string, id: string) {
    return this.serialize(await this.owned(this.prisma, organizationId, id));
  }
  async create(organizationId: string, dto: CreateContractDto, actor: Actor) {
    const from = new Date(dto.effectiveFrom),
      until = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
      start = new Date(dto.termStartAt),
      end = dto.termEndAt ? new Date(dto.termEndAt) : null;
    if ((until && until <= from) || (end && end <= start))
      throw new BadRequestException('Période invalide.');
    return this.prisma.$transaction(async (tx) => {
      const [org, pbv, user] = await Promise.all([
        tx.organization.findUnique({ where: { id: organizationId } }),
        tx.priceBookVersion.findUnique({
          where: { id: dto.priceBookVersionId },
          include: { priceBook: true },
        }),
        tx.user.findUnique({ where: { id: actor.userId } }),
      ]);
      if (!org) throw new NotFoundException('Organisation introuvable.');
      if (!pbv) throw new NotFoundException('Version tarifaire introuvable.');
      const contract = await tx.organizationContract.create({
        data: {
          organizationId,
          reference: dto.reference,
          title: dto.title,
          isPrimary: dto.isPrimary,
          createdByUserId: actor.userId,
          createdByDisplayName: user
            ? `${user.firstName} ${user.lastName}`.trim()
            : null,
          revisions: {
            create: {
              revisionNumber: 1,
              revisionType: 'INITIAL',
              priceBookVersionId: pbv.id,
              currency: pbv.priceBook.currency,
              effectiveFrom: from,
              effectiveUntil: until,
              termStartAt: start,
              termEndAt: end,
              renewalMode: dto.renewalMode,
              renewalTermMonths: dto.renewalTermMonths,
              renewalNoticeDays: dto.renewalNoticeDays,
              renewalTerms: dto.renewalTerms,
              billingCadence: dto.billingCadence,
              createdByUserId: actor.userId,
            },
          },
        },
        include: detail,
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CONTRACT_CREATED',
        targetType: 'OrganizationContract',
        targetId: contract.id,
        targetLabel: contract.reference,
        organizationId,
        afterData: this.json({
          reference: contract.reference,
          title: contract.title,
          status: contract.status,
        }),
      });
      return this.serialize(contract);
    });
  }
  async update(o: string, id: string, d: UpdateContractDto, a: Actor) {
    const reason = this.reason(d.reason);
    return this.prisma.$transaction(async (tx) => {
      const before = await this.owned(tx, o, id);
      if (!['DRAFT', 'ACTIVE'].includes(before.status))
        throw new BadRequestException(
          'Modification non permise dans ce statut.',
        );
      const internalOnly =
        before.status === 'ACTIVE' &&
        d.title === undefined &&
        d.isPrimary === undefined;
      if (before.status === 'ACTIVE' && !internalOnly)
        throw new BadRequestException(
          'Seules les notes internes sont modifiables sur un contrat actif.',
        );
      const result = await tx.organizationContract.updateMany({
        where: { id, organizationId: o, lockVersion: d.lockVersion },
        data: {
          title: d.title,
          isPrimary: d.isPrimary,
          internalNotes: d.internalNotes,
          lockVersion: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException('Conflit de version.');
      const after = await this.owned(tx, o, id);
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: internalOnly
          ? 'CONTRACT_INTERNAL_NOTES_UPDATED'
          : 'CONTRACT_DRAFT_UPDATED',
        targetType: 'OrganizationContract',
        targetId: id,
        targetLabel: after.reference,
        organizationId: o,
        reason,
        beforeData: this.json({
          title: before.title,
          isPrimary: before.isPrimary,
        }),
        afterData: this.json({
          title: after.title,
          isPrimary: after.isPrimary,
        }),
      });
      return this.serialize(after);
    });
  }
  async contractTransition(
    o: string,
    id: string,
    action: string,
    d: ContractReasonDto,
    a: Actor,
  ) {
    const reason = this.reason(d.reason);
    const rules: Record<
      string,
      {
        from: OrganizationContractStatus[];
        to: OrganizationContractStatus;
        audit: string;
      }
    > = {
      approve: {
        from: ['DRAFT'],
        to: 'APPROVED',
        audit: 'CONTRACT_APPROVED',
      },
      activate: {
        from: ['SCHEDULED'],
        to: 'ACTIVE',
        audit: 'CONTRACT_ACTIVATED',
      },
      cancel: {
        from: ['DRAFT', 'APPROVED', 'SCHEDULED'],
        to: 'CANCELLED',
        audit: 'CONTRACT_CANCELLED',
      },
      terminate: {
        from: ['ACTIVE'],
        to: 'TERMINATED',
        audit: 'CONTRACT_TERMINATED',
      },
      expire: {
        from: ['ACTIVE'],
        to: 'EXPIRED',
        audit: 'CONTRACT_EXPIRED',
      },
    };
    const r = rules[action];
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${o}, 0))`;
        const before = await this.owned(tx, o, id);
        if (!r.from.includes(before.status))
          throw new BadRequestException('Transition de contrat invalide.');
        if (
          action === 'activate' &&
          !before.revisions.some(
            (x) =>
              x.status === 'SIGNED' &&
              x.effectiveFrom <= new Date() &&
              (!x.effectiveUntil || x.effectiveUntil > new Date()),
          )
        )
          throw new BadRequestException('Aucune révision signée applicable.');
        const timestampData: Prisma.OrganizationContractUpdateManyMutationInput =
          action === 'approve'
            ? { approvedAt: new Date() }
            : action === 'activate'
              ? { activatedAt: new Date() }
              : action === 'cancel'
                ? { cancelledAt: new Date() }
                : action === 'terminate'
                  ? { terminatedAt: new Date() }
                  : { expiredAt: new Date() };
        const data: Prisma.OrganizationContractUpdateManyMutationInput = {
          status: r.to,
          lifecycleReason: reason,
          lockVersion: { increment: 1 },
          ...timestampData,
        };
        const res = await tx.organizationContract.updateMany({
          where: { id, organizationId: o, lockVersion: d.lockVersion },
          data,
        });
        if (res.count !== 1) throw new ConflictException('Conflit de version.');
        const after = await this.owned(tx, o, id);
        await this.audit.record(tx, {
          actorUserId: a.userId,
          action: r.audit,
          targetType: 'OrganizationContract',
          targetId: id,
          targetLabel: after.reference,
          organizationId: o,
          reason,
          beforeData: this.json({ status: before.status }),
          afterData: this.json({ status: after.status }),
        });
        return this.serialize(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async createRevision(o: string, id: string, d: CreateRevisionDto, a: Actor) {
    if (!['AMENDMENT', 'RENEWAL'].includes(d.revisionType))
      throw new BadRequestException('Type de révision invalide.');
    const reason = this.reason(d.reason);
    return this.prisma.$transaction(async (tx) => {
      const c = await this.owned(tx, o, id);
      const base = c.revisions.find(
        (x) => x.id === d.basedOnRevisionId && x.status === 'SIGNED',
      );
      if (!base)
        throw new BadRequestException('Révision source signée introuvable.');
      const max = Math.max(...c.revisions.map((x) => x.revisionNumber));
      const revision = await tx.organizationContractRevision.create({
        data: {
          contractId: id,
          revisionNumber: max + 1,
          revisionType: d.revisionType,
          basedOnRevisionId: base.id,
          priceBookVersionId: d.priceBookVersionId ?? base.priceBookVersionId,
          currency: base.currency,
          effectiveFrom: new Date(d.effectiveFrom),
          effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
          termStartAt: new Date(d.termStartAt),
          termEndAt: d.termEndAt ? new Date(d.termEndAt) : null,
          renewalMode: d.renewalMode,
          renewalTermMonths: d.renewalTermMonths,
          renewalNoticeDays: d.renewalNoticeDays,
          renewalTerms: d.renewalTerms,
          billingCadence: d.billingCadence,
          justification: reason,
          createdByUserId: a.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_AMENDMENT_CREATED',
        targetType: 'OrganizationContractRevision',
        targetId: revision.id,
        targetLabel: c.reference,
        organizationId: o,
        reason,
        afterData: this.json({
          revisionNumber: revision.revisionNumber,
          revisionType: revision.revisionType,
        }),
      });
      return revision;
    });
  }
  async revisionTransition(
    o: string,
    cid: string,
    rid: string,
    action: string,
    d: ContractReasonDto,
    a: Actor,
  ) {
    const reason = this.reason(d.reason);
    const rules: Record<
      string,
      {
        from: ContractRevisionStatus[];
        to: ContractRevisionStatus;
        audit: string;
      }
    > = {
      approve: { from: ['DRAFT'], to: 'APPROVED', audit: 'CONTRACT_APPROVED' },
      reopen: { from: ['APPROVED'], to: 'DRAFT', audit: 'CONTRACT_REOPENED' },
      cancel: {
        from: ['DRAFT', 'APPROVED'],
        to: 'CANCELLED',
        audit: 'CONTRACT_CANCELLED',
      },
    };
    const rule = rules[action];
    return this.prisma.$transaction(async (tx) => {
      await this.owned(tx, o, cid);
      const rev = await tx.organizationContractRevision.findFirst({
        where: { id: rid, contractId: cid },
        include: {
          priceLines: { include: { capability: true } },
          priceBookVersion: {
            select: { components: { select: { id: true } } },
          },
          adjustments: true,
        },
      });
      if (!rev || !rule.from.includes(rev.status))
        throw new BadRequestException('Transition de révision invalide.');
      if (rule.to === 'APPROVED') {
        if (
          rev.priceLines.length === 0 &&
          (rev.priceBookVersion.components.length > 0 ||
            rev.adjustments.some((item) => item.scope === 'CUSTOM_COMPONENT'))
        )
          throw new BadRequestException(
            'Applicable commercial lines require an explicit quantity binding; use a finalized Proposal.',
          );
        rev.priceLines.forEach((line) => this.validatePriceLineBinding(line));
      }
      const res = await tx.organizationContractRevision.updateMany({
        where: { id: rid, lockVersion: d.lockVersion },
        data: {
          status: rule.to,
          approvedAt:
            rule.to === 'APPROVED'
              ? new Date()
              : rule.to === 'DRAFT'
                ? null
                : undefined,
          lockVersion: { increment: 1 },
        },
      });
      if (res.count !== 1) throw new ConflictException('Conflit de version.');
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: rule.audit,
        targetType: 'OrganizationContractRevision',
        targetId: rid,
        organizationId: o,
        reason,
        beforeData: this.json({ status: rev.status }),
        afterData: this.json({ status: rule.to }),
      });
      return tx.organizationContractRevision.findUnique({ where: { id: rid } });
    });
  }
  private async draftRevision(
    tx: Prisma.TransactionClient,
    o: string,
    c: string,
    v: string,
  ) {
    await this.owned(tx, o, c);
    const r = await tx.organizationContractRevision.findFirst({
      where: { id: v, contractId: c },
    });
    if (!r) throw new NotFoundException('Révision introuvable.');
    if (r.status !== 'DRAFT')
      throw new BadRequestException('La révision doit être DRAFT.');
    return r;
  }
  async listAdjustments(o: string, c: string, v: string) {
    await this.draftRevision(this.prisma, o, c, v);
    return this.serialize(
      await this.prisma.contractPricingAdjustment.findMany({
        where: { contractRevisionId: v },
        orderBy: { displayOrder: 'asc' },
      }),
    );
  }
  private adjustmentData(v: string, d: AdjustmentDto) {
    return {
      contractRevisionId: v,
      scope: d.scope,
      adjustmentType: d.adjustmentType,
      sourcePriceComponentId: d.sourcePriceComponentId,
      capabilityId: d.capabilityId,
      code: d.code,
      label: d.label,
      discountBasisPoints: d.discountBasisPoints,
      overrideAmountMinor: d.overrideAmountMinor
        ? BigInt(d.overrideAmountMinor)
        : undefined,
      justification: d.justification,
      displayOrder: d.displayOrder,
    };
  }
  async createAdjustment(
    o: string,
    c: string,
    v: string,
    d: AdjustmentDto,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draftRevision(tx, o, c, v);
      const x = await tx.contractPricingAdjustment.create({
        data: this.adjustmentData(v, d),
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractPricingAdjustment',
        targetId: x.id,
        organizationId: o,
        reason: this.reason(d.justification),
        afterData: this.json(x),
      });
      return this.serialize(x);
    });
  }
  async updateAdjustment(
    o: string,
    c: string,
    v: string,
    id: string,
    d: AdjustmentDto,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draftRevision(tx, o, c, v);
      const before = await tx.contractPricingAdjustment.findFirst({
        where: { id, contractRevisionId: v },
      });
      if (!before) throw new NotFoundException('Adjustment introuvable.');
      const x = await tx.contractPricingAdjustment.update({
        where: { id },
        data: this.adjustmentData(v, d),
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractPricingAdjustment',
        targetId: id,
        organizationId: o,
        reason: this.reason(d.justification),
        beforeData: this.json(before),
        afterData: this.json(x),
      });
      return this.serialize(x);
    });
  }
  async removeAdjustment(
    o: string,
    c: string,
    v: string,
    id: string,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draftRevision(tx, o, c, v);
      const before = await tx.contractPricingAdjustment.findFirst({
        where: { id, contractRevisionId: v },
      });
      if (!before) throw new NotFoundException('Adjustment introuvable.');
      await tx.contractPricingAdjustment.delete({ where: { id } });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractPricingAdjustment',
        targetId: id,
        organizationId: o,
        reason: 'Retrait avant signature',
        beforeData: this.json(before),
      });
      return { removed: true };
    });
  }
  async listExclusivities(o: string, c: string, v: string) {
    await this.draftRevision(this.prisma, o, c, v);
    return this.serialize(
      await this.prisma.contractExclusivity.findMany({
        where: { contractRevisionId: v },
        include: {
          sectors: true,
          capabilities: true,
          economicSnapshotLine: true,
        },
      }),
    );
  }
  private territory(d: ExclusivityDto) {
    if (
      d.territoryType === 'ISO_COUNTRY' &&
      !/^[A-Z]{2}$/.test(d.territoryCode ?? '')
    )
      throw new BadRequestException('Code ISO 3166-1 invalide.');
    if (
      d.territoryType === 'ISO_SUBDIVISION' &&
      !/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(d.territoryCode ?? '')
    )
      throw new BadRequestException('Code ISO 3166-2 invalide.');
    const start = new Date(d.startsAt),
      end = d.endsAt ? new Date(d.endsAt) : null;
    if (end && end <= start) throw new BadRequestException('Période invalide.');
    return { start, end };
  }
  async createExclusivity(
    o: string,
    c: string,
    v: string,
    d: ExclusivityDto,
    a: Actor,
  ) {
    const { start, end } = this.territory(d);
    return this.prisma.$transaction(async (tx) => {
      const r = await this.draftRevision(tx, o, c, v);
      const id = crypto.randomUUID();
      let lineId: string | undefined;
      if (d.economicAmountMinor !== undefined) {
        const line = await tx.contractPriceSnapshotLine.create({
          data: {
            contractRevisionId: v,
            source: 'EXCLUSIVITY_FEE',
            componentCode: `EXCLUSIVITY_FEE_${id}`,
            componentName: `Frais d'exclusivité — ${d.territoryLabel}`,
            pricingModel: 'CUSTOM',
            chargeType: 'ONE_TIME',
            currency: r.currency,
            contractAmountMinor: BigInt(d.economicAmountMinor),
            displayOrder: 100000,
          },
        });
        lineId = line.id;
      }
      const x = await tx.contractExclusivity.create({
        data: {
          id,
          contractRevisionId: v,
          territoryType: d.territoryType,
          territoryCode: d.territoryCode,
          territoryLabel: d.territoryLabel,
          startsAt: start,
          endsAt: end,
          hasEconomicImpact: !!lineId,
          economicSnapshotLineId: lineId,
          conditions: d.conditions,
          renewalTerms: d.renewalTerms,
          sectors: { create: d.sectors },
          capabilities: {
            create: d.capabilityIds.map((capabilityId) => ({ capabilityId })),
          },
        },
        include: {
          sectors: true,
          capabilities: true,
          economicSnapshotLine: true,
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractExclusivity',
        targetId: id,
        organizationId: o,
        reason: 'Configuration exclusivité',
        afterData: this.json(x),
      });
      return this.serialize(x);
    });
  }
  async updateExclusivity(
    o: string,
    c: string,
    v: string,
    id: string,
    d: ExclusivityDto,
    a: Actor,
  ) {
    const { start, end } = this.territory(d);
    return this.prisma.$transaction(async (tx) => {
      const r = await this.draftRevision(tx, o, c, v);
      const before = await tx.contractExclusivity.findFirst({
        where: { id, contractRevisionId: v },
        include: { economicSnapshotLine: true },
      });
      if (!before) throw new NotFoundException('Exclusivité introuvable.');
      let lineId = before.economicSnapshotLineId;
      if (d.economicAmountMinor !== undefined) {
        if (lineId)
          await tx.contractPriceSnapshotLine.update({
            where: { id: lineId },
            data: {
              contractAmountMinor: BigInt(d.economicAmountMinor),
              currency: r.currency,
            },
          });
        else
          lineId = (
            await tx.contractPriceSnapshotLine.create({
              data: {
                contractRevisionId: v,
                source: 'EXCLUSIVITY_FEE',
                componentCode: `EXCLUSIVITY_FEE_${id}`,
                componentName: `Frais d'exclusivité — ${d.territoryLabel}`,
                pricingModel: 'CUSTOM',
                chargeType: 'ONE_TIME',
                currency: r.currency,
                contractAmountMinor: BigInt(d.economicAmountMinor),
                displayOrder: 100000,
              },
            })
          ).id;
      } else if (lineId) {
        await tx.contractExclusivity.update({
          where: { id },
          data: { hasEconomicImpact: false, economicSnapshotLineId: null },
        });
        await tx.contractPriceSnapshotLine.delete({ where: { id: lineId } });
        lineId = null;
      }
      await tx.contractExclusivitySector.deleteMany({
        where: { exclusivityId: id },
      });
      await tx.contractExclusivityCapability.deleteMany({
        where: { exclusivityId: id },
      });
      const x = await tx.contractExclusivity.update({
        where: { id },
        data: {
          territoryType: d.territoryType,
          territoryCode: d.territoryCode,
          territoryLabel: d.territoryLabel,
          startsAt: start,
          endsAt: end,
          hasEconomicImpact: !!lineId,
          economicSnapshotLineId: lineId,
          conditions: d.conditions,
          renewalTerms: d.renewalTerms,
          sectors: { create: d.sectors },
          capabilities: {
            create: d.capabilityIds.map((capabilityId) => ({ capabilityId })),
          },
        },
        include: {
          sectors: true,
          capabilities: true,
          economicSnapshotLine: true,
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractExclusivity',
        targetId: id,
        organizationId: o,
        reason: 'Modification exclusivité',
        beforeData: this.json(before),
        afterData: this.json(x),
      });
      return this.serialize(x);
    });
  }
  async removeExclusivity(
    o: string,
    c: string,
    v: string,
    id: string,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draftRevision(tx, o, c, v);
      const x = await tx.contractExclusivity.findFirst({
        where: { id, contractRevisionId: v },
      });
      if (!x) throw new NotFoundException('Exclusivité introuvable.');
      await tx.contractExclusivitySector.deleteMany({
        where: { exclusivityId: id },
      });
      await tx.contractExclusivityCapability.deleteMany({
        where: { exclusivityId: id },
      });
      await tx.contractExclusivity.delete({ where: { id } });
      if (x.economicSnapshotLineId)
        await tx.contractPriceSnapshotLine.delete({
          where: { id: x.economicSnapshotLineId },
        });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractExclusivity',
        targetId: id,
        organizationId: o,
        reason: 'Retrait avant signature',
        beforeData: this.json(x),
      });
      return { removed: true };
    });
  }
  async listCommitments(o: string, c: string, v: string) {
    await this.draftRevision(this.prisma, o, c, v);
    return this.serialize(
      await this.prisma.contractMinimumCommitment.findMany({
        where: { contractRevisionId: v },
      }),
    );
  }
  private commitmentData(v: string, d: CommitmentDto) {
    return {
      contractRevisionId: v,
      type: d.type,
      period: d.period,
      amountMinor: d.amountMinor ? BigInt(d.amountMinor) : null,
      quantity: d.quantity ? new Prisma.Decimal(d.quantity) : null,
      currency: d.currency,
      description: d.description,
    };
  }
  async createCommitment(
    o: string,
    c: string,
    v: string,
    d: CommitmentDto,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draftRevision(tx, o, c, v);
      const x = await tx.contractMinimumCommitment.create({
        data: this.commitmentData(v, d),
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractMinimumCommitment',
        targetId: x.id,
        organizationId: o,
        reason: 'Configuration engagement minimum',
        afterData: this.json(x),
      });
      return this.serialize(x);
    });
  }
  async updateCommitment(
    o: string,
    c: string,
    v: string,
    id: string,
    d: CommitmentDto,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draftRevision(tx, o, c, v);
      const before = await tx.contractMinimumCommitment.findFirst({
        where: { id, contractRevisionId: v },
      });
      if (!before) throw new NotFoundException('Engagement introuvable.');
      const x = await tx.contractMinimumCommitment.update({
        where: { id },
        data: this.commitmentData(v, d),
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractMinimumCommitment',
        targetId: id,
        organizationId: o,
        reason: 'Modification engagement minimum',
        beforeData: this.json(before),
        afterData: this.json(x),
      });
      return this.serialize(x);
    });
  }
  async removeCommitment(
    o: string,
    c: string,
    v: string,
    id: string,
    a: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draftRevision(tx, o, c, v);
      const x = await tx.contractMinimumCommitment.findFirst({
        where: { id, contractRevisionId: v },
      });
      if (!x) throw new NotFoundException('Engagement introuvable.');
      await tx.contractMinimumCommitment.delete({ where: { id } });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DRAFT_UPDATED',
        targetType: 'ContractMinimumCommitment',
        targetId: id,
        organizationId: o,
        reason: 'Retrait avant signature',
        beforeData: this.json(x),
      });
      return { removed: true };
    });
  }
  async listDocuments(o: string, c: string) {
    await this.owned(this.prisma, o, c);
    return this.prisma.organizationContractDocument.findMany({
      where: { contractId: c },
      orderBy: { createdAt: 'desc' },
    });
  }
  async uploadDocument(
    o: string,
    c: string,
    d: ContractDocumentDto,
    file: Express.Multer.File,
    a: Actor,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Fichier requis.');
    await this.owned(this.prisma, o, c);
    if (d.revisionId) {
      const r = await this.prisma.organizationContractRevision.findFirst({
        where: { id: d.revisionId, contractId: c },
      });
      if (!r) throw new NotFoundException('Révision introuvable.');
    }
    const sha256 = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const key = `contracts/${o}/${c}/${sha256}`;
    await this.storage.uploadPrivateImmutable(file.buffer, key, file.mimetype);
    return this.prisma.$transaction(async (tx) => {
      const x = await tx.organizationContractDocument.create({
        data: {
          contractId: c,
          contractRevisionId: d.revisionId,
          type: d.type,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageKey: key,
          sha256,
          uploadedByUserId: a.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: a.userId,
        action: 'CONTRACT_DOCUMENT_ATTACHED',
        targetType: 'OrganizationContractDocument',
        targetId: x.id,
        targetLabel: file.originalname,
        organizationId: o,
        afterData: this.json({
          type: x.type,
          mimeType: x.mimeType,
          sizeBytes: x.sizeBytes,
          sha256: x.sha256,
        }),
      });
      return x;
    });
  }
  async downloadDocument(o: string, c: string, id: string) {
    await this.owned(this.prisma, o, c);
    const x = await this.prisma.organizationContractDocument.findFirst({
      where: { id, contractId: c },
    });
    if (!x) throw new NotFoundException('Document introuvable.');
    return {
      buffer: await this.storage.downloadPrivate(x.storageKey),
      mimeType: x.mimeType,
      fileName: x.fileName,
    };
  }
  private discounted(value: bigint | null, bps: number) {
    return value === null ? null : value - (BigInt(bps) * value) / 10000n;
  }
  async sign(
    o: string,
    cid: string,
    rid: string,
    d: SignRevisionDto,
    a: Actor,
  ) {
    const reason = this.reason(d.reason);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${o}, 0))`;
        const c = await this.owned(tx, o, cid);
        const rev = await tx.organizationContractRevision.findFirst({
          where: { id: rid, contractId: cid },
          include: {
            priceBookVersion: {
              include: {
                priceBook: true,
                components: { include: { capability: true, tiers: true } },
              },
            },
            basedOnRevision: true,
            adjustments: true,
            exclusivities: true,
            priceLines: { include: { capability: true } },
          },
        });
        if (!rev || rev.status !== 'APPROVED')
          throw new BadRequestException('La révision doit être APPROVED.');
        if (
          rev.priceLines.length === 0 &&
          (rev.priceBookVersion.components.length > 0 ||
            rev.adjustments.some((item) => item.scope === 'CUSTOM_COMPONENT'))
        )
          throw new BadRequestException(
            'Applicable commercial lines require an explicit quantity binding; use a finalized Proposal.',
          );
        rev.priceLines.forEach((line) => this.validatePriceLineBinding(line));
        if (
          c.organization.commercialRelationship === 'INTERNAL' ||
          !c.organization.commercialRelationship
        )
          throw new BadRequestException(
            'Relationship commerciale non admissible.',
          );
        const pb = rev.priceBookVersion,
          kept =
            rev.revisionType === 'AMENDMENT' &&
            rev.basedOnRevision?.priceBookVersionId === pb.id;
        if (!kept && !['ACTIVE', 'SCHEDULED'].includes(pb.status))
          throw new BadRequestException('Version tarifaire non admissible.');
        if (
          !kept &&
          ((pb.effectiveFrom &&
            (pb.effectiveFrom > rev.effectiveFrom ||
              pb.effectiveFrom > rev.termStartAt)) ||
            (pb.effectiveUntil &&
              (pb.effectiveUntil <= rev.effectiveFrom ||
                pb.effectiveUntil <= rev.termStartAt)))
        )
          throw new BadRequestException(
            'Période de PriceBookVersion incompatible avec le contrat.',
          );
        if (
          pb.priceBook.audience !== c.organization.commercialRelationship ||
          pb.priceBook.currency !== rev.currency ||
          rev.currency !== 'CAD'
        )
          throw new BadRequestException('Audience ou devise incompatible.');
        if (['DRAFT', 'CANCELLED'].includes(pb.status))
          throw new BadRequestException('Version tarifaire non signable.');
        const global =
          rev.adjustments.find((x) => x.scope === 'GLOBAL')
            ?.discountBasisPoints ?? 0;
        for (const component of rev.priceLines.length ? [] : pb.components) {
          const adj = rev.adjustments.find(
            (x) => x.sourcePriceComponentId === component.id,
          );
          let amount = this.discounted(component.amountMinor, global);
          if (adj?.adjustmentType === 'PERCENT_DISCOUNT')
            amount = this.discounted(amount, adj.discountBasisPoints ?? 0);
          if (adj?.adjustmentType === 'FIXED_OVERRIDE')
            amount = adj.overrideAmountMinor;
          await tx.contractPriceSnapshotLine.create({
            data: {
              contractRevisionId: rid,
              source: 'CATALOG_COMPONENT',
              sourcePriceComponentId: component.id,
              capabilityId: component.capabilityId,
              componentCode: component.code,
              componentName: component.nameFr,
              description: component.descriptionFr,
              pricingModel: component.pricingModel,
              chargeType: component.chargeType,
              billingPeriod: component.billingPeriod,
              metric: component.metric,
              tierMode: component.tierMode,
              currency: rev.currency,
              catalogAmountMinor: component.amountMinor,
              contractAmountMinor: amount,
              adjustmentSummary:
                adj?.adjustmentType ??
                (global ? 'GLOBAL_PERCENT_DISCOUNT' : null),
              displayOrder: component.displayOrder,
              tiers: {
                create: component.tiers.map((t) => {
                  let v = this.discounted(t.amountMinor, global)!;
                  if (adj?.adjustmentType === 'PERCENT_DISCOUNT')
                    v = this.discounted(v, adj.discountBasisPoints ?? 0)!;
                  if (adj?.adjustmentType === 'FIXED_OVERRIDE')
                    v = adj.overrideAmountMinor!;
                  return {
                    minimumQuantity: t.minimumQuantity,
                    maximumQuantity: t.maximumQuantity,
                    catalogAmountMinor: t.amountMinor,
                    contractAmountMinor: v,
                    displayOrder: t.displayOrder,
                  };
                }),
              },
            },
          });
        }
        for (const x of rev.priceLines.length
          ? []
          : rev.adjustments.filter((x) => x.scope === 'CUSTOM_COMPONENT'))
          await tx.contractPriceSnapshotLine.create({
            data: {
              contractRevisionId: rid,
              source: 'CUSTOM_COMPONENT',
              capabilityId: x.capabilityId!,
              componentCode: x.code!,
              componentName: x.label!,
              pricingModel: 'CUSTOM',
              chargeType: 'RECURRING',
              currency: rev.currency,
              contractAmountMinor: x.overrideAmountMinor,
              adjustmentSummary: x.justification,
              displayOrder: x.displayOrder,
            },
          });
        const res = await tx.organizationContractRevision.updateMany({
          where: { id: rid, lockVersion: d.lockVersion, status: 'APPROVED' },
          data: {
            status: 'SIGNED',
            signedAt: new Date(),
            signedByName: d.signedByName,
            signatureReference: d.signatureReference,
            justification: reason,
            lockVersion: { increment: 1 },
          },
        });
        if (res.count !== 1)
          throw new ConflictException('Conflit de signature.');
        if (c.status === 'APPROVED')
          await tx.organizationContract.update({
            where: { id: cid },
            data: {
              status: rev.effectiveFrom > new Date() ? 'SCHEDULED' : 'ACTIVE',
              activatedAt: rev.effectiveFrom <= new Date() ? new Date() : null,
              lockVersion: { increment: 1 },
            },
          });
        await this.audit.record(tx, {
          actorUserId: a.userId,
          action:
            rev.revisionType === 'AMENDMENT'
              ? 'CONTRACT_AMENDMENT_SIGNED'
              : 'CONTRACT_SIGNED',
          targetType: 'OrganizationContractRevision',
          targetId: rid,
          targetLabel: c.reference,
          organizationId: o,
          reason,
          afterData: this.json({
            revisionNumber: rev.revisionNumber,
            signedAt: new Date(),
            priceBookVersionId: pb.id,
          }),
        });
        return this.get(o, cid);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
