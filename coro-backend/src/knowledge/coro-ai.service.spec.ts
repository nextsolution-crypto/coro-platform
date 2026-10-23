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
