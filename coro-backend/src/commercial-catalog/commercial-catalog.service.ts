import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CapabilityCode, Prisma, PriceBookVersionStatus } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateComponentDto,
  CreatePriceBookDto,
  CreateTierDto,
  CreateVersionDto,
  PublishVersionDto,
  UpdateCapabilityDto,
  UpdateCommercialIdentityDto,
  UpdateComponentDto,
  UpdatePriceBookDto,
  UpdateScopeDto,
  UpdateTierDto,
  UpdateVersionDto,
} from './commercial-catalog.dto';

type Actor = { userId: string };
type TierShape = {
  minimumQuantity: Prisma.Decimal | string | number;
  maximumQuantity: Prisma.Decimal | string | number | null;
};
type ComponentShape = {
  code: string;
  chargeType: string;
  billingPeriod: string | null;
  pricingModel: string;
  metric?: string | null;
  tierMode?: string | null;
  amountMinor: bigint | null;
  tiers: TierShape[];
};

@Injectable()
export class CommercialCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}
  private serialize<T>(value: T): T {
    const parsed: unknown = JSON.parse(
      JSON.stringify(value, (_key: string, item: unknown): unknown =>
        typeof item === 'bigint' ? item.toString() : item,
      ),
    );
    return parsed as T;
  }
  private auditJson(value: unknown): Prisma.InputJsonValue {
    return this.serialize(value) as Prisma.InputJsonValue;
  }
  private reason(value: string | undefined, required = false) {
    return this.audit.normalizeReason(value, required);
  }
  private dates(from?: string, until?: string) {
    const effectiveFrom = from ? new Date(from) : null;
    const effectiveUntil = until ? new Date(until) : null;
    if (effectiveFrom && effectiveUntil && effectiveUntil <= effectiveFrom)
      throw new BadRequestException(
        'effectiveUntil doit être postérieur à effectiveFrom.',
      );
    return { effectiveFrom, effectiveUntil };
  }
  private async draft(tx: Prisma.TransactionClient, versionId: string) {
    const version = await tx.priceBookVersion.findUnique({
      where: { id: versionId },
      include: { priceBook: true },
    });
    if (!version) throw new NotFoundException('Version tarifaire introuvable.');
    if (version.status !== 'DRAFT')
      throw new BadRequestException('Seule une version DRAFT est modifiable.');
    if (version.priceBook.archivedAt)
      throw new BadRequestException('Le PriceBook est archivé.');
    return version;
  }
  listCapabilities() {
    return this.prisma.commercialCapability.findMany({
      include: { scopePolicies: { orderBy: { scope: 'asc' } } },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });
  }
  async updateCapability(
    code: CapabilityCode,
    dto: UpdateCapabilityDto,
    actor: Actor,
  ) {
    const reasonRequired =
      dto.lifecycle !== undefined || dto.isAvailable !== undefined;
    const reason = this.reason(dto.reason, reasonRequired);
    const data = {
      nameFr: dto.nameFr,
      nameEn: dto.nameEn,
      descriptionFr: dto.descriptionFr,
      descriptionEn: dto.descriptionEn,
      lifecycle: dto.lifecycle,
      isAvailable: dto.isAvailable,
      displayOrder: dto.displayOrder,
    };
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.commercialCapability.findUnique({
        where: { code },
      });
      if (!before) throw new NotFoundException('Capability introuvable.');
      const after = await tx.commercialCapability.update({
        where: { code },
        data,
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CAPABILITY_UPDATED',
        targetType: 'CommercialCapability',
        targetId: after.id,
        targetLabel: after.code,
        reason,
        beforeData: before,
        afterData: after,
      });
      return after;
    });
  }
  async updateScope(code: CapabilityCode, dto: UpdateScopeDto, actor: Actor) {
    const reason = this.reason(dto.reason, true);
    return this.prisma.$transaction(async (tx) => {
      const capability = await tx.commercialCapability.findUnique({
        where: { code },
      });
      if (!capability) throw new NotFoundException('Capability introuvable.');
      const before = await tx.capabilityScopePolicy.findUnique({
        where: {
          capabilityId_scope: { capabilityId: capability.id, scope: dto.scope },
        },
      });
      const after = await tx.capabilityScopePolicy.update({
        where: {
          capabilityId_scope: { capabilityId: capability.id, scope: dto.scope },
        },
        data: { status: dto.status },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'CAPABILITY_SCOPE_UPDATED',
        targetType: 'CapabilityScopePolicy',
        targetId: after.id,
        targetLabel: `${code}/${dto.scope}`,
        reason,
        beforeData: before!,
        afterData: after,
      });
      return after;
    });
  }
  async commercialIdentity(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        licenseType: true,
        isActive: true,
        commercialRelationship: true,
      },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable.');
    return {
      ...organization,
      commercialRelationship:
        organization.commercialRelationship ?? 'NOT_CONFIGURED',
      priceBook: 'NOT_ASSIGNED',
      contract: 'NOT_CONFIGURED',
      pricing: 'NOT_CONFIGURED',
      entitlements: 'OBSERVATION_ONLY',
    };
  }
  async updateCommercialIdentity(
    organizationId: string,
    dto: UpdateCommercialIdentityDto,
    actor: Actor,
  ) {
    const reason = this.reason(dto.reason, true);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, commercialRelationship: true },
      });
      if (!before) throw new NotFoundException('Organisation introuvable.');
      const after = await tx.organization.update({
        where: { id: organizationId },
        data: { commercialRelationship: dto.commercialRelationship },
        select: { id: true, name: true, commercialRelationship: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'COMMERCIAL_RELATIONSHIP_CHANGED',
        targetType: 'Organization',
        targetId: organizationId,
        targetLabel: after.name,
        organizationId,
        reason,
        beforeData: before,
        afterData: after,
      });
      return after;
    });
  }
  async listPriceBooks() {
    return this.serialize(
      await this.prisma.priceBook.findMany({
        include: {
          versions: {
            include: {
              components: {
                include: {
                  capability: true,
                  tiers: { orderBy: { displayOrder: 'asc' } },
                },
                orderBy: { displayOrder: 'asc' },
              },
            },
            orderBy: { versionNumber: 'desc' },
          },
        },
        orderBy: { code: 'asc' },
      }),
    );
  }
  async getPriceBook(id: string) {
    const result = await this.prisma.priceBook.findUnique({
      where: { id },
      include: {
        versions: {
          include: {
            components: {
              include: {
                capability: true,
                tiers: { orderBy: { displayOrder: 'asc' } },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (!result) throw new NotFoundException('PriceBook introuvable.');
    return this.serialize(result);
  }
  async createPriceBook(dto: CreatePriceBookDto, actor: Actor) {
    if (dto.currency !== 'CAD')
      throw new BadRequestException(
        'Seule la devise CAD est autorisée en Phase 2A.',
      );
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.priceBook.create({ data: dto });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_BOOK_CREATED',
        targetType: 'PriceBook',
        targetId: row.id,
        targetLabel: row.code,
        afterData: row,
      });
      return row;
    });
  }
  async updatePriceBook(id: string, dto: UpdatePriceBookDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.priceBook.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('PriceBook introuvable.');
      if (before.archivedAt)
        throw new BadRequestException('PriceBook archivé.');
      const after = await tx.priceBook.update({ where: { id }, data: dto });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_BOOK_UPDATED',
        targetType: 'PriceBook',
        targetId: id,
        targetLabel: after.code,
        beforeData: before,
        afterData: after,
      });
      return after;
    });
  }
  async archivePriceBook(id: string, reasonValue: string, actor: Actor) {
    const reason = this.reason(reasonValue, true);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.priceBook.findUnique({
        where: { id },
        include: {
          versions: {
            where: { status: { in: ['ACTIVE', 'SCHEDULED'] } },
            select: { id: true },
          },
        },
      });
      if (!before) throw new NotFoundException('PriceBook introuvable.');
      if (before.versions.length)
        throw new BadRequestException(
          'Un PriceBook ACTIVE ou SCHEDULED ne peut pas être archivé.',
        );
      const after = await tx.priceBook.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_BOOK_ARCHIVED',
        targetType: 'PriceBook',
        targetId: id,
        targetLabel: after.code,
        reason,
        beforeData: before,
        afterData: after,
      });
      return after;
    });
  }
  async createVersion(bookId: string, dto: CreateVersionDto, actor: Actor) {
    const dates = this.dates(dto.effectiveFrom, dto.effectiveUntil);
    return this.prisma.$transaction(async (tx) => {
      const book = await tx.priceBook.findUnique({
        where: { id: bookId },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      });
      if (!book) throw new NotFoundException('PriceBook introuvable.');
      if (book.archivedAt) throw new BadRequestException('PriceBook archivé.');
      const user = await tx.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true },
      });
      const row = await tx.priceBookVersion.create({
        data: {
          priceBookId: bookId,
          versionNumber: (book.versions[0]?.versionNumber ?? 0) + 1,
          ...dates,
          createdByUserId: actor.userId,
          createdByDisplayName: user
            ? `${user.firstName} ${user.lastName}`.trim()
            : null,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_BOOK_VERSION_CREATED',
        targetType: 'PriceBookVersion',
        targetId: row.id,
        targetLabel: `${book.code}/v${row.versionNumber}`,
        afterData: row,
      });
      return row;
    });
  }
  async updateVersion(id: string, dto: UpdateVersionDto, actor: Actor) {
    const dates = this.dates(dto.effectiveFrom, dto.effectiveUntil);
    return this.prisma.$transaction(async (tx) => {
      const before = await this.draft(tx, id);
      const after = await tx.priceBookVersion.update({
        where: { id },
        data: dates,
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_BOOK_VERSION_UPDATED',
        targetType: 'PriceBookVersion',
        targetId: id,
        beforeData: before,
        afterData: after,
      });
      return after;
    });
  }
  validateComponent(component: ComponentShape) {
    if (component.chargeType === 'ONE_TIME' && component.billingPeriod)
      throw new BadRequestException(
        `Le composant ${component.code} ONE_TIME ne peut pas avoir de période.`,
      );
    if (component.chargeType === 'RECURRING' && !component.billingPeriod)
      throw new BadRequestException(
        `Le composant ${component.code} récurrent exige une période.`,
      );
    if (component.pricingModel === 'TIERED') {
      if (!component.tierMode || !component.tiers.length)
        throw new BadRequestException(
          `Le composant ${component.code} exige des tiers.`,
        );
      this.validateTiers(component.tiers, true);
    }
    if (
      !['TIERED', 'COMPLEXITY', 'CUSTOM'].includes(component.pricingModel) &&
      component.amountMinor === null
    )
      throw new BadRequestException(
        `Le composant ${component.code} exige un montant.`,
      );
    const requiredMetric: Record<string, string> = {
      FLAT: 'FIXED',
      PER_UNIT: 'HOUR',
      PER_SEAT: 'SEAT',
      PER_SITE: 'SITE',
      USAGE: 'USAGE_UNIT',
      COMPLEXITY: 'COMPLEXITY',
    };
    const expectedMetric = requiredMetric[component.pricingModel];
    if (expectedMetric && component.metric !== expectedMetric)
      throw new BadRequestException(
        `Le composant ${component.code} exige la metric ${expectedMetric}.`,
      );
    if (
      component.pricingModel === 'TIERED' &&
      !['SEAT', 'SITE', 'CLIENT', 'USAGE_UNIT'].includes(component.metric ?? '')
    )
      throw new BadRequestException(
        `Le composant ${component.code} TIERED exige une metric quantitative.`,
      );
  }
  validateTiers(tiers: TierShape[], requireContiguous: boolean) {
    const sorted = [...tiers].sort(
      (a, b) => Number(a.minimumQuantity) - Number(b.minimumQuantity),
    );
    sorted.forEach((tier, index) => {
      const min = Number(tier.minimumQuantity);
      const max =
        tier.maximumQuantity === null ? null : Number(tier.maximumQuantity);
      if (min < 0 || (max !== null && max <= min))
        throw new BadRequestException('Bornes de tier invalides.');
      if (max === null && index !== sorted.length - 1)
        throw new BadRequestException('Seul le dernier tier peut être ouvert.');
      if (index > 0) {
        const previous = sorted[index - 1].maximumQuantity;
        if (previous === null || min < Number(previous))
          throw new BadRequestException('Les tiers se chevauchent.');
        if (requireContiguous && min !== Number(previous))
          throw new BadRequestException(
            'Les tiers publiés ne peuvent contenir de trous.',
          );
      }
    });
  }
  async publishVersion(id: string, dto: PublishVersionDto, actor: Actor) {
    const reason = this.reason(dto.reason, true);
    const dates = this.dates(dto.effectiveFrom, dto.effectiveUntil);
    const effectiveFrom = dates.effectiveFrom;
    if (!effectiveFrom) throw new BadRequestException('effectiveFrom requis.');
    return this.prisma.$transaction(async (tx) => {
      const before = await this.draft(tx, id);
      if (before.priceBook.currency !== 'CAD')
        throw new BadRequestException(
          'Seule la devise CAD est publiable en Phase 2A.',
        );
      const components = await tx.priceComponent.findMany({
        where: { priceBookVersionId: id },
        include: { capability: true, tiers: true },
      });
      if (!components.length)
        throw new BadRequestException(
          'Une version tarifaire publiée exige au moins un composant.',
        );
      components.forEach((component) => {
        if (!component.capability.isAvailable)
          throw new BadRequestException(
            `${component.capability.code} est indisponible et ne peut pas être publiée.`,
          );
        this.validateComponent(component);
      });
      const overlap = await tx.priceBookVersion.findFirst({
        where: {
          priceBookId: before.priceBookId,
          id: { not: id },
          status: { in: ['ACTIVE', 'SCHEDULED'] },
          AND: [
            {
              OR: [
                { effectiveUntil: null },
                { effectiveUntil: { gt: effectiveFrom } },
              ],
            },
            {
              OR: [
                { effectiveFrom: null },
                {
                  effectiveFrom: {
                    lt: dates.effectiveUntil ?? new Date('9999-12-31'),
                  },
                },
              ],
            },
          ],
        },
      });
      if (overlap)
        throw new BadRequestException(
          'La période chevauche une version publiée.',
        );
      const status: PriceBookVersionStatus =
        effectiveFrom <= new Date() ? 'ACTIVE' : 'SCHEDULED';
      const after = await tx.priceBookVersion.update({
        where: { id },
        data: { ...dates, status, publishedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_BOOK_VERSION_PUBLISHED',
        targetType: 'PriceBookVersion',
        targetId: id,
        targetLabel: `${before.priceBook.code}/v${before.versionNumber}`,
        reason,
        beforeData: before,
        afterData: after,
      });
      return after;
    });
  }
  async transitionVersion(
    id: string,
    action: 'cancel' | 'archive',
    reasonValue: string,
    actor: Actor,
  ) {
    const reason = this.reason(reasonValue, true);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.priceBookVersion.findUnique({
        where: { id },
        include: { priceBook: true },
      });
      if (!before) throw new NotFoundException('Version introuvable.');
      const allowed =
        action === 'cancel'
          ? before.status === 'SCHEDULED'
          : before.status === 'ACTIVE';
      if (!allowed)
        throw new BadRequestException(
          action === 'cancel'
            ? 'Seule une version SCHEDULED peut être annulée.'
            : 'Seule une version ACTIVE peut être archivée.',
        );
      const after = await tx.priceBookVersion.update({
        where: { id },
        data:
          action === 'cancel'
            ? { status: 'CANCELLED', cancelledAt: new Date() }
            : { status: 'ARCHIVED', archivedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action:
          action === 'cancel'
            ? 'PRICE_BOOK_VERSION_CANCELLED'
            : 'PRICE_BOOK_VERSION_ARCHIVED',
        targetType: 'PriceBookVersion',
        targetId: id,
        targetLabel: `${before.priceBook.code}/v${before.versionNumber}`,
        reason,
        beforeData: before,
        afterData: after,
      });
      return after;
    });
  }
  async createComponent(
    versionId: string,
    dto: CreateComponentDto,
    actor: Actor,
  ) {
    return this.componentMutation('create', versionId, undefined, dto, actor);
  }
  async updateComponent(
    versionId: string,
    componentId: string,
    dto: UpdateComponentDto,
    actor: Actor,
  ) {
    return this.componentMutation('update', versionId, componentId, dto, actor);
  }
  private async componentMutation(
    kind: 'create' | 'update',
    versionId: string,
    componentId: string | undefined,
    dto: CreateComponentDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draft(tx, versionId);
      const capability = await tx.commercialCapability.findUnique({
        where: { code: dto.capabilityCode as CapabilityCode },
      });
      if (!capability) throw new BadRequestException('Capability invalide.');
      const data = {
        ...dto,
        capabilityCode: undefined,
        capabilityId: capability.id,
        amountMinor:
          dto.amountMinor === undefined ? null : BigInt(dto.amountMinor),
      };
      const before = componentId
        ? await tx.priceComponent.findUnique({ where: { id: componentId } })
        : null;
      const row =
        kind === 'create'
          ? await tx.priceComponent.create({
              data: { ...data, priceBookVersionId: versionId },
            })
          : await tx.priceComponent.update({
              where: { id: componentId! },
              data,
            });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action:
          kind === 'create'
            ? 'PRICE_COMPONENT_CREATED'
            : 'PRICE_COMPONENT_UPDATED',
        targetType: 'PriceComponent',
        targetId: row.id,
        targetLabel: row.code,
        beforeData: before ? this.auditJson(before) : undefined,
        afterData: this.auditJson(row),
      });
      return this.serialize(row);
    });
  }
  async removeComponent(versionId: string, componentId: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await this.draft(tx, versionId);
      const before = await tx.priceComponent.findUnique({
        where: { id: componentId },
      });
      if (!before || before.priceBookVersionId !== versionId)
        throw new NotFoundException('Composant introuvable.');
      await tx.priceTier.deleteMany({
        where: { priceComponentId: componentId },
      });
      await tx.priceComponent.delete({ where: { id: componentId } });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_COMPONENT_REMOVED',
        targetType: 'PriceComponent',
        targetId: componentId,
        targetLabel: before.code,
        beforeData: this.auditJson(before),
      });
      return { removed: true };
    });
  }
  async createTier(
    versionId: string,
    componentId: string,
    dto: CreateTierDto,
    actor: Actor,
  ) {
    return this.tierMutation(
      'create',
      versionId,
      componentId,
      undefined,
      dto,
      actor,
    );
  }
  async updateTier(
    versionId: string,
    componentId: string,
    tierId: string,
    dto: UpdateTierDto,
    actor: Actor,
  ) {
    return this.tierMutation(
      'update',
      versionId,
      componentId,
      tierId,
      dto,
      actor,
    );
  }
  private async tierMutation(
    kind: 'create' | 'update',
    versionId: string,
    componentId: string,
    tierId: string | undefined,
    dto: CreateTierDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draft(tx, versionId);
      const component = await tx.priceComponent.findUnique({
        where: { id: componentId },
      });
      if (!component || component.priceBookVersionId !== versionId)
        throw new NotFoundException('Composant introuvable.');
      const data = {
        minimumQuantity: new Prisma.Decimal(dto.minimumQuantity),
        maximumQuantity: dto.maximumQuantity
          ? new Prisma.Decimal(dto.maximumQuantity)
          : null,
        amountMinor: BigInt(dto.amountMinor),
        displayOrder: dto.displayOrder,
      };
      const before = tierId
        ? await tx.priceTier.findUnique({ where: { id: tierId } })
        : null;
      const candidate =
        kind === 'create'
          ? await tx.priceTier.create({
              data: { ...data, priceComponentId: componentId },
            })
          : await tx.priceTier.update({ where: { id: tierId! }, data });
      const tiers = await tx.priceTier.findMany({
        where: { priceComponentId: componentId },
      });
      this.validateTiers(tiers, false);
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: kind === 'create' ? 'PRICE_TIER_CREATED' : 'PRICE_TIER_UPDATED',
        targetType: 'PriceTier',
        targetId: candidate.id,
        targetLabel: component.code,
        beforeData: before ? this.auditJson(before) : undefined,
        afterData: this.auditJson(candidate),
      });
      return this.serialize(candidate);
    });
  }
  async removeTier(
    versionId: string,
    componentId: string,
    tierId: string,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.draft(tx, versionId);
      const before = await tx.priceTier.findUnique({
        where: { id: tierId },
        include: { priceComponent: true },
      });
      if (!before || before.priceComponentId !== componentId)
        throw new NotFoundException('Tier introuvable.');
      await tx.priceTier.delete({ where: { id: tierId } });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PRICE_TIER_REMOVED',
        targetType: 'PriceTier',
        targetId: tierId,
        targetLabel: before.priceComponent.code,
        beforeData: this.auditJson(before),
      });
      return { removed: true };
    });
  }
}
