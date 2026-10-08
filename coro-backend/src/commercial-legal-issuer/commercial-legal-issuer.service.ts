import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  LegalIssuerReasonDto,
  UpdateLegalIssuerDraftDto,
} from './commercial-legal-issuer.dto';

type Actor = { userId: string };
const include = {
  versions: {
    orderBy: { versionNumber: 'desc' as const },
    include: { snapshots: true },
  },
};

@Injectable()
export class CommercialLegalIssuerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  list() {
    return this.prisma.commercialLegalIssuer.findMany({
      include,
      orderBy: { code: 'asc' },
    });
  }

  createCoroDraft(actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const code = 'CORO';
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${code}, 0))`;
      if (await tx.commercialLegalIssuer.findUnique({ where: { code } }))
        throw new ConflictException('CORO legal issuer already exists.');
      const issuer = await tx.commercialLegalIssuer.create({ data: { code } });
      const data = this.normalize({
        legalName: 'MATHIEU MONTAROUX, faisant affaire sous le nom CORO',
        tradeName: 'CORO',
        provenance: 'ADMINISTRATIVE_BASE_TO_VERIFY',
        businessNumberApplicability: 'UNSPECIFIED',
        federalTaxApplicability: 'UNSPECIFIED',
        provincialTaxApplicability: 'UNSPECIFIED',
      });
      const version = await tx.commercialLegalIssuerVersion.create({
        data: {
          commercialLegalIssuerId: issuer.id,
          versionNumber: 1,
          ...data,
          contentHash: this.hash(data),
          createdByUserId: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'COMMERCIAL_LEGAL_ISSUER_DRAFT_CREATED',
        version.id,
        {
          issuerId: issuer.id,
          status: 'DRAFT',
          contentHash: version.contentHash,
        },
      );
      return version;
    });
  }

  updateDraft(id: string, dto: UpdateLegalIssuerDraftDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'DRAFT')
        throw new ConflictException('Only DRAFT issuer versions are editable.');
      const data = this.normalize(dto);
      this.validateApplicability(data, false);
      const result = await tx.commercialLegalIssuerVersion.updateMany({
        where: { id, status: 'DRAFT', lockVersion: dto.lockVersion },
        data: {
          ...data,
          contentHash: this.hash(data),
          lockVersion: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException('Legal issuer version conflict.');
      const after = await this.version(tx, id);
      await this.record(
        tx,
        actor,
        'COMMERCIAL_LEGAL_ISSUER_DRAFT_UPDATED',
        id,
        {
          issuerId: after.commercialLegalIssuerId,
          previousHash: current.contentHash,
          contentHash: after.contentHash,
        },
      );
      return after;
    });
  }

  createRevision(code: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${code}, 0))`;
      const issuer = await tx.commercialLegalIssuer.findUnique({
        where: { code },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      });
      if (!issuer?.versions[0])
        throw new NotFoundException('Legal issuer not found.');
      if (
        await tx.commercialLegalIssuerVersion.count({
          where: { commercialLegalIssuerId: issuer.id, status: 'DRAFT' },
        })
      )
        throw new ConflictException('A DRAFT issuer version already exists.');
      const source = issuer.versions[0];
      if (source.status === 'DRAFT')
        throw new ConflictException('A verified source version is required.');
      const data = this.normalizedFromVersion(source);
      const version = await tx.commercialLegalIssuerVersion.create({
        data: {
          commercialLegalIssuerId: issuer.id,
          versionNumber: source.versionNumber + 1,
          ...data,
          contentHash: this.hash(data),
          createdByUserId: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'COMMERCIAL_LEGAL_ISSUER_REVISION_CREATED',
        version.id,
        { issuerId: issuer.id, sourceVersionId: source.id },
      );
      return version;
    });
  }

  verify(id: string, dto: LegalIssuerReasonDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'DRAFT')
        throw new ConflictException('DRAFT issuer version required.');
      this.validateForVerification(current);
      const result = await tx.commercialLegalIssuerVersion.updateMany({
        where: { id, status: 'DRAFT', lockVersion: dto.lockVersion },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedByUserId: actor.userId,
          lifecycleReason: dto.reason.trim(),
          lockVersion: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException('Legal issuer version conflict.');
      const after = await this.version(tx, id);
      await this.record(tx, actor, 'COMMERCIAL_LEGAL_ISSUER_VERIFIED', id, {
        issuerId: after.commercialLegalIssuerId,
        status: after.status,
        contentHash: after.contentHash,
      });
      return after;
    });
  }

  archive(id: string, dto: LegalIssuerReasonDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.version(tx, id);
      if (current.status !== 'VERIFIED')
        throw new ConflictException('VERIFIED issuer version required.');
      const result = await tx.commercialLegalIssuerVersion.updateMany({
        where: { id, status: 'VERIFIED', lockVersion: dto.lockVersion },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          archivedByUserId: actor.userId,
          lifecycleReason: dto.reason.trim(),
          lockVersion: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException('Legal issuer version conflict.');
      const after = await this.version(tx, id);
      await this.record(tx, actor, 'COMMERCIAL_LEGAL_ISSUER_ARCHIVED', id, {
        issuerId: after.commercialLegalIssuerId,
        status: after.status,
      });
      return after;
    });
  }

  captureSnapshot(
    proposalRevisionId: string,
    issuerCode: string,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${proposalRevisionId}, 0))`;
      if (
        !(await tx.commercialProposalRevision.findUnique({
          where: { id: proposalRevisionId },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Proposal revision not found.');
      const issuer = await tx.commercialLegalIssuer.findUnique({
        where: { code: issuerCode },
        include: {
          versions: {
            where: { status: 'VERIFIED' },
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      });
      const version = issuer?.versions[0];
      if (!issuer || !version)
        throw new BadRequestException(
          'A VERIFIED legal issuer version is required.',
        );
      const snapshot = this.snapshotPayload(issuer.code, version);
      try {
        const created = await tx.commercialLegalIssuerSnapshot.create({
          data: {
            proposalRevisionId,
            legalIssuerVersionId: version.id,
            ...snapshot,
            snapshotHash: this.hash(snapshot),
            capturedByUserId: actor.userId,
          },
        });
        await this.record(
          tx,
          actor,
          'COMMERCIAL_LEGAL_ISSUER_SNAPSHOT_CAPTURED',
          created.id,
          {
            proposalRevisionId,
            legalIssuerVersionId: version.id,
            snapshotHash: created.snapshotHash,
          },
        );
        return created;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
          throw new ConflictException(
            'Proposal revision already has a legal issuer snapshot.',
          );
        throw error;
      }
    });
  }

  private async version(tx: Prisma.TransactionClient, id: string) {
    const value = await tx.commercialLegalIssuerVersion.findUnique({
      where: { id },
    });
    if (!value) throw new NotFoundException('Legal issuer version not found.');
    return value;
  }
  private clean(value?: string | null) {
    return value?.trim() || null;
  }
  private normalize(
    value:
      | (Partial<UpdateLegalIssuerDraftDto> & {
          legalName: string;
          provenance: string;
        })
      | Awaited<ReturnType<CommercialLegalIssuerService['version']>>,
  ) {
    return {
      legalName: value.legalName.trim(),
      tradeName: this.clean(value.tradeName),
      legalForm: this.clean(value.legalForm),
      country: this.clean(value.country)?.toUpperCase() ?? null,
      subdivision: this.clean(value.subdivision),
      addressLine1: this.clean(value.addressLine1),
      addressLine2: this.clean(value.addressLine2),
      city: this.clean(value.city),
      postalCode: this.clean(value.postalCode),
      officialEmail: this.clean(value.officialEmail)?.toLowerCase() ?? null,
      officialPhone: this.clean(value.officialPhone),
      website: this.clean(value.website),
      businessNumber: this.clean(value.businessNumber),
      businessNumberApplicability:
        value.businessNumberApplicability ?? 'UNSPECIFIED',
      federalTaxNumber: this.clean(value.federalTaxNumber),
      federalTaxApplicability: value.federalTaxApplicability ?? 'UNSPECIFIED',
      provincialTaxNumber: this.clean(value.provincialTaxNumber),
      provincialTaxApplicability:
        value.provincialTaxApplicability ?? 'UNSPECIFIED',
      referenceCurrency:
        this.clean(value.referenceCurrency)?.toUpperCase() ?? null,
      representativeName: this.clean(value.representativeName),
      representativeTitle: this.clean(value.representativeTitle),
      representativeEmail:
        this.clean(value.representativeEmail)?.toLowerCase() ?? null,
      authorizedSignatoryName: this.clean(value.authorizedSignatoryName),
      authorizedSignatoryTitle: this.clean(value.authorizedSignatoryTitle),
      authorizedSignatoryEmail:
        this.clean(value.authorizedSignatoryEmail)?.toLowerCase() ?? null,
      provenance: value.provenance.trim(),
    } as const;
  }
  private normalizedFromVersion(
    value: Awaited<ReturnType<CommercialLegalIssuerService['version']>>,
  ) {
    return this.normalize(value);
  }
  private validateApplicability(
    value: ReturnType<CommercialLegalIssuerService['normalize']>,
    requireDecision: boolean,
  ) {
    for (const [status, field] of [
      [value.businessNumberApplicability, value.businessNumber],
      [value.federalTaxApplicability, value.federalTaxNumber],
      [value.provincialTaxApplicability, value.provincialTaxNumber],
    ] as const) {
      if (requireDecision && status === 'UNSPECIFIED')
        throw new BadRequestException(
          'Legal and tax applicability must be decided before verification.',
        );
      if (status === 'APPLICABLE' && !field)
        throw new BadRequestException(
          'An applicable legal identifier requires a value.',
        );
      if (status === 'NOT_APPLICABLE' && field)
        throw new BadRequestException(
          'A non-applicable legal identifier must be empty.',
        );
    }
  }
  private validateForVerification(
    value: Awaited<ReturnType<CommercialLegalIssuerService['version']>>,
  ) {
    const required = [
      value.tradeName,
      value.legalForm,
      value.country,
      value.addressLine1,
      value.city,
      value.postalCode,
      value.officialEmail,
      value.officialPhone,
      value.referenceCurrency,
    ];
    if (required.some((item) => !item?.trim()))
      throw new BadRequestException(
        'Required legal issuer fields are incomplete.',
      );
    this.validateApplicability(this.normalizedFromVersion(value), true);
  }
  private snapshotPayload(
    code: string,
    v: Awaited<ReturnType<CommercialLegalIssuerService['version']>>,
  ) {
    return {
      issuerCode: code,
      issuerVersionNumber: v.versionNumber,
      legalName: v.legalName,
      tradeName: v.tradeName,
      legalForm: v.legalForm,
      country: v.country,
      subdivision: v.subdivision,
      addressLine1: v.addressLine1,
      addressLine2: v.addressLine2,
      city: v.city,
      postalCode: v.postalCode,
      officialEmail: v.officialEmail,
      officialPhone: v.officialPhone,
      website: v.website,
      businessNumber: v.businessNumber,
      businessNumberApplicability: v.businessNumberApplicability,
      federalTaxNumber: v.federalTaxNumber,
      federalTaxApplicability: v.federalTaxApplicability,
      provincialTaxNumber: v.provincialTaxNumber,
      provincialTaxApplicability: v.provincialTaxApplicability,
      referenceCurrency: v.referenceCurrency,
      representativeName: v.representativeName,
      representativeTitle: v.representativeTitle,
      representativeEmail: v.representativeEmail,
      authorizedSignatoryName: v.authorizedSignatoryName,
      authorizedSignatoryTitle: v.authorizedSignatoryTitle,
      authorizedSignatoryEmail: v.authorizedSignatoryEmail,
    } as const;
  }
  private hash(value: unknown) {
    const canonical = (input: unknown): unknown =>
      Array.isArray(input)
        ? input.map(canonical)
        : input && typeof input === 'object'
          ? Object.fromEntries(
              Object.entries(input)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, item]) => [key, canonical(item)]),
            )
          : input;
    return createHash('sha256')
      .update(JSON.stringify(canonical(value)))
      .digest('hex');
  }
  private record(
    tx: Prisma.TransactionClient,
    actor: Actor,
    action: string,
    targetId: string,
    afterData: Record<string, unknown>,
  ) {
    return this.audit.record(tx, {
      actorUserId: actor.userId,
      action,
      targetType: 'CommercialLegalIssuer',
      targetId,
      afterData: afterData as Prisma.InputJsonObject,
    });
  }
}
