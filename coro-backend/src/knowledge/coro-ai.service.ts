import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroundingService } from './knowledge-grounding.service';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { KnowledgeActor } from './knowledge.types';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';
import { projectAccessWhere } from '../auth/project-access';
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
          uncertainty: 'Le fournisseur de réponses est temporairement indisponible.',
          correlationId,
          completedAt: new Date(),
        },
      });
      return {
        interactionId: failed.id,
        correlationId,
        status: 'PROVIDER_FAILURE',
        provider,
        answer: null,
        uncertainty: 'Le fournisseur de réponses est temporairement indisponible.',
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
          href: `/knowledge/sources/${hit.projectFileId}`,
        })),
    };
  }

  private async assertOperationalContext(
    actor: KnowledgeActor,
    context: OperationalContext,
    resourceId: string,
  ) {
    const scope = await this.authorization.scope(actor);
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
        where: { id: resourceId, organizationId: actor.organizationId,
          project: { is: { isActive: true, ...(actor.type === 'INTERNAL_USER'
            ? projectAccessWhere({ userId: actor.id, organizationId: actor.organizationId, role: actor.role })
            : { organizationId: actor.organizationId }) } },
          building: { is: { isActive: true, organizationId: actor.organizationId } },
          ...(actor.type === 'CLIENT_USER' ? { status: 'PUBLISHED' as const } : {}),
        },
        select: { buildingId: true },
      });
    else if (context === 'CORRECTIVE_ACTION') {
      const client = actor.type === 'CLIENT_USER' ? await this.prisma.clientUser.findFirst({
        where: { id: actor.id, organizationId: actor.organizationId, isActive: true },
        select: { clientId: true, role: true, buildingIds: true },
      }) : null;
      if (actor.type === 'CLIENT_USER' && !client) throw new NotFoundException('Contexte non disponible.');
      // Reuse the canonical read authorization, including RESTRICTED/ADVISOR visibility.
      const action = await new CorrectiveActionsService(this.prisma).findAccessibleAction(resourceId, {
        organizationId: actor.organizationId, role: client?.role ?? actor.role,
        ...(client ? { sub: actor.id, clientId: client.clientId, buildingIds: client.buildingIds } : {}),
      });
      resource = { buildingId: action.buildingId };
    }
    else if (context === 'NETWORK')
      resource = await this.prisma.building.findFirst({
        where: { id: resourceId, organizationId: actor.organizationId },
        select: { id: true },
      }).then((value) => (value ? { buildingId: value.id } : null));
    if (!resource?.buildingId) throw new NotFoundException('Contexte non disponible.');
    if (scope.buildingIds && !scope.buildingIds.includes(resource.buildingId))
      throw new NotFoundException('Contexte non disponible.');
    return resource.buildingId;
  }
}
