import { WebAIObservabilityService } from './web-ai-observability.service';

describe('WebAIObservabilityService privacy boundary', () => {
  const original = process.env;
  beforeEach(() => { process.env = { ...original, WEB_AI_OBSERVABILITY_ENABLED: 'true', WEB_AI_TELEMETRY_PSEUDONYM_KEY: 'synthetic-test-key-not-production' }; });
  afterAll(() => { process.env = original; });

  it('persists only minimized classified telemetry and an irreversible session pseudonym', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-1' });
    const prisma = { webAITelemetryEvent: { create }, webAIImprovementRecommendation: { upsert: jest.fn() } };
    const service = new WebAIObservabilityService(prisma as never);
    await service.record({ eventType: 'ASSISTANT_RESPONSE', intent: 'PRICING', language: 'fr-CA', result: 'SUCCESS', correlationId: 'request-1', sessionId: '11111111-1111-4111-8111-111111111111', durationMs: 12, sourceCount: 2 });
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ category: 'PRICING', language: 'FR_CA', result: 'SUCCESS', durationMs: 12, sourceCount: 2 });
    expect(data.sessionPseudonym).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(data)).not.toMatch(/email|phone|message|question|conversation|11111111/i);
  });

  it('turns an abstention into an aggregated documentary gap, not raw content', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = { webAITelemetryEvent: { create: jest.fn() }, webAIImprovementRecommendation: { upsert } };
    const service = new WebAIObservabilityService(prisma as never);
    await service.record({ eventType: 'ASSISTANT_RESPONSE', intent: 'TECHNICAL_INTEGRATION', language: 'en-CA', result: 'ABSTENTION', correlationId: 'request-2' });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { category_findingCode: { category: 'TECHNICAL_INTEGRATION', findingCode: 'INSUFFICIENT_PUBLIC_SOURCE' } } }));
  });

  it('is non-blocking when telemetry storage is unavailable', async () => {
    const prisma = { webAITelemetryEvent: { create: jest.fn().mockRejectedValue(new Error('synthetic database failure')) }, webAIImprovementRecommendation: { upsert: jest.fn() } };
    const service = new WebAIObservabilityService(prisma as never);
    await expect(service.record({ eventType: 'ASSISTANT_RESPONSE', intent: 'GENERAL_INFORMATION', language: 'fr-CA', result: 'FAILURE', correlationId: 'request-3' })).resolves.toBeUndefined();
  });
});
