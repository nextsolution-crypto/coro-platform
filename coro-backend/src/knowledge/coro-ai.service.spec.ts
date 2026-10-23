import { CoroAiService } from './coro-ai.service';

const actor = {
  type: 'CLIENT_USER' as const,
  id: 'client-a',
  organizationId: 'org-a',
  role: 'CLIENT_MANAGER' as const,
  buildingIds: ['building-a'],
};

function harness() {
  const find = jest.fn().mockResolvedValue({ buildingId: 'building-a' });
  const prisma: any = {
    clientUser: { findFirst: jest.fn().mockResolvedValue({ clientId: 'customer-a', role: 'CLIENT_MANAGER', buildingIds: ['building-a'], operationalReviewPermissions: [] }) },
    incidentEvent: { findFirst: find },
    evacuationEvent: { findFirst: find },
    exerciseReport: { findFirst: find },
    correctiveAction: { findFirst: find },
    building: { findFirst: jest.fn().mockResolvedValue({ id: 'building-a' }) },
    coroKnowledgeInteraction: {
      create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'interaction-a', ...data })),
    },
  };
  const retrieval: any = {
    search: jest.fn().mockResolvedValue([]),
    questionFingerprint: jest.fn().mockReturnValue('f'.repeat(64)),
  };
  const grounding: any = {
    suspicious: jest.fn().mockReturnValue(false),
    answer: jest.fn().mockReturnValue({
      answer: null,
      uncertainty: 'Aucune source admissible.',
      missingInformation: ['Information absente.'],
      conflicts: [],
      usedCitationIds: [],
    }),
  };
  const authorization: any = {
    scope: jest.fn().mockResolvedValue({ organizationId: 'org-a', buildingIds: ['building-a'] }),
  };
  const providerGateway: any = {
    providerName: jest.fn().mockReturnValue('DETERMINISTIC_SIMULATED'),
    answer: jest.fn().mockImplementation(async (question, hits) => ({
      provider: 'DETERMINISTIC_SIMULATED',
      grounded: grounding.answer(question, hits),
    })),
  };
  return {
    service: new CoroAiService(
      prisma,
      retrieval,
      grounding,
      providerGateway,
      authorization,
    ),
    prisma,
    retrieval,
    grounding,
    providerGateway,
  };
}

describe('CoroAiService', () => {
  it('reports the real selected provider when Bedrock fails without exposing an answer', async () => {
    const h = harness();
    h.providerGateway.providerName.mockReturnValue('AWS_BEDROCK_CA_CENTRAL_1');
    h.providerGateway.answer.mockRejectedValue(new Error('provider unavailable'));
    const result = await h.service.ask(actor, { question: 'Question de recette fictive' });
    expect(result).toMatchObject({ status: 'PROVIDER_FAILURE', provider: 'AWS_BEDROCK_CA_CENTRAL_1', answer: null, citations: [] });
  });
  it.each(['INCIDENT', 'SENTINELLE', 'NETWORK', 'EXERCISE_REPORT', 'CORRECTIVE_ACTION'] as const)(
    'binds %s assistance to the authorized building without a mutation path',
    async (operationalContext) => {
      const h = harness();
      const result = await h.service.ask(actor, {
        question: 'Quelle procédure est approuvée?',
        operationalContext,
        operationalResourceId: 'resource-a',
      });
      expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
      expect(h.retrieval.search).toHaveBeenCalledWith(actor, expect.any(String), 'building-a');
      expect(h.prisma.coroKnowledgeInteraction.create).toHaveBeenCalled();
    },
  );

  it('applies canonical client confidentiality when binding corrective actions', async () => {
    const h = harness();
    await h.service.ask(actor, { question: 'Question fictive', operationalContext: 'CORRECTIVE_ACTION', operationalResourceId: 'action-a' });
    const where = h.prisma.correctiveAction.findFirst.mock.calls[0][0].where;
    expect(where.buildingId).toEqual({ in: ['building-a'] });
    expect(where.building).toEqual({ is: { clientId: 'customer-a' } });
    expect(where.OR).toEqual([
      { visibility: { in: ['BUILDING_TEAM', 'ORGANIZATION'] } },
      { visibility: 'RESTRICTED', createdById: actor.id },
    ]);
  });
  it('restricts client report assistance to published, active canonical projects', async () => {
    const h = harness();
    await h.service.ask(actor, { question: 'Question fictive', operationalContext: 'EXERCISE_REPORT', operationalResourceId: 'report-a' });
    expect(h.prisma.exerciseReport.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      status: 'PUBLISHED', project: { is: { isActive: true, organizationId: 'org-a' } },
    }) }));
  });
  it('rejects inaccessible contexts before retrieval or provider invocation', async () => {
    const h = harness();
    h.prisma.incidentEvent.findFirst.mockResolvedValue({ buildingId: 'forbidden-building' });
    await expect(h.service.ask(actor, { question: 'Question fictive', operationalContext: 'INCIDENT', operationalResourceId: 'other-event' })).rejects.toThrow('Contexte non disponible');
    expect(h.retrieval.search).not.toHaveBeenCalled();
    expect(h.providerGateway.answer).not.toHaveBeenCalled();
  });
  it('fails closed and records a provider failure without citations', async () => {
    const h = harness();
    h.grounding.answer.mockImplementation(() => { throw new Error('SIMULATED_PROVIDER_FAILURE'); });
    const result = await h.service.ask(actor, { question: 'Question autorisée' });
    expect(result).toMatchObject({
      status: 'PROVIDER_FAILURE',
      answer: null,
      citations: [],
      provider: 'DETERMINISTIC_SIMULATED',
    });
    expect(h.prisma.coroKnowledgeInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PROVIDER_FAILURE' }) }),
    );
  });
  it('links only grounded citations to the canonical source viewer, not a project document route', async () => {
    const h = harness();
    const hit = {
      citationId: 'citation-a',
      chunkId: 'chunk-a',
      projectFileId: 'file-a',
      projectFileVersion: 3,
      documentName: 'source.pdf',
      pageStart: 2,
      pageEnd: 2,
      sectionPath: 'Section 1',
      sourceSha256: 'a'.repeat(64),
      score: 1,
    };
    h.retrieval.search.mockResolvedValue([hit, { ...hit, citationId: 'unused-citation' }]);
    h.grounding.answer.mockReturnValue({
      answer: 'Réponse sourcée.',
      uncertainty: null,
      missingInformation: [],
      conflicts: [],
      usedCitationIds: ['citation-a'],
    });
    const result = await h.service.ask(actor, { question: 'Que dit la source approuvée ?' });
    expect(result.status).toBe('ANSWERED');
    expect(result.citations).toEqual([{
      citationId: 'citation-a',
      projectFileId: 'file-a',
      version: 3,
      name: 'source.pdf',
      pageStart: 2,
      pageEnd: 2,
      sectionPath: 'Section 1',
      sha256: 'a'.repeat(64),
      href: '/knowledge/sources/file-a',
    }]);
  });

});
