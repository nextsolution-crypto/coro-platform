import { classifyWebAIIntent, commercialPrompt } from './web-ai-intent.classifier';

describe('WEB-AI deterministic intent classifier', () => {
  it.each([
    ['Je voudrais une démonstration', 'COMMERCIAL_REQUEST', true],
    ['How much does CORO cost?', 'PRICING', true],
    ['Comment gérer plusieurs bâtiments?', 'BUILDING_MANAGEMENT', false],
    ['Aide avec un problème technique', 'TECHNICAL_SUPPORT', false],
    ['Bonjour', 'GENERAL_INFORMATION', false],
  ])('classifies %s', (message, intent, commercial) => {
    expect(classifyWebAIIntent(message)).toMatchObject({ intent, commercial });
  });

  it('offers an optional bilingual commercial prompt only for explicit commercial intents', () => {
    expect(commercialPrompt('PRICING', 'fr-CA')).toContain('volontairement');
    expect(commercialPrompt('COMMERCIAL_REQUEST', 'en-CA')).toContain('voluntarily');
    expect(commercialPrompt('GENERAL_INFORMATION', 'fr-CA')).toBeUndefined();
  });
});
