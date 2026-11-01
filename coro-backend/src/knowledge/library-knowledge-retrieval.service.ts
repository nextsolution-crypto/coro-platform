import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { projectAccessWhere } from '../auth/project-access';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeActor, KnowledgeSearchHit } from './knowledge.types';

@Injectable()
export class LibraryKnowledgeRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: DeterministicEmbeddingService,
  ) {}

  async search(
    actor: KnowledgeActor,
    question: string,
    projectId?: string,
  ): Promise<KnowledgeSearchHit[]> {
    if (projectId) await this.assertProject(actor, projectId);
    type EffectiveSource = {
      content: unknown;
      updatedAt: Date;
      isActive: boolean;
    };
    type EffectiveOverride = EffectiveSource & {
      procedureId: string;
      projectId: string | null;
    };
    const [defaults, rawOrganizationOverrides, rawProjectOverrides] =
      await Promise.all([
        this.prisma.procedureDefault.findMany({
          where: { isActive: true },
          orderBy: { code: 'asc' },
        }),
        this.prisma.procedureOverride.findMany({
          where: { organizationId: actor.organizationId, projectId: null },
        }),
        projectId
          ? this.prisma.procedureOverride.findMany({
              where: { organizationId: actor.organizationId, projectId },
            })
          : Promise.resolve([]),
      ]);
    const organizationOverrides =
      rawOrganizationOverrides as EffectiveOverride[];
    const projectOverrides = rawProjectOverrides as EffectiveOverride[];
    const organization = new Map<string, EffectiveSource>(
      organizationOverrides.map((row): [string, EffectiveSource] => [
        row.procedureId,
        row,
      ]),
    );
    const project = new Map<string, EffectiveSource>(
      projectOverrides.map((row): [string, EffectiveSource] => [
        row.procedureId,
        row,
      ]),
    );
    const queryTerms = this.terms(question),
      queryVector = this.embeddings.embed(question);
    return defaults
      .flatMap((source) => {
        const selected =
          project.get(source.id) ?? organization.get(source.id) ?? source;
        if (!selected.isActive) return [];
        const scope: 'GLOBAL' | 'ORGANIZATION' | 'PROJECT' = project.has(
          source.id,
        )
          ? 'PROJECT'
          : organization.has(source.id)
            ? 'ORGANIZATION'
            : 'GLOBAL';
        const text = this.text(selected.content);
        const terms = this.terms(text),
          vector = this.embeddings.embed(text);
        const lexical = queryTerms.size
          ? [...queryTerms].filter((term) => terms.has(term)).length /
            queryTerms.size
          : 0;
        const semantic = vector.reduce(
          (sum, value, index) => sum + value * queryVector[index],
          0,
        );
        const score = lexical * 0.65 + Math.max(0, semantic) * 0.35;
        if (score <= 0) return [];
        const fingerprint = createHash('sha256').update(text).digest('hex');
        const reference = `procedure:${source.id}:${scope}:${scope === 'PROJECT' ? projectId : scope === 'ORGANIZATION' ? actor.organizationId : 'global'}`;
        const version = `${selected.updatedAt.toISOString()}:${fingerprint}`;
        const citationId = `library:${createHash('sha256').update(`${reference}:${version}`).digest('hex')}`;
        return [
          {
            sourceType: 'LIBRARY_PROCEDURE' as const,
            sourceReference: reference,
            sourceVersion: version,
            sourceFingerprint: fingerprint,
            sourceScope: scope,
            href: `/knowledge/library-sources/${source.id}${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
            chunkId: citationId,
            citationId,
            documentName: `Procédure ${source.code}`,
            buildingId: '',
            pageStart: 1,
            pageEnd: 1,
            sectionPath: scope,
            text,
            score,
          },
        ];
      })
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.citationId.localeCompare(right.citationId),
      );
  }

  async source(actor: KnowledgeActor, procedureId: string, projectId?: string) {
    if (projectId) await this.assertProject(actor, projectId);
    const source = await this.prisma.procedureDefault.findFirst({
      where: { id: procedureId, isActive: true },
    });
    if (!source) throw new NotFoundException('Source introuvable');
    const overrides = await this.prisma.procedureOverride.findMany({
      where: {
        procedureId,
        organizationId: actor.organizationId,
        OR: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])],
      },
    });
    const project = projectId
      ? overrides.find((item) => item.projectId === projectId)
      : undefined;
    const organization = overrides.find((item) => item.projectId === null);
    const selected = project ?? organization ?? source;
    if (!selected.isActive) throw new NotFoundException('Source introuvable');
    const scope: 'GLOBAL' | 'ORGANIZATION' | 'PROJECT' = project
      ? 'PROJECT'
      : organization
        ? 'ORGANIZATION'
        : 'GLOBAL';
    const text = this.text(selected.content),
      fingerprint = createHash('sha256').update(text).digest('hex');
    return {
      id: source.id,
      code: source.code,
      content: selected.content,
      scope,
      version: `${selected.updatedAt.toISOString()}:${fingerprint}`,
      fingerprint,
    };
  }

  private async assertProject(actor: KnowledgeActor, projectId: string) {
    if (
      actor.type === 'CLIENT_USER' &&
      actor.role === 'CLIENT_MANAGER' &&
      !actor.clientId
    )
      throw new NotFoundException('Projet introuvable');
    const where =
      actor.type === 'INTERNAL_USER'
        ? {
            id: projectId,
            ...projectAccessWhere({
              userId: actor.id,
              organizationId: actor.organizationId,
              role: actor.role,
            }),
          }
        : {
            id: projectId,
            organizationId: actor.organizationId,
            ...(actor.role === 'CLIENT_MANAGER'
              ? {
                  clientId: actor.clientId,
                  buildingId: { in: actor.buildingIds },
                }
              : {}),
          };
    if (!(await this.prisma.project.findFirst({ where, select: { id: true } })))
      throw new NotFoundException('Projet introuvable');
  }
  private text(value: unknown) {
    return JSON.stringify(value)
      .replace(/[{}",:]/g, ' ')
      .replaceAll('[', ' ')
      .replaceAll(']', ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  private terms(value: string) {
    return new Set(
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]{2,}/g) ?? [],
    );
  }
}
