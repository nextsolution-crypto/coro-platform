import { readFileSync } from 'fs';
import { join } from 'path';

describe('commercial subscription policy contract', () => {
  const source = readFileSync(join(process.cwd(), 'src/commercial-subscriptions/commercial-subscriptions.service.ts'), 'utf8');
  it('requires accepted quote, signed active contract and exact pricebook', () => {
    expect(source).toContain('ACTIVE_CONTRACT_REQUIRED');
    expect(source).toContain('SIGNED_CONTRACT_REVISION_REQUIRED');
    expect(source).toContain('ACCEPTED_PROPOSAL_REQUIRED');
    expect(source).toContain('COMMERCIAL_PROVENANCE_MISMATCH');
    expect(source).toContain('BILLING_CADENCE_CONTRACT_MISMATCH');
  });
  it('never automatically suspends entitlements for past due status', () => {
    expect(source).toContain("'past-due': { from: ['ACTIVE'], to: 'PAST_DUE' }");
    expect(source).toContain('automaticSuspension: false');
    expect(source).toContain('criticalEmergencyAutomaticDisable: false');
    expect(source).toContain("entitlementMutation: 'NONE_EXPLICIT_APPLY_REQUIRED'");
  });
});
