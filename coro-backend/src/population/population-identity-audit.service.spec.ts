import { PopulationIdentityAuditService } from './population-identity-audit.service';

describe('PopulationIdentityAuditService', () => {
  it('reports duplicate metadata with keyed fingerprints and no PII', () => {
    const now = new Date('2026-10-04T12:00:00Z');
    const rows = [' ACTIVE ', 'SUSPENDED'].map((status, index) => ({
      programId: 'program-1',
      status: status.trim(),
      email: index ? ' citizen@example.com ' : 'Citizen@Example.com',
      emailCanonical: null,
      phoneCanonical: null,
      createdAt: now,
      updatedAt: now,
      verifiedAt: index ? null : now,
      verificationCount: 1,
      consentEventCount: 2,
      smsEvidenceCount: 0,
      alertDeliveryCount: 3,
    }));
    const report = new PopulationIdentityAuditService().audit(
      rows,
      'a-key-long-enough-for-safe-hmac-output',
    );
    expect(report).toHaveLength(1);
    expect(report[0]).toEqual(
      expect.objectContaining({
        identityType: 'EMAIL',
        subscriberCount: 2,
        verificationCount: 2,
        consentEventCount: 4,
        alertDeliveryCount: 6,
      }),
    );
    expect(report[0]?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(report)).not.toContain('citizen@example.com');
  });

  it('does not report an abandoned historical row as a current duplicate', () => {
    const now = new Date('2026-10-04T12:00:00Z');
    const common = {
      programId: 'program-1',
      email: 'citizen@example.com',
      emailCanonical: 'citizen@example.com',
      phoneCanonical: null,
      createdAt: now,
      updatedAt: now,
      verifiedAt: now,
      verificationCount: 1,
      consentEventCount: 2,
      smsEvidenceCount: 0,
      alertDeliveryCount: 0,
    };
    const report = new PopulationIdentityAuditService().audit(
      [
        { ...common, status: 'ACTIVE' },
        { ...common, status: 'ABANDONED' },
      ],
      'a-key-long-enough-for-safe-hmac-output',
    );
    expect(report).toEqual([]);
  });
});
