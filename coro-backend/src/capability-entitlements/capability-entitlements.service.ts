import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CapabilityCode, EntitlementLifecycle, Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEntitlementDto,
  EntitlementLimitDto,
  EntitlementTransitionDto,
} from './capability-entitlements.dto';
import { EntitlementResolver } from './entitlement-resolver.service';

type Actor = { userId: string };
@Injectable()
export class CapabilityEntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly resolver: EntitlementResolver,
  ) {}
  list(organizationId: string, clientId?: string, buildingId?: string) {
    return this.prisma.capabilityEntitlement.findMany({
      where: {
        organizationId,
        ...(buildingId
          ? { buildingId }
          : clientId
            ? { clientId, buildingId: null }
            : { scope: 'ORGANIZATION' }),
      },
      include: {
        capability: true,
        revisions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { limits: true },
        },
        parentEntitlement: { include: { capability: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async detail(organizationId: string, id: string) {
    const value = await this.prisma.capabilityEntitlement.findFirst({
      where: { id, organizationId },
      include: {
        capability: true,
        revisions: {
          orderBy: { versionNumber: 'desc' },
          include: { limits: true },
        },
        parentEntitlement: true,
      },
    });
    if (!value) throw new NotFoundException('Entitlement introuvable.');
    return value;
  }
  history(organizationId: string, id: string) {
    return this.detail(organizationId, id).then((x) => x.revisions);
  }
  resolve(
    organizationId: string,
    capabilityCode: CapabilityCode,
    clientId?: string,
    buildingId?: string,
    atTime?: string,
    asKnownAt?: string,
    observed?: string,
  ) {
    return this.resolver.resolve({
      organizationId,
      capabilityCode,
      clientId,
      buildingId,
      atTime: atTime ? new Date(atTime) : undefined,
      asKnownAt: asKnownAt ? new Date(asKnownAt) : undefined,
      observed: observed == null ? null : observed === 'true',
    });
  }
  async create(
    organizationId: string,
    dto: CreateEntitlementDto,
    actor: Actor,
  ) {
    this.validateDatesAndSource(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId}, 0))`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true },
      });
      const capability = await tx.commercialCapability.findUniqueOrThrow({
        where: { code: dto.capabilityCode as CapabilityCode },
      });
      if (dto.source === 'DISTRIBUTION')
        await this.validateParent(
          tx,
          dto.parentEntitlementId!,
          organizationId,
          capability.id,
          new Date(dto.effectiveFrom),
        );
      const entitlement = await tx.capabilityEntitlement.create({
        data: {
          organizationId,
          capabilityId: capability.id,
          scope: dto.scope,
          clientId: dto.clientId,
          buildingId: dto.buildingId,
          source: dto.source,
          parentEntitlementId: dto.parentEntitlementId,
          sourceContractId: dto.sourceContractId,
          sourceContractRevisionId: dto.sourceContractRevisionId,
          sourceSnapshotLineId: dto.sourceSnapshotLineId,
          provenanceReason: dto.provenanceReason?.trim() || null,
          createdByUserId: actor.userId,
          createdByDisplayName: `${user.firstName} ${user.lastName}`.trim(),
        },
      });
      const revision = await tx.capabilityEntitlementRevision.create({
        data: {
          entitlementId: entitlement.id,
          versionNumber: 1,
          lifecycle: 'GRANTED',
          enabled: dto.enabled,
          distributable: dto.distributable,
          decisionAt: new Date(dto.decisionAt),
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveUntil: dto.effectiveUntil
            ? new Date(dto.effectiveUntil)
            : null,
          reason: dto.reason,
          createdByUserId: actor.userId,
          createdByDisplayName: `${user.firstName} ${user.lastName}`.trim(),
          limits: { create: this.limits(dto.limits) },
        },
        include: { limits: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action:
          dto.source === 'DISTRIBUTION'
            ? 'ENTITLEMENT_DISTRIBUTED'
            : dto.source === 'MANUAL_OVERRIDE'
              ? 'ENTITLEMENT_OVERRIDE_CREATED'
              : 'ENTITLEMENT_CREATED',
        targetType: 'CapabilityEntitlement',
        targetId: entitlement.id,
        organizationId,
        reason: dto.reason,
        afterData: {
          capabilityCode: dto.capabilityCode,
          scope: dto.scope,
          source: dto.source,
          enabled: dto.enabled,
          distributable: dto.distributable,
          effectiveFrom: dto.effectiveFrom,
          effectiveUntil: dto.effectiveUntil ?? null,
        },
      });
      return { ...entitlement, revisions: [revision] };
    });
  }
  async transition(
    organizationId: string,
    id: string,
    lifecycle: EntitlementLifecycle,
    dto: EntitlementTransitionDto,
    actor: Actor,
    action: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const current = await tx.capabilityEntitlement.findFirst({
        where: { id, organizationId },
        include: { revisions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      });
      if (!current) throw new NotFoundException('Entitlement introuvable.');
      if (current.revisions[0]?.lifecycle === 'REVOKED')
        throw new ConflictException('Entitlement révoqué.');
      const updated = await tx.capabilityEntitlement.updateMany({
        where: { id, organizationId, lockVersion: dto.lockVersion },
        data: { lockVersion: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException('Conflit de version entitlement.');
      const prior = current.revisions[0];
      const revision = await tx.capabilityEntitlementRevision.create({
        data: {
          entitlementId: id,
          versionNumber: (prior?.versionNumber ?? 0) + 1,
          lifecycle,
          enabled: dto.enabled ?? prior?.enabled ?? false,
          distributable: dto.distributable ?? prior?.distributable ?? false,
          decisionAt: new Date(dto.decisionAt),
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveUntil: dto.effectiveUntil
            ? new Date(dto.effectiveUntil)
            : null,
          reason: dto.reason,
          createdByUserId: actor.userId,
          limits: { create: this.limits(dto.limits) },
        },
        include: { limits: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action,
        targetType: 'CapabilityEntitlement',
        targetId: id,
        organizationId,
        reason: dto.reason,
        beforeData: prior
          ? {
              versionNumber: prior.versionNumber,
              lifecycle: prior.lifecycle,
              enabled: prior.enabled,
              distributable: prior.distributable,
            }
          : undefined,
        afterData: {
          versionNumber: revision.versionNumber,
          lifecycle,
          enabled: revision.enabled,
          distributable: revision.distributable,
          effectiveFrom: revision.effectiveFrom.toISOString(),
          effectiveUntil: revision.effectiveUntil?.toISOString() ?? null,
        },
      });
      return revision;
    });
  }
  private limits(items?: EntitlementLimitDto[]) {
    return (items ?? []).map((x) => ({
      type: x.type,
      metricCode: x.metricCode ?? 'DEFAULT',
      unlimited: x.unlimited,
      quantity: x.quantity == null ? null : new Prisma.Decimal(x.quantity),
      periodStart: x.periodStart ? new Date(x.periodStart) : null,
      periodEnd: x.periodEnd ? new Date(x.periodEnd) : null,
    }));
  }
  private validateDatesAndSource(dto: CreateEntitlementDto) {
    if (
      dto.effectiveUntil &&
      new Date(dto.effectiveUntil) <= new Date(dto.effectiveFrom)
    )
      throw new BadRequestException('Période invalide.');
    if (
      ['MANUAL_OVERRIDE', 'TRIAL'].includes(dto.source) &&
      !dto.effectiveUntil
    )
      throw new BadRequestException('Une expiration est requise.');
  }
  private async validateParent(
    tx: Prisma.TransactionClient,
    parentId: string,
    organizationId: string,
    capabilityId: string,
    at: Date,
  ) {
    const parent = await tx.capabilityEntitlement.findFirst({
      where: {
        id: parentId,
        organizationId,
        capabilityId,
        scope: 'ORGANIZATION',
      },
      include: {
        revisions: {
          where: { effectiveFrom: { lte: at } },
          orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
          take: 1,
        },
      },
    });
    const r = parent?.revisions[0];
    if (
      !parent ||
      !r ||
      r.lifecycle !== 'GRANTED' ||
      !r.distributable ||
      (r.effectiveUntil && r.effectiveUntil <= at)
    )
      throw new BadRequestException('Parent de distribution non valide.');
  }
}
