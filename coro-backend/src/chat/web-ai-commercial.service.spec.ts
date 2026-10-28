import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { WebAICommercialRequestDto } from './web-ai-commercial.dto';
import { WebAICommercialService } from './web-ai-commercial.service';

const dto: WebAICommercialRequestDto = { idempotencyKey: '11111111-1111-4111-8111-111111111111', requestType: 'DEMO', contactName: 'Alice Test', organizationName: 'Synthetic Inc.', email: 'ALICE@EXAMPLE.TEST', interestedModules: ['CORO Knowledge', 'CORO Knowledge'], preferredLanguage: 'fr-CA', consentToProcess: true, consentTextVersion: 'web-ai-commercial-v1', consentAction: 'CHECKBOX_AND_SUBMIT', marketingConsent: false };
const payloadFingerprint = createHash('sha256').update(JSON.stringify({ ...dto, email: dto.email.toLowerCase(), interestedModules: ['CORO Knowledge', 'CORO Knowledge'] })).digest('hex');

describe('WebAICommercialService', () => {
  const original = process.env;
  beforeEach(() => { process.env = { ...original, WEB_AI_COMMERCIAL_INTAKE_ENABLED: 'true', WEB_AI_COMMERCIAL_PROVIDER: 'simulated' }; });
  afterAll(() => { process.env = original; });

  function setup(existing: object | null = null, accepted = true) {
    const prisma: Record<string, any> = {
      webAICommercialRequest: { findUnique: jest.fn().mockResolvedValue(existing), create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'request-1', ...data })), update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'request-1', idempotencyKey: dto.idempotencyKey, ...data })) },
      commercialProspect: { create: jest.fn().mockResolvedValue({ id: 'prospect-1' }) },
    };
    prisma.$executeRaw = jest.fn().mockResolvedValue(1);
    prisma.$transaction = jest.fn().mockImplementation((callback) => callback(prisma));
    const provider = { submit: jest.fn().mockResolvedValue(accepted ? { accepted: true, correlationId: 'simulated:request-1' } : { accepted: false, errorCode: 'SIMULATED_PROVIDER_FAILURE' }) };
    return { service: new WebAICommercialService(prisma as never, provider as never), prisma, provider };
  }

  it('requires explicit processing consent without side effects', async () => {
    const { service, prisma } = setup();
    await expect(service.submit({ ...dto, consentToProcess: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.webAICommercialRequest.create).not.toHaveBeenCalled();
  });

  it('creates a canonical prospect only after simulated provider acceptance', async () => {
    const { service, prisma, provider } = setup();
    await expect(service.submit(dto)).resolves.toMatchObject({ success: true, replayed: false });
    expect(provider.submit).toHaveBeenCalledTimes(1);
    expect(provider.submit).toHaveBeenCalledWith({ requestId: 'request-1', requestType: 'DEMO', language: 'FR_CA' });
    expect(provider.submit.mock.calls[0][0]).not.toHaveProperty('email');
    expect(provider.submit.mock.calls[0][0]).not.toHaveProperty('contactName');
    expect(prisma.commercialProspect.create).toHaveBeenCalledWith({ data: expect.objectContaining({ contactEmail: 'alice@example.test', country: 'CA' }) });
    expect(prisma.webAICommercialRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({ interestedModules: ['CORO Knowledge'], marketingConsent: false }) });
  });

  it('rejects a reused key whose canonical payload differs', async () => {
    const { service, prisma, provider } = setup({ id: 'request-1', status: 'PROCESSED', payloadFingerprint: 'different', idempotencyKey: dto.idempotencyKey });
    await expect(service.submit(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.submit).not.toHaveBeenCalled();
    expect(prisma.commercialProspect.create).not.toHaveBeenCalled();
  });

  it('replays an idempotent success without provider or prospect duplication', async () => {
    const existing = { id: 'request-1', status: 'PROCESSED', payloadFingerprint, idempotencyKey: dto.idempotencyKey };
    const { service, prisma, provider } = setup(existing);
    await expect(service.submit(dto)).resolves.toMatchObject({ success: true, replayed: true });
    expect(provider.submit).not.toHaveBeenCalled();
    expect(prisma.commercialProspect.create).not.toHaveBeenCalled();
  });

  it('does not report success when the simulated provider fails', async () => {
    const { service, prisma } = setup(null, false);
    await expect(service.submit(dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.commercialProspect.create).not.toHaveBeenCalled();
    expect(prisma.webAICommercialRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
  });

  it('retries a previously failed key without creating a second intake record', async () => {
    const { service, prisma } = setup({ id: 'request-1', status: 'FAILED', prospectId: null, payloadFingerprint, idempotencyKey: dto.idempotencyKey, requestType: 'DEMO', preferredLanguage: 'FR_CA' });
    await expect(service.submit(dto)).resolves.toMatchObject({ success: true, replayed: true });
    expect(prisma.webAICommercialRequest.create).not.toHaveBeenCalled();
    expect(prisma.commercialProspect.create).toHaveBeenCalledTimes(1);
  });
});
