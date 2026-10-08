import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { CommercialClauseVersionStatus, Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClauseLegalReviewDto,
  ClauseReasonDto,
  UpdateCommercialClauseDraftDto,
} from './commercial-clause.dto';
import {
  allowedClauseParameterType,
  ClauseParameterDefinition,
  COMMERCIAL_CLAUSE_DRAFT_CATALOG,
} from './commercial-clause.registry';

type Actor = { userId: string };
const include = { applicabilities: { orderBy: { scope: 'asc' as const } } };

@Injectable()
export class CommercialClauseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  list() {
    return this.prisma.commercialClause.findMany({
      include: { versions: { include, orderBy: { versionNumber: 'desc' } } },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }

  approvedProjection() {
    return this.prisma.commercialClauseVersion.findMany({
      where: { status: 'APPROVED', commercialClause: { isActive: true } },
      select: {
        titleFR: true,
        titleEN: true,
        textFR: true,
        textEN: true,
        isRequired: true,
        effectiveAt: true,
        parameterSchema: true,
        commercialClause: { select: { code: true, category: true } },
        applicabilities: { select: { scope: true }, orderBy: { scope: 'asc' } },
      },
      orderBy: [{ commercialClauseId: 'asc' }, { versionNumber: 'desc' }],
    });
  }

  createDraftCatalog(actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('COMMERCIAL_CLAUSE_DRAFT_CATALOG', 0))`;
      const codes = COMMERCIAL_CLAUSE_DRAFT_CATALOG.map((item) => item.code);
      if (await tx.commercialClause.count({ where: { code: { in: codes } } }))
        throw new ConflictException(
          'Commercial clause draft catalog already exists.',
        );
      const created: unknown[] = [];
      for (const item of COMMERCIAL_CLAUSE_DRAFT_CATALOG) {
        const clause = await tx.commercialClause.create({
          data: { code: item.code, category: item.category },
        });
        const payload = {
          titleFR: item.titleFR,
          titleEN: item.titleEN,
          textFR: item.textFR,
          textEN: item.textEN,
          businessOwner: null,
          legalOwner: null,
          isRequired: null,
          effectiveAt: null,
          provenance: item.provenance,
          applicabilities: ['UNSPECIFIED'] as const,
          parameters: [] as ClauseParameterDefinition[],
        };
        const version = await tx.commercialClauseVersion.create({
          data: {
            commercialClauseId: clause.id,
            versionNumber: 1,
            ...this.versionData(payload),
            createdByUserId: actor.userId,
            applicabilities: { create: [{ scope: 'UNSPECIFIED' }] },
          },
          include,
        });
        await this.record(
          tx,
          actor,
          'COMMERCIAL_CLAUSE_DRAFT_CREATED',
          version,
          {
            code: item.code,
            category: item.category,
            contentHash: version.contentHash,
          },
        );
        created.push(version);
      }
      return created;
    });
  }

  updateDraft(id: string, dto: UpdateCommercialClauseDraftDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'DRAFT')
        throw new ConflictException('Only DRAFT clause versions are editable.');
      const payload = this.payload(dto);
      this.validatePayload(current.commercialClause.category, payload, false);
      const updated = await tx.commercialClauseVersion.updateMany({
        where: { id, status: 'DRAFT', lockVersion: dto.lockVersion },
        data: { ...this.versionData(payload), lockVersion: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException('Commercial clause version conflict.');
      await tx.commercialClauseApplicability.deleteMany({
        where: { commercialClauseVersionId: id },
      });
      await tx.commercialClauseApplicability.createMany({
        data: payload.applicabilities.map((scope) => ({
          commercialClauseVersionId: id,
          scope,
        })),
      });
      const after = await this.version(tx, id);
      await this.record(tx, actor, 'COMMERCIAL_CLAUSE_DRAFT_UPDATED', after, {
        previousHash: current.contentHash,
        contentHash: after.contentHash,
      });
      return after;
    });
  }

  createRevision(code: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${code}, 0))`;
      const clause = await tx.commercialClause.findUnique({
        where: { code },
        include: {
          versions: { include, orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });
      const source = clause?.versions[0];
      if (!clause || !source)
        throw new NotFoundException('Commercial clause not found.');
      if (
        await tx.commercialClauseVersion.count({
          where: {
            commercialClauseId: clause.id,
            status: { in: ['DRAFT', 'IN_REVIEW'] },
          },
        })
      )
        throw new ConflictException('An open clause revision already exists.');
      const version = await tx.commercialClauseVersion.create({
        data: {
          commercialClauseId: clause.id,
          versionNumber: source.versionNumber + 1,
          titleFR: source.titleFR,
          titleEN: source.titleEN,
          textFR: source.textFR,
          textEN: source.textEN,
          businessOwner: source.businessOwner,
          legalOwner: source.legalOwner,
          isRequired: source.isRequired,
          effectiveAt: source.effectiveAt,
          provenance: source.provenance,
          parameterSchema: source.parameterSchema as Prisma.InputJsonValue,
          contentHash: source.contentHash,
          createdByUserId: actor.userId,
          applicabilities: {
            create: source.applicabilities.map(({ scope }) => ({ scope })),
          },
        },
        include,
      });
      await this.record(
        tx,
        actor,
        'COMMERCIAL_CLAUSE_REVISION_CREATED',
        version,
        { sourceVersionId: source.id },
      );
      return version;
    });
  }

