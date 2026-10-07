import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, CommercialContentVersionStatus } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CommercialContentReasonDto,
  UpdateCommercialContentVersionDto,
} from './commercial-content.dto';
import { isKnownCommercialContentTarget } from './commercial-content.registry';
import { PROFESSIONAL_CONTENT_DRAFT } from './professional-content.draft';

type Actor = { userId: string };
const include = { bindings: { orderBy: { displayOrder: 'asc' as const } } };

@Injectable()
export class CommercialContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  list() {
    return this.prisma.commercialContent.findMany({
      include: { versions: { include, orderBy: { versionNumber: 'desc' } } },
      orderBy: { code: 'asc' },
    });
  }

  async detail(code: string) {
    const content = await this.prisma.commercialContent.findUnique({
      where: { code },
      include: { versions: { include, orderBy: { versionNumber: 'desc' } } },
    });
    if (!content) throw new NotFoundException('Commercial content not found.');
    return content;
  }

  createProfessionalDraft(actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${PROFESSIONAL_CONTENT_DRAFT.code}, 0))`;
      const existing = await tx.commercialContent.findUnique({
        where: { code: PROFESSIONAL_CONTENT_DRAFT.code },
      });
      if (existing)
        throw new ConflictException(
          'CORO Professional content already exists.',
        );
      const payload = PROFESSIONAL_CONTENT_DRAFT;
      this.validateBindings(payload.bindings);
      const content = await tx.commercialContent.create({
        data: { code: payload.code },
      });
      const version = await tx.commercialContentVersion.create({
        data: {
          commercialContentId: content.id,
          versionNumber: 1,
          titleFR: payload.titleFR,
          descriptionFR: payload.descriptionFR,
          provenance: payload.provenance,
          contentHash: this.hash(payload),
          createdByUserId: actor.userId,
          bindings: {
            create: payload.bindings.map((binding) => ({ ...binding })),
          },
        },
        include,
      });
      await this.record(
        tx,
        actor,
        'COMMERCIAL_CONTENT_DRAFT_CREATED',
        version,
        { code: payload.code },
      );
      return version;
    });
  }

  updateDraft(
    id: string,
    dto: UpdateCommercialContentVersionDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'DRAFT')
        throw new ConflictException('Only DRAFT content is editable.');
      this.validateBindings(dto.bindings);
      const payload = this.payload(dto);
      const updated = await tx.commercialContentVersion.updateMany({
        where: { id, status: 'DRAFT', lockVersion: dto.lockVersion },
        data: {
          titleFR: payload.titleFR,
          titleEN: payload.titleEN,
          descriptionFR: payload.descriptionFR,
          descriptionEN: payload.descriptionEN,
          provenance: payload.provenance,
          contentHash: this.hash(payload),
          lockVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new ConflictException('Content version conflict.');
      await tx.commercialContentBinding.deleteMany({
        where: { commercialContentVersionId: id },
      });
      await tx.commercialContentBinding.createMany({
        data: dto.bindings.map((binding) => ({
          ...binding,
          commercialContentVersionId: id,
        })),
      });
      const after = await this.version(tx, id);
      await this.record(tx, actor, 'COMMERCIAL_CONTENT_DRAFT_UPDATED', after, {
        previousHash: current.contentHash,
        contentHash: after.contentHash,
      });
      return after;
    });
  }

  createRevision(code: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${code}, 0))`;
      const content = await tx.commercialContent.findUnique({
        where: { code },
        include: {
          versions: { include, orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });
      if (!content || !content.versions[0]) throw new NotFoundException();
      if (
        await tx.commercialContentVersion.count({
          where: {
            commercialContentId: content.id,
            status: { in: ['DRAFT', 'IN_REVIEW'] },
          },
        })
      )
        throw new ConflictException('An open revision already exists.');
      const source = content.versions[0];
      const version = await tx.commercialContentVersion.create({
        data: {
          commercialContentId: content.id,
          versionNumber: source.versionNumber + 1,
          titleFR: source.titleFR,
          titleEN: source.titleEN,
          descriptionFR: source.descriptionFR,
          descriptionEN: source.descriptionEN,
          provenance: source.provenance,
          contentHash: source.contentHash,
          createdByUserId: actor.userId,
          bindings: {
            create: source.bindings.map(
              ({
                targetType,
                targetCode,
                labelFR,
                labelEN,
                commercialIntent,
                deliveryMaturity,
                evidence,
                displayOrder,
              }) => ({
                targetType,
                targetCode,
                labelFR,
                labelEN,
                commercialIntent,
                deliveryMaturity,
                evidence,
                displayOrder,
              }),
            ),
          },
        },
        include,
      });
      await this.record(
        tx,
        actor,
        'COMMERCIAL_CONTENT_REVISION_CREATED',
        version,
        { sourceVersionId: source.id },
      );
      return version;
    });
  }

  submit(id: string, dto: CommercialContentReasonDto, actor: Actor) {
    return this.transition(id, 'DRAFT', 'IN_REVIEW', dto, actor);
  }
  returnToDraft(id: string, dto: CommercialContentReasonDto, actor: Actor) {
    return this.transition(id, 'IN_REVIEW', 'DRAFT', dto, actor);
  }

  approve(id: string, dto: CommercialContentReasonDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== 'IN_REVIEW')
        throw new ConflictException('IN_REVIEW content required.');
      if (
        !current.titleEN?.trim() ||
        !current.descriptionEN?.trim() ||
        current.bindings.some((binding) => !binding.labelEN?.trim())
      )
        throw new BadRequestException(
          'English content is required for approval.',
        );
      if (
        current.bindings.some(
          (binding) =>
            binding.commercialIntent === 'INCLUDED' &&
            binding.deliveryMaturity === 'UNVERIFIED',
        )
      )
        throw new BadRequestException(
          'INCLUDED content cannot be approved while UNVERIFIED.',
        );
      return this.applyTransition(tx, current, 'APPROVED', dto, actor);
    });
  }

  archive(id: string, dto: CommercialContentReasonDto, actor: Actor) {
    return this.transition(id, 'APPROVED', 'ARCHIVED', dto, actor);
  }

  private transition(
    id: string,
    expected: CommercialContentVersionStatus,
    target: CommercialContentVersionStatus,
    dto: CommercialContentReasonDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await this.version(tx, id);
      if (current.status !== expected)
        throw new ConflictException(`${expected} content required.`);
      return this.applyTransition(tx, current, target, dto, actor);
    });
  }

  private async applyTransition(
    tx: Prisma.TransactionClient,
    current: Awaited<ReturnType<CommercialContentService['version']>>,
    target: CommercialContentVersionStatus,
    dto: CommercialContentReasonDto,
    actor: Actor,
  ) {
    const now = new Date();
    const data: Prisma.CommercialContentVersionUncheckedUpdateManyInput = {
      status: target,
      lifecycleReason: dto.reason.trim(),
      lockVersion: { increment: 1 },
    };
    if (target === 'IN_REVIEW')
      Object.assign(data, {
        submittedAt: now,
        submittedByUserId: actor.userId,
      });
    if (target === 'DRAFT')
      Object.assign(data, { submittedAt: null, submittedByUserId: null });
    if (target === 'APPROVED')
      Object.assign(data, { approvedAt: now, approvedByUserId: actor.userId });
    if (target === 'ARCHIVED')
      Object.assign(data, { archivedAt: now, archivedByUserId: actor.userId });
    const result = await tx.commercialContentVersion.updateMany({
      where: {
        id: current.id,
        status: current.status,
        lockVersion: dto.lockVersion,
      },
      data,
    });
    if (result.count !== 1)
      throw new ConflictException('Content version conflict.');
    const after = await this.version(tx, current.id);
    await this.record(tx, actor, `COMMERCIAL_CONTENT_${target}`, after, {
      beforeStatus: current.status,
      status: target,
      reason: dto.reason,
    });
    return after;
  }

  private async version(tx: Prisma.TransactionClient, id: string) {
    const version = await tx.commercialContentVersion.findUnique({
      where: { id },
      include,
    });
    if (!version)
      throw new NotFoundException('Commercial content version not found.');
    return version;
  }

  private payload(dto: UpdateCommercialContentVersionDto) {
    return {
      titleFR: dto.titleFR.trim(),
      titleEN: dto.titleEN?.trim() || null,
      descriptionFR: dto.descriptionFR.trim(),
      descriptionEN: dto.descriptionEN?.trim() || null,
      provenance: dto.provenance.trim(),
      bindings: dto.bindings,
    };
  }

  private validateBindings(
    bindings: readonly {
      targetType: 'FAMILY' | 'CAPABILITY' | 'COMPONENT' | 'FUNCTIONAL_FEATURE';
      targetCode: string;
      commercialIntent: string;
      deliveryMaturity: string;
    }[],
  ) {
    const seen = new Set<string>();
    for (const binding of bindings) {
      const key = `${binding.targetType}:${binding.targetCode}`;
      if (seen.has(key))
        throw new BadRequestException(`DUPLICATE_CONTENT_BINDING:${key}`);
      seen.add(key);
      if (
        !isKnownCommercialContentTarget(binding.targetType, binding.targetCode)
      )
        throw new BadRequestException(`UNKNOWN_CONTENT_TARGET:${key}`);
      if (
        binding.commercialIntent === 'FUTURE' &&
        binding.deliveryMaturity !== 'FUTURE'
      )
        throw new BadRequestException(`FUTURE_CONTENT_MATURITY_INVALID:${key}`);
    }
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private record(
    tx: Prisma.TransactionClient,
    actor: Actor,
    action: string,
    version: { id: string; commercialContentId: string },
    afterData: Record<string, unknown>,
  ) {
    return this.audit.record(tx, {
      actorUserId: actor.userId,
      action,
      targetType: 'CommercialContentVersion',
      targetId: version.id,
      afterData: {
        commercialContentId: version.commercialContentId,
        ...afterData,
      },
    });
  }
}
