import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CoroActorType, CorrectiveActionEvidenceType, CorrectiveActionPermission, CorrectiveActionSystemReferenceType, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CorrectiveActionsService, CorrectiveActionActor } from './corrective-actions.service';
import { CreateFileEvidenceDto, CreateLinkEvidenceDto, CreateNoteEvidenceDto, CreateSystemReferenceEvidenceDto, WithdrawEvidenceDto } from './dto/corrective-action-evidence.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DOCUMENT_MIMES = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']);
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class CorrectiveActionEvidenceService {
  constructor(private prisma: PrismaService, private storage: StorageService, private actions: CorrectiveActionsService) {}

  async list(actionId: string, actor: CorrectiveActionActor) {
    await this.actions.findAccessibleAction(actionId, actor);
    const evidence = await this.prisma.correctiveActionEvidence.findMany({ where: { correctiveActionId: actionId, organizationId: actor.organizationId }, orderBy: { submittedAt: 'desc' } });
    return evidence.map((item) => this.safeEvidence(item));
  }

  async addNote(actionId: string, body: CreateNoteEvidenceDto, actor: CorrectiveActionActor) {
    return this.addStructured(actionId, body, actor, { type: CorrectiveActionEvidenceType.NOTE, noteText: body.noteText.trim() });
  }

  async addLink(actionId: string, body: CreateLinkEvidenceDto, actor: CorrectiveActionActor) {
    const url = new URL(body.externalUrl);
    if (url.protocol !== 'https:') throw new BadRequestException('Seuls les liens HTTPS sont autorises');
    return this.addStructured(actionId, body, actor, { type: CorrectiveActionEvidenceType.LINK, externalUrl: url.toString() });
  }

  async addSystemReference(actionId: string, body: CreateSystemReferenceEvidenceDto, actor: CorrectiveActionActor) {
    await this.validateSystemReference(body.systemReferenceType, body.systemReferenceId, actor);
    return this.addStructured(actionId, body, actor, { type: CorrectiveActionEvidenceType.SYSTEM_REFERENCE, systemReferenceType: body.systemReferenceType, systemReferenceId: body.systemReferenceId });
  }

  async addFile(actionId: string, body: CreateFileEvidenceDto, file: Express.Multer.File | undefined, actor: CorrectiveActionActor) {
    await this.actions.requirePermission(actor, CorrectiveActionPermission.CORRECTIVE_ACTION_EDIT);
    await this.actions.findAccessibleAction(actionId, actor);
    if (!file?.buffer?.length) throw new BadRequestException('Fichier requis');
    if (body.type !== CorrectiveActionEvidenceType.DOCUMENT && body.type !== CorrectiveActionEvidenceType.PHOTO) throw new BadRequestException('Type de preuve fichier invalide');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Fichier trop volumineux (10 Mo maximum)');
    this.validateFile(body.type, file.mimetype, file.buffer);
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    let evidence = await this.prisma.correctiveActionEvidence.findFirst({ where: { organizationId: actor.organizationId, clientIntentId: body.clientIntentId } });
    if (evidence && evidence.correctiveActionId !== actionId) throw new ConflictException('Intention deja utilisee');
    if (!evidence) {
      const id = randomUUID();
      const safeName = this.safeFileName(file.originalname);
      try {
        evidence = await this.prisma.correctiveActionEvidence.create({ data: { id, organizationId: actor.organizationId, correctiveActionId: actionId, clientIntentId: body.clientIntentId, type: body.type, title: body.title.trim(), description: body.description?.trim() || null, status: 'PENDING', storageKey: `corrective-action-evidence/${actor.organizationId}/${actionId}/${id}/${safeName}`, originalFileName: safeName, mimeType: file.mimetype, fileSize: file.buffer.length, sha256: hash, submittedByType: actor.sub ? CoroActorType.CLIENT_USER : CoroActorType.SYSTEM, submittedById: actor.sub || 'system' } });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        evidence = await this.prisma.correctiveActionEvidence.findFirstOrThrow({ where: { organizationId: actor.organizationId, clientIntentId: body.clientIntentId } });
      }
    }
    this.assertReplay(evidence, actionId, body.type, hash, file.buffer.length);
    if (evidence.status === 'ACTIVE') return this.safeEvidence(evidence);
    if (evidence.status !== 'PENDING' || !evidence.storageKey) throw new ConflictException('Preuve non recuperable');
    await this.ensureStored(evidence.storageKey, file.buffer, file.mimetype, hash);
    return this.activate(evidence.id, actor);
  }

  async withdraw(actionId: string, evidenceId: string, body: WithdrawEvidenceDto, actor: CorrectiveActionActor) {
    await this.actions.requirePermission(actor, CorrectiveActionPermission.CORRECTIVE_ACTION_EDIT);
    await this.actions.findAccessibleAction(actionId, actor);
    const reason = body.withdrawalReason.trim();
    if (!reason) throw new BadRequestException('Motif de retrait requis');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'corrective-action-completion:' + actionId}))`;
      const result = await tx.correctiveActionEvidence.updateMany({ where: { id: evidenceId, correctiveActionId: actionId, organizationId: actor.organizationId, status: 'ACTIVE' }, data: { status: 'WITHDRAWN', withdrawnAt: new Date(), withdrawnByType: actor.sub ? CoroActorType.CLIENT_USER : CoroActorType.SYSTEM, withdrawnById: actor.sub || 'system', withdrawalReason: reason } });
      if (result.count !== 1) throw new ConflictException('Preuve absente, retiree ou modifiee concurremment');
      await this.audit(tx, actionId, actor, 'EVIDENCE_WITHDRAWN', { evidenceId, reason });
      return this.safeEvidence(await tx.correctiveActionEvidence.findUniqueOrThrow({ where: { id: evidenceId } }));
    });
  }

  async download(actionId: string, evidenceId: string, actor: CorrectiveActionActor) {
    await this.actions.findAccessibleAction(actionId, actor);
    const evidence = await this.prisma.correctiveActionEvidence.findFirst({ where: { id: evidenceId, correctiveActionId: actionId, organizationId: actor.organizationId, type: { in: ['DOCUMENT', 'PHOTO'] }, status: { in: ['ACTIVE', 'WITHDRAWN'] } } });
    if (!evidence?.storageKey || !evidence.sha256 || !evidence.fileSize || !evidence.mimeType || !evidence.originalFileName) throw new NotFoundException('Preuve fichier introuvable');
    const bytes = await this.storage.downloadPrivate(evidence.storageKey);
    if (bytes.length !== evidence.fileSize || createHash('sha256').update(bytes).digest('hex') !== evidence.sha256) throw new ConflictException('Integrite de la preuve invalide');
    return { bytes, mimeType: evidence.mimeType, fileName: evidence.originalFileName };
  }

  private async addStructured(actionId: string, body: { clientIntentId: string; title: string; description?: string }, actor: CorrectiveActionActor, data: any) {
    await this.actions.requirePermission(actor, CorrectiveActionPermission.CORRECTIVE_ACTION_EDIT);
    await this.actions.findAccessibleAction(actionId, actor);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'corrective-evidence:' + actor.organizationId + ':' + body.clientIntentId}))`;
      const replay = await tx.correctiveActionEvidence.findFirst({ where: { organizationId: actor.organizationId, clientIntentId: body.clientIntentId } });
      if (replay) {
        if (replay.correctiveActionId !== actionId || replay.type !== data.type) throw new ConflictException('Intention deja utilisee');
        return this.safeEvidence(replay);
      }
      const evidence = await tx.correctiveActionEvidence.create({ data: { organizationId: actor.organizationId, correctiveActionId: actionId, clientIntentId: body.clientIntentId, title: body.title.trim(), description: body.description?.trim() || null, status: 'ACTIVE', submittedByType: actor.sub ? CoroActorType.CLIENT_USER : CoroActorType.SYSTEM, submittedById: actor.sub || 'system', ...data } });
      await this.audit(tx, actionId, actor, 'EVIDENCE_ADDED', { evidenceId: evidence.id, type: evidence.type });
      return this.safeEvidence(evidence);
    });
  }

  private async activate(id: string, actor: CorrectiveActionActor) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.correctiveActionEvidence.findUniqueOrThrow({ where: { id } });
      if (current.status === 'ACTIVE') return this.safeEvidence(current);
      const result = await tx.correctiveActionEvidence.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'ACTIVE' } });
      if (result.count !== 1) throw new ConflictException('Preuve modifiee concurremment');
      await this.audit(tx, current.correctiveActionId, actor, 'EVIDENCE_ADDED', { evidenceId: id, type: current.type });
      return this.safeEvidence(await tx.correctiveActionEvidence.findUniqueOrThrow({ where: { id } }));
    });
  }

  private async ensureStored(key: string, bytes: Buffer, mime: string, hash: string) {
    try {
      const existing = await this.storage.downloadPrivate(key);
      if (existing.length !== bytes.length || createHash('sha256').update(existing).digest('hex') !== hash) throw new ConflictException('Objet prive existant divergent');
      return;
    } catch (error: any) {
      if (error?.message !== 'PRIVATE_OBJECT_NOT_FOUND') throw error;
    }
    await this.storage.uploadPrivateImmutable(bytes, key, mime);
    const stored = await this.storage.downloadPrivate(key);
    if (stored.length !== bytes.length || createHash('sha256').update(stored).digest('hex') !== hash) throw new ConflictException('Verification du stockage prive echouee');
  }

  private validateFile(type: CorrectiveActionEvidenceType, mime: string, bytes: Buffer) {
    const allowed = type === 'DOCUMENT' ? DOCUMENT_MIMES : PHOTO_MIMES;
    if (!allowed.has(mime)) throw new BadRequestException('Type MIME non autorise');
    const hex = bytes.subarray(0, 12).toString('hex');
    const valid = mime === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-' : mime === 'image/jpeg' ? hex.startsWith('ffd8ff') : mime === 'image/png' ? hex.startsWith('89504e470d0a1a0a') : mime === 'image/webp' ? bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' : mime === 'text/plain' ? !bytes.includes(0) : hex.startsWith('504b0304');
    if (!valid) throw new BadRequestException('Signature de fichier invalide');
  }

  private async validateSystemReference(type: CorrectiveActionSystemReferenceType, id: string, actor: CorrectiveActionActor) {
    const buildingScope = actor.role === 'CLIENT_MANAGER' ? { buildingId: { in: actor.buildingIds || [] }, building: { is: { clientId: actor.clientId } } } : actor.role === 'CLIENT_CORPORATE' ? { building: { is: { clientId: actor.clientId } } } : {};
    const where = { id, organizationId: actor.organizationId, ...buildingScope };
    const found = type === 'POPULATION_EVIDENCE' ? await this.prisma.populationEvidenceRecord.findFirst({ where, select: { id: true } }) : type === 'EXERCISE_REPORT' ? await this.prisma.exerciseReport.findFirst({ where, select: { id: true } }) : await this.prisma.incidentEvent.findFirst({ where, select: { id: true } });
    if (!found) throw new BadRequestException('Reference systeme invalide pour cette organisation');
  }

  private assertReplay(evidence: any, actionId: string, type: CorrectiveActionEvidenceType, hash: string, size: number) {
    if (evidence.correctiveActionId !== actionId || evidence.type !== type || evidence.sha256 !== hash || evidence.fileSize !== size) throw new ConflictException('Intention deja utilisee avec un contenu different');
  }

  private safeFileName(name: string) { return (name.split(/[\\/]/).pop() || 'evidence').normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180); }
  private safeEvidence(evidence: any) { const { storageKey, ...safe } = evidence; return safe; }
  private audit(tx: any, actionId: string, actor: CorrectiveActionActor, eventType: 'EVIDENCE_ADDED' | 'EVIDENCE_WITHDRAWN', metadata: object) { return tx.correctiveActionAuditEvent.create({ data: { organizationId: actor.organizationId, correctiveActionId: actionId, eventType, actorType: actor.sub ? CoroActorType.CLIENT_USER : CoroActorType.SYSTEM, actorId: actor.sub || 'system', metadata } }); }
}
