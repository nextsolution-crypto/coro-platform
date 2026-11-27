import { DEFAULT_MANDATE_RULES, deliveryDays, loadMandateRules } from './mandate-rules';

describe('Règles des mandats', () => {
  it('applique les délais par défaut CORO', () => {
    expect(deliveryDays(DEFAULT_MANDATE_RULES, 'EVACUATION', 200)).toBe(10);
    expect(deliveryDays(DEFAULT_MANDATE_RULES, 'STANDARD', 18)).toBe(21);
    expect(deliveryDays(DEFAULT_MANDATE_RULES, 'STANDARD', 80)).toBe(90);
  });

  it("utilise les règles propres à l'organisation", async () => {
    const db = { organization: { findUnique: jest.fn().mockResolvedValue({
      ...DEFAULT_MANDATE_RULES, mandateLongThresholdHours: 40, mandateShortDeliveryDays: 30 }) } };
    const rules = await loadMandateRules(db, 'org');
    expect(deliveryDays(rules, 'STANDARD', 39)).toBe(30);
    expect(deliveryDays(rules, 'STANDARD', 40)).toBe(90);
  });

  it('retombe sur les valeurs par défaut sans organisation', async () => {
    await expect(loadMandateRules({}, 'org')).resolves.toEqual(DEFAULT_MANDATE_RULES);
  });
});
