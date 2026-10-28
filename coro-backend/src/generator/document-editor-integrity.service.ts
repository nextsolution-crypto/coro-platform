import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { sanitizeDocumentContent } from './document-content-security';

const MUTABLE_PROJECT_STATES: ProjectStatus[] = ['DRAFT', 'IN_PROGRESS'];
const MUTABLE_DOCUMENT_STATES: DocumentStatus[] = ['DRAFT', 'IN_PROGRESS'];

export interface DocumentMutationResult<T = unknown> {
  documentId: string;
  projectId: string;
  lockVersion: number;
  value: T;
}

@Injectable()
export class DocumentEditorIntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  requireExpectedLockVersion(value: unknown): number {
    if (!Number.isInteger(value) || Number(value) < 0) {
      throw new BadRequestException('expectedLockVersion est requis');
    }
    return Number(value);
  }

  sanitize<T>(value: T): T {
    return sanitizeDocumentContent(value);
  }

  async mutateContent<T>(
    documentId: string,
    actor: AdviserActor,
    expectedLockVersion: unknown,
    operation: (content: Record<string, any>) => {
      content: Record<string, any>;
      value: T;
    },
  ): Promise<DocumentMutationResult<T>> {
    const expected = this.requireExpectedLockVersion(expectedLockVersion);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "Document" WHERE id = ${documentId} FOR UPDATE`,
      );
      const document = await tx.document.findFirst({
        where: { id: documentId, project: { is: projectAccessWhere(actor) } },
        include: {
          project: { select: { id: true, isActive: true, status: true } },
        },
      });
      if (!document) throw new NotFoundException('Document introuvable');
      this.assertMutable(document.project, document.status);
      if (document.lockVersion !== expected) {
        throw new ConflictException({
          code: 'DOCUMENT_VERSION_CONFLICT',
          message: 'Le document a été modifié par une autre session.',
          currentLockVersion: document.lockVersion,
        });
      }
      const current = structuredClone(
        (document.content as Record<string, any>) || {},
      );
      const mutation = operation(current);
      const sanitized = this.sanitize(mutation.content);
      const updated = await tx.document.update({
        where: { id: document.id },
        data: { content: sanitized, lockVersion: { increment: 1 } },
        select: { lockVersion: true },
      });
      return {
        documentId: document.id,
        projectId: document.project.id,
        lockVersion: updated.lockVersion,
        value: mutation.value,
      };
    });
  }

  async mutateProjectContent<T>(
    projectId: string,
    actor: AdviserActor,
    expectedLockVersion: unknown,
    operation: (content: Record<string, any>) => {
      content: Record<string, any>;
      value: T;
    },
  ): Promise<DocumentMutationResult<T>> {
    const document = await this.prisma.document.findFirst({
      where: { projectId, project: { is: projectAccessWhere(actor) } },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    return this.mutateContent(
      document.id,
      actor,
      expectedLockVersion,
      operation,
    );
  }

  async readableProject(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true, isActive: true, status: true, organizationId: true },
    });
    if (!project || !project.isActive)
      throw new NotFoundException('Projet introuvable');
    return project;
  }

  assertMutable(
    project: { isActive: boolean; status: ProjectStatus },
    documentStatus: DocumentStatus,
  ) {
    if (!project.isActive) throw new NotFoundException('Projet introuvable');
    if (!MUTABLE_PROJECT_STATES.includes(project.status)) {
      throw new ForbiddenException(
        `Le projet ${project.status} est en lecture seule.`,
      );
    }
    if (!MUTABLE_DOCUMENT_STATES.includes(documentStatus)) {
      throw new ForbiddenException(
        `Le document ${documentStatus} est en lecture seule.`,
      );
    }
  }
}