  submit(id: string, dto: ClauseReasonDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'DRAFT')
        throw new ConflictException('DRAFT clause version required.');
      const now = new Date();
      return this.applyTransition(tx, current, 'IN_REVIEW', dto, actor, {
        submittedAt: now,
        businessReviewedAt: now,
        businessReviewedByUserId: actor.userId,
        businessReviewReason: dto.reason.trim(),
      });
    });
  }

  returnToDraft(id: string, dto: ClauseReasonDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'IN_REVIEW')
        throw new ConflictException('IN_REVIEW clause version required.');
      return this.applyTransition(tx, current, 'DRAFT', dto, actor, {
        submittedAt: null,
        businessReviewedAt: null,
        businessReviewedByUserId: null,
        businessReviewReason: null,
        legalReviewedAt: null,
        legalReviewedByUserId: null,
        legalReviewReason: null,
        legalReviewEvidence: null,
      });
    });
  }

  recordLegalReview(id: string, dto: ClauseLegalReviewDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'IN_REVIEW')
        throw new ConflictException('IN_REVIEW clause version required.');
      const result = await tx.commercialClauseVersion.updateMany({
        where: { id, status: 'IN_REVIEW', lockVersion: dto.lockVersion },
        data: {
          legalReviewedAt: new Date(),
          legalReviewedByUserId: actor.userId,
          legalReviewReason: dto.reason.trim(),
          legalReviewEvidence: dto.evidence.trim(),
          lockVersion: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException('Commercial clause version conflict.');
      const after = await this.version(tx, id);
      await this.record(
        tx,
        actor,
        'COMMERCIAL_CLAUSE_LEGAL_REVIEW_RECORDED',
        after,
        {
          evidenceRecorded: true,
          evidenceHash: this.hash(dto.evidence.trim()),
        },
      );
      return after;
    });
  }

  approve(id: string, dto: ClauseReasonDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'IN_REVIEW')
        throw new ConflictException('IN_REVIEW clause version required.');
      this.validatePayload(
        current.commercialClause.category,
        {
          titleFR: current.titleFR,
          titleEN: current.titleEN,
          textFR: current.textFR,
          textEN: current.textEN,
          businessOwner: current.businessOwner,
          legalOwner: current.legalOwner,
          isRequired: current.isRequired,
          effectiveAt: current.effectiveAt,
          provenance: current.provenance,
          applicabilities: current.applicabilities.map(({ scope }) => scope),
          parameters:
            current.parameterSchema as unknown as ClauseParameterDefinition[],
        },
        true,
      );
      if (!current.businessReviewedAt || !current.businessReviewedByUserId)
        throw new BadRequestException('Business-owner review is required.');
      if (
        !current.legalReviewedAt ||
        !current.legalReviewedByUserId ||
        !current.legalReviewEvidence?.trim()
      )
        throw new BadRequestException('Legal-review evidence is required.');
      return this.applyTransition(tx, current, 'APPROVED', dto, actor, {
        approvedAt: new Date(),
        approvedByUserId: actor.userId,
      });
    });
  }

  archive(id: string, dto: ClauseReasonDto, actor: Actor) {
    return this.transition(id, 'APPROVED', 'ARCHIVED', dto, actor, {
      archivedAt: new Date(),
      archivedByUserId: actor.userId,
    });
  }

  private transition(
    id: string,
    expected: CommercialClauseVersionStatus,
    target: CommercialClauseVersionStatus,
    dto: ClauseReasonDto,
    actor: Actor,
    extra: Prisma.CommercialClauseVersionUncheckedUpdateManyInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== expected)
        throw new ConflictException(`${expected} clause version required.`);
      return this.applyTransition(tx, current, target, dto, actor, extra);
    });
  }

  private async applyTransition(
    tx: Prisma.TransactionClient,
    current: Awaited<ReturnType<CommercialClauseService['version']>>,
    target: CommercialClauseVersionStatus,
    dto: ClauseReasonDto,
    actor: Actor,
    extra: Prisma.CommercialClauseVersionUncheckedUpdateManyInput,
  ) {
    const result = await tx.commercialClauseVersion.updateMany({
      where: {
        id: current.id,
        status: current.status,
        lockVersion: dto.lockVersion,
      },
      data: {
        status: target,
        lifecycleReason: dto.reason.trim(),
        lockVersion: { increment: 1 },
        ...extra,
      },
    });
    if (result.count !== 1)
      throw new ConflictException('Commercial clause version conflict.');
    const after = await this.version(tx, current.id);
    await this.record(tx, actor, `COMMERCIAL_CLAUSE_${target}`, after, {
      beforeStatus: current.status,
      status: target,
      reason: dto.reason,
    });
    return after;
  }

  private async version(tx: Prisma.TransactionClient, id: string) {
    const version = await tx.commercialClauseVersion.findUnique({
      where: { id },
      include: { ...include, commercialClause: true },
    });
    if (!version)
      throw new NotFoundException('Commercial clause version not found.');
    return version;
  }

  private payload(dto: UpdateCommercialClauseDraftDto) {
    return {
      titleFR: dto.titleFR.trim(),
      titleEN: dto.titleEN.trim(),
      textFR: dto.textFR.trim(),
      textEN: dto.textEN.trim(),
      businessOwner: dto.businessOwner?.trim() || null,
      legalOwner: dto.legalOwner?.trim() || null,
      isRequired: dto.isRequired ?? null,
      effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : null,
      provenance: dto.provenance.trim(),
      applicabilities: [...new Set(dto.applicabilities)].sort(),
      parameters: [...dto.parameters].sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
    };
  }

  private versionData(
    payload:
      | ReturnType<CommercialClauseService['payload']>
      | Record<string, unknown>,
  ) {
    const value = payload as ReturnType<CommercialClauseService['payload']>;
    return {
      titleFR: value.titleFR,
      titleEN: value.titleEN,
      textFR: value.textFR,
      textEN: value.textEN,
      businessOwner: value.businessOwner,
      legalOwner: value.legalOwner,
      isRequired: value.isRequired,
      effectiveAt: value.effectiveAt,
      provenance: value.provenance,
      parameterSchema: value.parameters as unknown as Prisma.InputJsonValue,
      contentHash: this.hash({
        ...value,
        applicabilities: value.applicabilities,
        parameters: value.parameters,
      }),
    };
  }

  private validatePayload(
    category: Parameters<typeof allowedClauseParameterType>[0],
    payload: ReturnType<CommercialClauseService['payload']>,
    approval: boolean,
  ) {
    if (
      new Set(payload.applicabilities).size !== payload.applicabilities.length
    )
      throw new BadRequestException('Duplicate clause applicability.');
    if (
      payload.applicabilities.includes('UNSPECIFIED') &&
      payload.applicabilities.length > 1
    )
      throw new BadRequestException(
        'UNSPECIFIED applicability must be used alone.',
      );
    const seen = new Set<string>();
    for (const parameter of payload.parameters) {
      if (seen.has(parameter.key))
        throw new BadRequestException(
          `DUPLICATE_CLAUSE_PARAMETER:${parameter.key}`,
        );
      seen.add(parameter.key);
      const expected = allowedClauseParameterType(category, parameter.key);
      if (!expected || expected !== parameter.type)
        throw new BadRequestException(
          `CLAUSE_PARAMETER_NOT_ALLOWED:${parameter.key}`,
        );
    }
    if (approval) {
      if (
        !payload.businessOwner ||
        !payload.legalOwner ||
        payload.isRequired === null
      )
        throw new BadRequestException(
          'Clause ownership and required designation must be decided.',
        );
      if (payload.applicabilities.includes('UNSPECIFIED'))
        throw new BadRequestException('Clause applicability must be decided.');
      if (
        payload.textFR.includes('NOT_APPROVED') ||
        payload.textEN.includes('NOT_APPROVED')
      )
        throw new BadRequestException(
          'Placeholder clause text cannot be approved.',
        );
    }
  }

  private hash(value: unknown) {
    const canonical = (input: unknown): unknown =>
      Array.isArray(input)
        ? input.map(canonical)
        : input && typeof input === 'object'
          ? Object.fromEntries(
              Object.entries(input)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => [k, canonical(v)]),
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
    version: { id: string; commercialClauseId: string },
    afterData: Record<string, unknown>,
  ) {
    return this.audit.record(tx, {
      actorUserId: actor.userId,
      action,
      targetType: 'CommercialClauseVersion',
      targetId: version.id,
      afterData: {
        commercialClauseId: version.commercialClauseId,
        ...afterData,
      },
    });
  }
}
