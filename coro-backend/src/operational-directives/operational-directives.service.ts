import { createHash } from 'crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationalDirectiveStatus, OperationalFollowUpStatus, PlatformPermission, Prisma, UserRole } from '@prisma/client';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { AcknowledgeDirectiveDto, CreateDirectiveDto, CreateFollowUpDto, DirectiveTransitionDto, FollowUpTransitionDto, OperationalListQueryDto } from './dto/operational-directives.dto';
import { operationalDirectivesEnabled, operationalFollowUpsEnabled } from './operational-directives.config';
import { OperationalDirectivesAccessService } from './operational-directives-access.service';
import { isDirectiveTransitionAllowed, isFollowUpTransitionAllowed } from './operational-directives.policy';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class OperationalDirectivesService {
  constructor(private readonly prisma: PrismaService, private readonly access: OperationalDirectivesAccessService) {}
  private directivesFlag() { if (!operationalDirectivesEnabled()) throw new NotFoundException('Consigne introuvable.'); }
  private followUpsFlag() { if (!operationalFollowUpsEnabled()) throw new NotFoundException('Suivi introuvable.'); }

  async createDirective(organizationId: string, dto: CreateDirectiveDto, actor: AdviserActor) {
    this.directivesFlag();
    await this.access.require(actor, organizationId, dto.buildingId, PlatformPermission.OPERATIONAL_DIRECTIVE_CREATE);
    if (dto.expiresAt && dto.effectiveAt && new Date(dto.expiresAt) <= new Date(dto.effectiveAt)) throw new ConflictException("L'expiration doit suivre l'entree en vigueur.");
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.operationalDirective.findUnique({ where: { organizationId_creationIdempotencyKey: { organizationId, creationIdempotencyKey: dto.idempotencyKey } }, include: { versions: true } });
      if (existing) return existing;
      const directive = await tx.operationalDirective.create({ data: { organizationId, buildingId: dto.buildingId, zoneLabel: dto.zoneLabel, securityPost: dto.securityPost, title: dto.title, type: dto.type, priority: dto.priority, effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : null, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, targetCriteria: dto.targetCriteria as Prisma.InputJsonValue, acknowledgementRequired: dto.acknowledgementRequired, creationIdempotencyKey: dto.idempotencyKey, createdByUserId: actor.userId } });
      await tx.operationalDirectiveVersion.create({ data: { organizationId, buildingId: dto.buildingId, directiveId: directive.id, versionNumber: 1, title: dto.title, description: dto.description, targetSnapshot: dto.targetCriteria as Prisma.InputJsonValue, attachments: dto.attachments as Prisma.InputJsonValue | undefined, knowledgeReference: dto.knowledgeReference as Prisma.InputJsonValue | undefined, contentHash: hash(dto), authorUserId: actor.userId } });
      return tx.operationalDirective.findUniqueOrThrow({ where: { id: directive.id }, include: { versions: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listDirectives(organizationId: string, query: OperationalListQueryDto, actor: AdviserActor) {
    this.directivesFlag();
    await this.access.require(actor, organizationId, query.buildingId, PlatformPermission.OPERATIONAL_DIRECTIVE_READ);
    return this.prisma.operationalDirective.findMany({ where: { organizationId, buildingId: query.buildingId, ...(query.status ? { status: query.status as OperationalDirectiveStatus } : {}) }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 }, receipts: { where: { userId: actor.userId } } }, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }], take: query.limit });
  }

  async transitionDirective(organizationId: string, id: string, target: 'SUBMITTED' | 'APPROVED' | 'PUBLISHED' | 'REVOKED', dto: DirectiveTransitionDto, actor: AdviserActor) {
    this.directivesFlag();
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.operationalDirective.findFirst({ where: { id, organizationId }, include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
      if (!current) throw new NotFoundException('Consigne introuvable.');
      const permission = ({ SUBMITTED: PlatformPermission.OPERATIONAL_DIRECTIVE_EDIT, APPROVED: PlatformPermission.OPERATIONAL_DIRECTIVE_APPROVE, PUBLISHED: PlatformPermission.OPERATIONAL_DIRECTIVE_PUBLISH, REVOKED: PlatformPermission.OPERATIONAL_DIRECTIVE_REVOKE })[target];
      await this.access.require(actor, organizationId, current.buildingId, permission);
      if (current.status === target) return current;
      if (!isDirectiveTransitionAllowed(current.status, target)) throw new ConflictException('Transition de consigne invalide.');
      if (target === 'APPROVED' && current.createdByUserId === actor.userId) throw new ConflictException("Le createur ne peut pas approuver sa propre consigne.");
      const changed = await tx.operationalDirective.updateMany({ where: { id, organizationId, lockVersion: dto.lockVersion, status: current.status }, data: { status: target, lockVersion: { increment: 1 }, ...(target === 'APPROVED' ? { approvedByUserId: actor.userId, approvedAt: new Date() } : {}), ...(target === 'PUBLISHED' ? { publishedAt: new Date() } : {}), ...(target === 'REVOKED' ? { revokedAt: new Date() } : {}) } });
      if (changed.count !== 1) throw new ConflictException('La consigne a ete modifiee; rechargez-la.');
      if (target === 'PUBLISHED' && current.versions[0]) {
        const criteria = current.targetCriteria as {
          userIds?: string[];
          roles?: string[];
        };
        const grants = await tx.platformPermissionGrant.findMany({ where: { permission: PlatformPermission.OPERATIONAL_DIRECTIVE_READ, status: 'ACTIVE', scope: 'ORGANIZATION', targetOrganizationId: organizationId }, select: { userId: true } });
        const assignments = await tx.operationalLogBuildingAssignment.findMany({ where: { organizationId, buildingId: current.buildingId, status: 'ACTIVE', userId: { in: grants.map((g) => g.userId) }, ...(criteria.userIds?.length ? { userId: { in: criteria.userIds.filter((id) => grants.some((g) => g.userId === id)) } } : {}), ...(criteria.roles?.length ? { user: { role: { in: criteria.roles as UserRole[] } } } : {}) }, select: { userId: true } });
        const publishedAt = new Date();
        await tx.operationalDirectiveReceipt.createMany({ data: assignments.map((a) => ({ organizationId, buildingId: current.buildingId, directiveId: id, versionId: current.versions[0].id, userId: a.userId, publishedAt })), skipDuplicates: true });
      }
      await tx.auditLog.create({ data: { action: `OPERATIONAL_DIRECTIVE_${target}`, entityType: 'OperationalDirective', entityId: id, description: dto.reason ?? `Transition vers ${target}`, metadata: { fromStatus: current.status, toStatus: target, idempotencyKey: dto.idempotencyKey }, userId: actor.userId, organizationId } });
      return tx.operationalDirective.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async acknowledge(organizationId: string, id: string, dto: AcknowledgeDirectiveDto, actor: AdviserActor) {
    this.directivesFlag();
    const directive = await this.prisma.operationalDirective.findFirst({ where: { id, organizationId, status: 'PUBLISHED' } });
    if (!directive) throw new NotFoundException('Consigne introuvable.');
    await this.access.require(actor, organizationId, directive.buildingId, PlatformPermission.OPERATIONAL_DIRECTIVE_ACKNOWLEDGE);
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.operationalDirectiveReceipt.findFirst({ where: { organizationId, directiveId: id, versionId: dto.versionId, userId: actor.userId } });
      if (!receipt) throw new NotFoundException('Accuse de lecture introuvable.');
      if (receipt.confirmedAt) return receipt;
      await tx.operationalDirectiveReceipt.updateMany({ where: { id: receipt.id, confirmedAt: null, lockVersion: receipt.lockVersion }, data: { status: 'CONFIRMED', confirmedAt: new Date(), comment: dto.comment, reservation: dto.reservation, lockVersion: { increment: 1 } } });
      await tx.auditLog.create({ data: { action: 'OPERATIONAL_DIRECTIVE_CONFIRMED', entityType: 'OperationalDirectiveReceipt', entityId: receipt.id, description: 'Prise de connaissance explicite confirmee.', metadata: { directiveId: id, versionId: dto.versionId, idempotencyKey: dto.idempotencyKey }, userId: actor.userId, organizationId } });
      return tx.operationalDirectiveReceipt.findUniqueOrThrow({ where: { id: receipt.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async createFollowUp(organizationId: string, dto: CreateFollowUpDto, actor: AdviserActor) {
    this.followUpsFlag();
    await this.access.require(actor, organizationId, dto.buildingId, PlatformPermission.OPERATIONAL_FOLLOWUP_CREATE);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.operationalFollowUp.findUnique({ where: { organizationId_creationIdempotencyKey: { organizationId, creationIdempotencyKey: dto.idempotencyKey } } });
      if (existing) return existing;
      const followUp = await tx.operationalFollowUp.create({ data: { organizationId, buildingId: dto.buildingId, sourceType: dto.sourceType, sourceId: dto.sourceId, description: dto.description, priority: dto.priority, responsibleUserId: dto.responsibleUserId, dueAt: dto.dueAt ? new Date(dto.dueAt) : null, status: dto.responsibleUserId ? 'ASSIGNED' : 'OPEN', creationIdempotencyKey: dto.idempotencyKey, createdByUserId: actor.userId } });
      await tx.operationalFollowUpEvent.create({ data: { organizationId, buildingId: dto.buildingId, followUpId: followUp.id, action: 'CREATED', actorUserId: actor.userId, toStatus: followUp.status, idempotencyKey: `${dto.idempotencyKey}:created` } });
      return followUp;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listFollowUps(organizationId: string, query: OperationalListQueryDto, actor: AdviserActor) {
    this.followUpsFlag();
    await this.access.require(actor, organizationId, query.buildingId, PlatformPermission.OPERATIONAL_FOLLOWUP_READ);
    return this.prisma.operationalFollowUp.findMany({ where: { organizationId, buildingId: query.buildingId, ...(query.status ? { status: query.status as OperationalFollowUpStatus } : {}) }, include: { events: { orderBy: { occurredAt: 'desc' }, take: 5 } }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }], take: query.limit });
  }

  async transitionFollowUp(organizationId: string, id: string, target: OperationalFollowUpStatus, dto: FollowUpTransitionDto, actor: AdviserActor) {
    this.followUpsFlag();
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.operationalFollowUp.findFirst({ where: { id, organizationId } });
      if (!current) throw new NotFoundException('Suivi introuvable.');
      const prior = await tx.operationalFollowUpEvent.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: dto.idempotencyKey } } });
      if (prior) return current;
      const permission = target === 'ASSIGNED' ? PlatformPermission.OPERATIONAL_FOLLOWUP_ASSIGN : target === 'VERIFIED' ? PlatformPermission.OPERATIONAL_FOLLOWUP_VERIFY : target === 'CLOSED' ? PlatformPermission.OPERATIONAL_FOLLOWUP_CLOSE : PlatformPermission.OPERATIONAL_FOLLOWUP_EXECUTE;
      await this.access.require(actor, organizationId, current.buildingId, permission);
      if (target === 'VERIFIED' && current.responsibleUserId === actor.userId) throw new ConflictException("L'executant ne peut pas verifier son propre suivi.");
      if (!isFollowUpTransitionAllowed(current.status, target)) throw new ConflictException('Transition de suivi invalide.');
      const changed = await tx.operationalFollowUp.updateMany({ where: { id, organizationId, lockVersion: dto.lockVersion, status: current.status }, data: { status: target, lockVersion: { increment: 1 }, ...(dto.responsibleUserId ? { responsibleUserId: dto.responsibleUserId } : {}), ...(target === 'COMPLETED' ? { completedAt: new Date() } : {}), ...(target === 'VERIFIED' ? { verifiedAt: new Date(), verifiedByUserId: actor.userId } : {}), ...(target === 'CLOSED' ? { closedAt: new Date(), closureValidation: dto.reason } : {}) } });
      if (changed.count !== 1) throw new ConflictException('Le suivi a ete modifie; rechargez-le.');
      await tx.operationalFollowUpEvent.create({ data: { organizationId, buildingId: current.buildingId, followUpId: id, action: target, actorUserId: actor.userId, fromStatus: current.status, toStatus: target, reason: dto.reason, evidence: dto.evidence as Prisma.InputJsonValue | undefined, idempotencyKey: dto.idempotencyKey } });
      return tx.operationalFollowUp.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch(async (error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.operationalFollowUp.findFirstOrThrow({ where: { id, organizationId } });
      }
      throw error;
    });
  }
}
