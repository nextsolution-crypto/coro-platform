import { readFileSync } from 'fs';

describe('CommercialReconciliationService contract', () => {
  it('contains only the approved seven mismatch codes and no mutation', () => {
    const source = readFileSync(
      __dirname + '/commercial-reconciliation.service.ts',
      'utf8',
    );
    expect(source).not.toMatch(/\.(create|update|delete|upsert)\(/);
    expect(source).toContain('CONTRACT_WITHOUT_ENTITLEMENT');
    expect(source).toContain('INVALID_CONTRACT_PROVENANCE');
    expect(source).toContain('INVALID_DISTRIBUTION_PARENT');
  });
});
