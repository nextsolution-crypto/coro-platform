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
  return { service: new CoroAiService(prisma, retrieval, grounding, authorization), prisma, retrieval, grounding };
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
});
