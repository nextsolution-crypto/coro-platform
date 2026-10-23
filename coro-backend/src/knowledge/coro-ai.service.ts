import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroundingService } from './knowledge-grounding.service';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { KnowledgeActor } from './knowledge.types';
import { CoroAiProviderGateway } from './coro-ai-provider.gateway';

type OperationalContext =
  | 'INCIDENT'
  | 'SENTINELLE'
  | 'NETWORK'
  | 'EXERCISE_REPORT'
  | 'CORRECTIVE_ACTION';

@Injectable()
export class CoroAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieval: KnowledgeRetrievalService,
    private readonly grounding: KnowledgeGroundingService,
    private readonly providerGateway: CoroAiProviderGateway,
    private readonly authorization: KnowledgeAuthorizationService,
  ) {}

  async ask(
    actor: KnowledgeActor,
    input: {
      question: string;
      buildingId?: string;
      operationalContext?: OperationalContext;
      operationalResourceId?: string;
      correlationId?: string;
    },
  ) {
    const correlationId = input.correlationId?.trim() || randomUUID();
    if (input.operationalContext && !input.operationalResourceId)
      throw new BadRequestException('Ressource opérationnelle requise.');
    const contextBuildingId = input.operationalContext
      ? await this.assertOperationalContext(
          actor,
          input.operationalContext,
          input.operationalResourceId!,
        )
      : undefined;
    if (input.buildingId && contextBuildingId && input.buildingId !== contextBuildingId)
      throw new NotFoundException('Contexte non disponible.');
    const buildingId = contextBuildingId ?? input.buildingId;
    const hits = await this.retrieval.search(actor, input.question, buildingId);
    let grounded;
    let provider: string = this.providerGateway.providerName();
    try {
      const result = await this.providerGateway.answer(input.question, hits);
      grounded = result.grounded;
      provider = result.provider;
    } catch {
      const failed = await this.prisma.coroKnowledgeInteraction.create({
        data: {
          organizationId: actor.organizationId,
          actorType: actor.type,
          actorId: actor.id,
          buildingId,
          operationalContext: input.operationalContext,
          operationalResourceId: input.operationalResourceId,
          status: 'PROVIDER_FAILURE',
          questionFingerprint: this.retrieval.questionFingerprint(input.question),
          sourceCount: hits.length,
          usedSourceCount: 0,
          uncertainty: 'Le fournisseur simulé est temporairement indisponible.',
          correlationId,
          completedAt: new Date(),
        },
      });
      return {
        interactionId: failed.id,
        correlationId,
        status: 'PROVIDER_FAILURE',
        provider: 'DETERMINISTIC_SIMULATED',
        answer: null,
        uncertainty: 'Le fournisseur simulé est temporairement indisponible.',
        missingInformation: [],
        conflicts: [],
        citations: [],
      };
    }
    const suspicious = this.grounding.suspicious(input.question);
    const status = suspicious
      ? 'BLOCKED'
      : grounded.answer
        ? 'ANSWERED'
        : 'INSUFFICIENT_EVIDENCE';
    const interaction = await this.prisma.coroKnowledgeInteraction.create({
      data: {
        organizationId: actor.organizationId,
        actorType: actor.type,
        actorId: actor.id,
        buildingId,
        operationalContext: input.operationalContext,
        operationalResourceId: input.operationalResourceId,
        status,
        questionFingerprint: this.retrieval.questionFingerprint(input.question),
        answerFingerprint: grounded.answer
          ? createHash('sha256').update(grounded.answer).digest('hex')
          : null,
        sourceCount: hits.length,
        usedSourceCount: grounded.usedCitationIds.length,
        uncertainty: grounded.uncertainty,
        suspiciousContent: suspicious,
        correlationId,
        completedAt: new Date(),
        sources: {
          create: hits.map((hit, index) => ({
            citationId: hit.citationId,
            chunkId: hit.chunkId,
            retrievalRank: index + 1,
            retrievalScore: hit.score,
            usedInAnswer: grounded.usedCitationIds.includes(hit.citationId),
          })),
        },
      },
    });
    return {
      interactionId: interaction.id,
      correlationId,
      status,
      provider,
      answer: grounded.answer,
      uncertainty: grounded.uncertainty,
      missingInformation: grounded.missingInformation,
      conflicts: grounded.conflicts,
      citations: hits
        .filter((hit) => grounded.usedCitationIds.includes(hit.citationId))
        .map((hit) => ({
          citationId: hit.citationId,
          projectFileId: hit.projectFileId,
          version: hit.projectFileVersion,
          name: hit.documentName,
          pageStart: hit.pageStart,
          pageEnd: hit.pageEnd,
          sectionPath: hit.sectionPath,
          sha256: hit.sourceSha256,
          href: `/documents/${hit.projectFileId}`,
        })),
    };
  }

  private async assertOperationalContext(
    actor: KnowledgeActor,
    context: OperationalContext,
    resourceId: string,
  ) {
    let resource: { buildingId: string | null } | null = null;
    if (context === 'INCIDENT')
      resource = await this.prisma.incidentEvent.findFirst({
        where: { id: resourceId, organizationId: actor.organizationId },
        select: { buildingId: true },
      });
    else if (context === 'SENTINELLE')
      resource = await this.prisma.evacuationEvent.findFirst({
        where: { id: resourceId, organizationId: actor.organizationId },
        select: { buildingId: true },
      });
    else if (context === 'EXERCISE_REPORT')
      resource = await this.prisma.exerciseReport.findFirst({
        where: { id: resourceId, organizationId: actor.organizationId },
        select: { buildingId: true },
      });
    else if (context === 'CORRECTIVE_ACTION')
      resource = await this.prisma.correctiveAction.findFirst({
        where: { id: resourceId, organizationId: actor.organizationId },
        select: { buildingId: true },
      });
    else if (context === 'NETWORK')
      resource = await this.prisma.building.findFirst({
        where: { id: resourceId, organizationId: actor.organizationId },
        select: { id: true },
      }).then((value) => (value ? { buildingId: value.id } : null));
    if (!resource?.buildingId) throw new NotFoundException('Contexte non disponible.');
    const scope = await this.authorization.scope(actor);
    if (scope.buildingIds && !scope.buildingIds.includes(resource.buildingId))
      throw new NotFoundException('Contexte non disponible.');
    return resource.buildingId;
  }
}
