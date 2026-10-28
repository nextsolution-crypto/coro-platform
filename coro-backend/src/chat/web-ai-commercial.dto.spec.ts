import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WebAICommercialRequestDto } from './web-ai-commercial.dto';

const valid = {
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
  requestType: 'DEMO',
  contactName: 'Synthetic Person',
  organizationName: 'Synthetic Organization',
  email: 'person@example.test',
  interestedModules: ['CORO Knowledge'],
  preferredLanguage: 'fr-CA',
  consentToProcess: true,
  consentTextVersion: 'web-ai-commercial-v1',
  consentAction: 'CHECKBOX_AND_SUBMIT',
  marketingConsent: false,
};

async function errors(payload: Record<string, unknown>) {
  return validate(plainToInstance(WebAICommercialRequestDto, payload));
}

describe('WebAICommercialRequestDto adversarial validation', () => {
  it('accepts the governed minimal bilingual contract', async () => {
    await expect(errors(valid)).resolves.toHaveLength(0);
    await expect(
      errors({ ...valid, preferredLanguage: 'en-CA' }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    ['invalid email', { email: 'not-an-email' }],
    ['forged consent version', { consentTextVersion: 'visitor-controlled' }],
    ['forged consent action', { consentAction: 'SILENT' }],
    ['invalid language', { preferredLanguage: 'fr-FR' }],
    ['invalid request type', { requestType: 'DELETE' }],
    [
      'oversized module collection',
      {
        interestedModules: Array.from(
          { length: 13 },
          (_, index) => `module-${index}`,
        ),
      },
    ],
    ['invalid building count', { buildingCount: 0 }],
  ])('rejects %s', async (_label, override) => {
    expect(await errors({ ...valid, ...override })).not.toHaveLength(0);
  });
});
