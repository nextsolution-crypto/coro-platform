import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { DocumentEditorIntegrityService } from '../generator/document-editor-integrity.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VersionsService {
  constructor(
    private prisma: PrismaService,
    private readonly integrity: DocumentEditorIntegrityService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(projectId: string, actor: AdviserActor) {
    await this.integrity.readableProject(projectId, actor);
    return this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true, label: true, createdAt: true },
    });
  }

  async findOne(projectId: string, versionId: string, actor: AdviserActor) {
    await this.integrity.readableProject(projectId, actor);
    const version = await this.prisma.projectVersion.findFirst({
      where: { id: versionId, projectId },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        createdAt: true,
        snapshot: true,
      },
    });
    if (!version) throw new NotFoundException('Version introuvable');
    return { ...version, snapshot: this.integrity.sanitize(version.snapshot) };
  }

  async create(
    projectId: string,
    label: string | undefined,
    expectedValue: unknown,
    actor: AdviserActor,
  ) {
    await this.integrity.readableProject(projectId, actor);
    const expected = this.integrity.requireExpectedLockVersion(expectedValue);
    const result = await this.prisma.$transaction(async (tx) => {
      const document = await this.lockMutableDocument(
        tx,
        projectId,
        expected,
        actor,
      );
      const last = await tx.projectVersion.findFirst({
        where: { projectId },
        orderBy: { versionNumber: 'desc' },
      });
      const versionNumber = (last?.versionNumber || 0) + 1;
      const version = await tx.projectVersion.create({
        data: {
          projectId,
          versionNumber,
          label: label || `Version ${versionNumber}`,
          snapshot: this.integrity.sanitize(
            document.content,
          ) as Prisma.InputJsonValue,
        },
        select: { id: true, versionNumber: true, label: true, createdAt: true },
      });
      const updated = await tx.document.update({
        where: { id: document.id },
        data: { lockVersion: { increment: 1 } },
        select: { lockVersion: true },
      });
      return {
        version,
        lockVersion: updated.lockVersion,
        documentId: document.id,
      };
    });
    await this.log('VERSION_SAVE', result.documentId, projectId, actor, {
      versionNumber: result.version.versionNumber,
      lockVersion: result.lockVersion,
    });
    return { ...result.version, lockVersion: result.lockVersion };
  }

  async restore(
    projectId: string,
    versionId: string,
    expectedValue: unknown,
    actor: AdviserActor,
  ) {
    await this.integrity.readableProject(projectId, actor);
    const expected = this.integrity.requireExpectedLockVersion(expectedValue);
    const result = await this.prisma.$transaction(async (tx) => {
      const document = await this.lockMutableDocument(
        tx,
        projectId,
        expected,
        actor,
      );
      const version = await tx.projectVersion.findFirst({
        where: { id: versionId, projectId },
      });
      if (!version) throw new NotFoundException('Version introuvable');
      const last = await tx.projectVersion.findFirst({
        where: { projectId },
        orderBy: { versionNumber: 'desc' },
      });
      await tx.projectVersion.create({
        data: {
          projectId,
          versionNumber: (last?.versionNumber || 0) + 1,
          label: 'Sauvegarde avant restauration',
          snapshot: this.integrity.sanitize(
            document.content,
          ) as Prisma.InputJsonValue,
        },
      });
      const updated = await tx.document.update({
        where: { id: document.id },
        data: {
          content: this.integrity.sanitize(
            version.snapshot,
          ) as Prisma.InputJsonValue,
          lockVersion: { increment: 1 },
        },
        select: { lockVersion: true },
      });
      return {
        documentId: document.id,
        restoredVersion: version.versionNumber,
        lockVersion: updated.lockVersion,
      };
    });
    await this.log('VERSION_RESTORE', result.documentId, projectId, actor, {
      restoredVersion: result.restoredVersion,
      lockVersion: result.lockVersion,
    });
    return {
      success: true,
      restoredVersion: result.restoredVersion,
      lockVersion: result.lockVersion,
    };
  }

  async remove(
    projectId: string,
    versionId: string,
    expectedValue: unknown,
    actor: AdviserActor,
  ) {
    await this.integrity.readableProject(projectId, actor);
    const expected = this.integrity.requireExpectedLockVersion(expectedValue);
    const result = await this.prisma.$transaction(async (tx) => {
      const document = await this.lockMutableDocument(
        tx,
        projectId,
        expected,
        actor,
      );
      const version = await tx.projectVersion.findFirst({
        where: { id: versionId, projectId },
      });
      if (!version) throw new NotFoundException('Version introuvable');
      await tx.projectVersion.delete({ where: { id: versionId } });
      const updated = await tx.document.update({
        where: { id: document.id },
        data: { lockVersion: { increment: 1 } },
        select: { lockVersion: true },
      });
      return {
        documentId: document.id,
        versionNumber: version.versionNumber,
        lockVersion: updated.lockVersion,
      };
    });
    await this.log('VERSION_DELETE', result.documentId, projectId, actor, {
      versionNumber: result.versionNumber,
      lockVersion: result.lockVersion,
    });
    return { success: true, lockVersion: result.lockVersion };
  }

  private async lockMutableDocument(
    tx: Prisma.TransactionClient,
    projectId: string,
    expected: number,
    actor: AdviserActor,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Document" WHERE "projectId" = ${projectId} FOR UPDATE`,
    );
    const document = await tx.document.findFirst({
      where: { projectId, project: { is: projectAccessWhere(actor) } },
      include: {
        project: { select: { id: true, isActive: true, status: true } },
      },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    this.integrity.assertMutable(document.project, document.status);
    if (document.lockVersion !== expected) {
      throw new ConflictException({
        code: 'DOCUMENT_VERSION_CONFLICT',
        message: 'Le document a été modifié par une autre session.',
        currentLockVersion: document.lockVersion,
      });
    }
    return document;
  }

  private log(
    action: 'VERSION_SAVE' | 'VERSION_RESTORE' | 'VERSION_DELETE',
    documentId: string,
    projectId: string,
    actor: AdviserActor,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditService.log({
      action,
      entityType: 'DOCUMENT',
      entityId: documentId,
      projectId,
      description: action,
      metadata,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
  }
}
