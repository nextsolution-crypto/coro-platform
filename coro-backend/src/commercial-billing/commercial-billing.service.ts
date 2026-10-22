import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommercialInvoiceStatus, Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApproveCreditNoteDto,
  BillingTransitionDto,
  CreateCreditNoteDto,
  CreateInvoiceDto,
  CreateTaxConfigurationDto,
  IssueCreditNoteDto,
  IssueInvoiceDto,
  RecordPaymentDto,
} from './commercial-billing.dto';

type Actor = { userId: string };
const invoiceInclude = {
  subscription: { select: { id: true, reference: true, status: true, contractId: true, renewalAt: true } },
  taxConfiguration: true,
  lines: { orderBy: { displayOrder: 'asc' as const } },
  payments: { orderBy: { recordedAt: 'desc' as const } },
  creditNotes: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class CommercialBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(organizationId: string) {
    return this.serialize(await this.prisma.commercialInvoice.findMany({
      where: { organizationId }, include: invoiceInclude, orderBy: { createdAt: 'desc' },
    }));
  }

  async detail(organizationId: string, id: string) {
    const invoice = await this.prisma.commercialInvoice.findFirst({ where: { id, organizationId }, include: invoiceInclude });
    if (!invoice) throw new NotFoundException('Facture introuvable.');
    return this.serialize(invoice);
  }

  async taxConfigurations(organizationId: string) {
    return this.serialize(await this.prisma.commercialTaxConfiguration.findMany({ where: { organizationId }, orderBy: { effectiveFrom: 'desc' } }));
  }

  async createTaxConfiguration(organizationId: string, dto: CreateTaxConfigurationDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    if (dto.federalRatePartsPerMillion > 1_000_000 || dto.provincialRatePartsPerMillion > 1_000_000)
      throw new BadRequestException('TAX_RATE_INVALID');
    const from = new Date(dto.effectiveFrom);
    const until = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    if (until && until <= from) throw new BadRequestException('TAX_PERIOD_INVALID');
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.commercialTaxConfiguration.create({ data: {
        organizationId, jurisdictionCode: dto.jurisdictionCode.toUpperCase(), name: dto.name,
        federalRatePartsPerMillion: dto.federalRatePartsPerMillion,
        provincialRatePartsPerMillion: dto.provincialRatePartsPerMillion,
        effectiveFrom: from, effectiveUntil: until, createdByUserId: actor.userId,
      } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'COMMERCIAL_TAX_CONFIGURATION_CREATED', targetType: 'CommercialTaxConfiguration', targetId: created.id, targetLabel: created.jurisdictionCode, organizationId, reason, afterData: this.json({ status: created.status, rates: [created.federalRatePartsPerMillion, created.provincialRatePartsPerMillion] }) });
      return this.serialize(created);
    });
  }

  async approveTaxConfiguration(organizationId: string, id: string, dto: BillingTransitionDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.commercialTaxConfiguration.findFirst({
        where: { id, organizationId, status: 'DRAFT', lockVersion: dto.lockVersion },
      });
      if (!candidate) throw new ConflictException('TAX_CONFIGURATION_VERSION_CONFLICT');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`commercial-tax:${organizationId}:${candidate.jurisdictionCode}`}, 0))`;
      const overlap = await tx.commercialTaxConfiguration.findFirst({
        where: {
          id: { not: id },
          organizationId,
          jurisdictionCode: candidate.jurisdictionCode,
          status: 'APPROVED',
          ...(candidate.effectiveUntil
            ? { effectiveFrom: { lt: candidate.effectiveUntil } }
            : {}),
          OR: [
            { effectiveUntil: null },
            { effectiveUntil: { gt: candidate.effectiveFrom } },
          ],
        },
      });
      if (overlap) throw new ConflictException('TAX_CONFIGURATION_PERIOD_OVERLAP');
      const result = await tx.commercialTaxConfiguration.updateMany({ where: { id, organizationId, status: 'DRAFT', lockVersion: dto.lockVersion }, data: { status: 'APPROVED', approvalReference: reason, lockVersion: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('TAX_CONFIGURATION_VERSION_CONFLICT');
      const after = await tx.commercialTaxConfiguration.findUniqueOrThrow({ where: { id } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'COMMERCIAL_TAX_CONFIGURATION_APPROVED', targetType: 'CommercialTaxConfiguration', targetId: id, targetLabel: after.jurisdictionCode, organizationId, reason, afterData: this.json({ status: after.status }) });
      return this.serialize(after);
    });
  }

  async createInvoice(organizationId: string, dto: CreateInvoiceDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    const start = new Date(dto.periodStart), end = new Date(dto.periodEnd);
    if (end <= start) throw new BadRequestException('INVOICE_PERIOD_INVALID');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`commercial-invoice:${organizationId}`}, 0))`;
      const existing = await tx.commercialInvoice.findUnique({ where: { idempotencyKey: dto.idempotencyKey }, include: invoiceInclude });
      if (existing) {
        if (existing.organizationId !== organizationId) throw new ConflictException('IDEMPOTENCY_KEY_CONFLICT');
        return this.serialize(existing);
      }
      const [subscription, tax] = await Promise.all([
        tx.commercialSubscription.findFirst({
          where: { id: dto.subscriptionId, organizationId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
          include: { items: { select: { contractSnapshotLineId: true } } },
        }),
        tx.commercialTaxConfiguration.findFirst({ where: { id: dto.taxConfigurationId, organizationId, status: 'APPROVED', effectiveFrom: { lte: start }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: start } }] } }),
      ]);
      if (!subscription) throw new BadRequestException('BILLABLE_SUBSCRIPTION_REQUIRED');
      if (!tax) throw new BadRequestException('APPROVED_TAX_CONFIGURATION_REQUIRED');
      const subscriptionSourceLines = new Set(subscription.items.map((item) => item.contractSnapshotLineId));
      if (dto.lines.some((line) => line.sourceSnapshotLineId && !subscriptionSourceLines.has(line.sourceSnapshotLineId)))
        throw new BadRequestException('INVOICE_LINE_SOURCE_OUT_OF_SUBSCRIPTION');
      const seen = new Set(dto.lines.map((line) => line.displayOrder));
      if (seen.size !== dto.lines.length) throw new BadRequestException('INVOICE_LINE_ORDER_DUPLICATE');
      const lines = dto.lines.map((line) => {
        const quantity = new Prisma.Decimal(line.quantity);
        const unit = BigInt(line.unitAmountMinor);
        const adjustment = BigInt(line.adjustmentMinor ?? '0');
        const raw = quantity.mul(unit.toString());
        const subtotal = BigInt(raw.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0)) + adjustment;
        if (subtotal < 0n) throw new BadRequestException('INVOICE_LINE_NEGATIVE');
        return { ...line, quantity, unitAmountMinor: unit, adjustmentMinor: adjustment, subtotalMinor: subtotal };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.subtotalMinor, 0n);
      const taxableSubtotal = lines.filter((line) => line.taxable).reduce((sum, line) => sum + line.subtotalMinor, 0n);
      const federal = this.tax(taxableSubtotal, tax.federalRatePartsPerMillion);
      const provincial = this.tax(taxableSubtotal, tax.provincialRatePartsPerMillion);
      const created = await tx.commercialInvoice.create({ data: {
        organizationId, subscriptionId: subscription.id, taxConfigurationId: tax.id,
        periodStart: start, periodEnd: end, currency: 'CAD', subtotalMinor: subtotal,
        federalTaxMinor: federal, provincialTaxMinor: provincial, totalMinor: subtotal + federal + provincial,
        idempotencyKey: dto.idempotencyKey, lifecycleReason: reason, createdByUserId: actor.userId,
        lines: { create: lines.map((line) => ({ description: line.description, sourceSnapshotLineId: line.sourceSnapshotLineId, quantity: line.quantity, unitAmountMinor: line.unitAmountMinor, subtotalMinor: line.subtotalMinor, adjustmentMinor: line.adjustmentMinor, taxable: line.taxable, displayOrder: line.displayOrder })) },
      }, include: invoiceInclude });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'COMMERCIAL_INVOICE_DRAFT_CREATED', targetType: 'CommercialInvoice', targetId: created.id, organizationId, reason, afterData: this.json({ status: created.status, totalMinor: created.totalMinor, currency: created.currency }) });
      return this.serialize(created);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async transition(organizationId: string, id: string, action: 'approve' | 'issue' | 'past-due' | 'cancel', dto: BillingTransitionDto | IssueInvoiceDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    const rules: Record<string, { from: CommercialInvoiceStatus[]; to: CommercialInvoiceStatus }> = {
      approve: { from: ['DRAFT'], to: 'APPROVED' }, issue: { from: ['APPROVED'], to: 'ISSUED' },
      'past-due': { from: ['ISSUED', 'PARTIAL'], to: 'PAST_DUE' }, cancel: { from: ['DRAFT', 'APPROVED', 'ISSUED'], to: 'CANCELLED' },
    };
    const rule = rules[action];
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.commercialInvoice.findFirst({ where: { id, organizationId } });
      if (!before) throw new NotFoundException('Facture introuvable.');
      if (!rule.from.includes(before.status)) throw new BadRequestException('INVOICE_TRANSITION_INVALID');
      const number = action === 'issue' ? (dto as IssueInvoiceDto).invoiceNumber : undefined;
      if (action === 'issue' && !number) throw new BadRequestException('INVOICE_NUMBER_REQUIRED');
      const now = new Date();
      const result = await tx.commercialInvoice.updateMany({ where: { id, organizationId, status: before.status, lockVersion: dto.lockVersion }, data: {
        status: rule.to, number, lifecycleReason: reason, lockVersion: { increment: 1 },
        approvedAt: action === 'approve' ? now : undefined,
        issuedAt: action === 'issue' ? now : undefined,
        dueDate: action === 'issue' ? new Date(now.getTime() + 30 * 86400000) : undefined,
        pastDueAt: action === 'past-due' ? now : undefined,
        cancelledAt: action === 'cancel' ? now : undefined,
      } });
      if (result.count !== 1) throw new ConflictException('INVOICE_VERSION_CONFLICT');
      const after = await tx.commercialInvoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude });
      await this.audit.record(tx, { actorUserId: actor.userId, action: `COMMERCIAL_INVOICE_${rule.to}`, targetType: 'CommercialInvoice', targetId: id, targetLabel: after.number, organizationId, reason, beforeData: this.json({ status: before.status }), afterData: this.json({ status: after.status, dueDate: after.dueDate, automaticSubscriptionSuspension: false }) });
      return this.serialize(after);
    });
  }

  async recordPayment(organizationId: string, id: string, dto: RecordPaymentDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    const amount = BigInt(dto.amountMinor);
    if (amount <= 0n) throw new BadRequestException('PAYMENT_AMOUNT_INVALID');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.commercialPayment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) {
        if (existing.invoiceId !== id) throw new ConflictException('IDEMPOTENCY_KEY_CONFLICT');
        const existingInvoice = await tx.commercialInvoice.findFirst({ where: { id, organizationId } });
        if (!existingInvoice) throw new ConflictException('IDEMPOTENCY_KEY_CONFLICT');
        return this.serialize(existing);
      }
      const invoice = await tx.commercialInvoice.findFirst({ where: { id, organizationId, status: { in: ['ISSUED', 'PARTIAL', 'PAST_DUE'] } } });
      if (!invoice) throw new BadRequestException('PAYABLE_INVOICE_REQUIRED');
      if (invoice.paidMinor + amount > invoice.totalMinor) throw new BadRequestException('PAYMENT_EXCEEDS_BALANCE');
      const paidMinor = invoice.paidMinor + amount;
      const status: CommercialInvoiceStatus = paidMinor === invoice.totalMinor ? 'PAID' : 'PARTIAL';
      const payment = await tx.commercialPayment.create({ data: { invoiceId: id, amountMinor: amount, currency: 'CAD', paidAt: new Date(dto.paidAt), evidenceReference: dto.evidenceReference, idempotencyKey: dto.idempotencyKey, reason, recordedByUserId: actor.userId } });
      await tx.commercialInvoice.update({ where: { id }, data: { paidMinor, status, lockVersion: { increment: 1 } } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'COMMERCIAL_PAYMENT_RECORDED', targetType: 'CommercialPayment', targetId: payment.id, organizationId, reason, afterData: this.json({ invoiceId: id, amountMinor: amount, status }) });
      return this.serialize(payment);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async createCreditNote(organizationId: string, invoiceId: string, dto: CreateCreditNoteDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    const amount = BigInt(dto.amountMinor);
    if (amount <= 0n) throw new BadRequestException('CREDIT_NOTE_AMOUNT_INVALID');
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.commercialInvoice.findFirst({ where: { id: invoiceId, organizationId, status: { in: ['ISSUED', 'PARTIAL', 'PAID', 'PAST_DUE'] } } });
      if (!invoice || amount > invoice.totalMinor) throw new BadRequestException('CREDIT_NOTE_INVOICE_INVALID');
      const created = await tx.commercialCreditNote.create({ data: { invoiceId, amountMinor: amount, reason, createdByUserId: actor.userId } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'COMMERCIAL_CREDIT_NOTE_DRAFT_CREATED', targetType: 'CommercialCreditNote', targetId: created.id, organizationId, reason, afterData: this.json({ invoiceId, amountMinor: amount }) });
      return this.serialize(created);
    });
  }

  async approveCreditNote(organizationId: string, invoiceId: string, id: string, dto: ApproveCreditNoteDto, actor: Actor) {
    return this.creditTransition(organizationId, invoiceId, id, 'approve', dto, actor);
  }

  async issueCreditNote(organizationId: string, invoiceId: string, id: string, dto: IssueCreditNoteDto, actor: Actor) {
    return this.creditTransition(organizationId, invoiceId, id, 'issue', dto, actor);
  }

  private async creditTransition(organizationId: string, invoiceId: string, id: string, action: 'approve' | 'issue', dto: ApproveCreditNoteDto | IssueCreditNoteDto, actor: Actor) {
    const reason = this.audit.normalizeReason(dto.reason, true)!;
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.commercialCreditNote.findFirst({ where: { id, invoiceId, invoice: { organizationId } } });
      const expected = action === 'approve' ? 'DRAFT' : 'APPROVED';
      if (!before || before.status !== expected) throw new BadRequestException('CREDIT_NOTE_TRANSITION_INVALID');
      const result = await tx.commercialCreditNote.updateMany({ where: { id, invoiceId, status: expected, lockVersion: dto.lockVersion }, data: action === 'approve'
        ? { status: 'APPROVED', approvalReference: (dto as ApproveCreditNoteDto).approvalReference, approvedAt: new Date(), lockVersion: { increment: 1 } }
        : { status: 'ISSUED', number: (dto as IssueCreditNoteDto).creditNoteNumber, issuedAt: new Date(), lockVersion: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('CREDIT_NOTE_VERSION_CONFLICT');
      const after = await tx.commercialCreditNote.findUniqueOrThrow({ where: { id } });
      await this.audit.record(tx, { actorUserId: actor.userId, action: `COMMERCIAL_CREDIT_NOTE_${after.status}`, targetType: 'CommercialCreditNote', targetId: id, targetLabel: after.number, organizationId, reason, beforeData: this.json({ status: before.status }), afterData: this.json({ status: after.status }) });
      return this.serialize(after);
    });
  }

  private tax(subtotal: bigint, ratePartsPerMillion: number) {
    return BigInt(new Prisma.Decimal(subtotal.toString()).mul(ratePartsPerMillion).div(1_000_000).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0));
  }

  private json(value: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item)) as Prisma.InputJsonValue;
  }

  private serialize<T>(value: T): T {
    return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item)) as T;
  }
}
