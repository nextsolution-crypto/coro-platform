import {
  calculationKey,
  canonicalJson,
  sourceFingerprint,
} from './calculation-identity';

describe('metering calculation identity', () => {
  const base = {
    metricCode: 'INCIDENTS_STARTED',
    metricVersion: '1',
    policyVersion: '1',
    target: { organizationId: 'org', scope: 'ORGANIZATION' as const },
    periodStart: new Date('2026-09-01T00:00:00.000Z'),
    periodEnd: new Date('2026-10-01T00:00:00.000Z'),
    timezone: 'UTC',
  };
  it('canonicalizes objects and source order deterministically', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    const facts = [
      {
        sourceType: 'IncidentEvent',
        opaqueIdentity: 'b',
        occurredAt: '2026-09-02T00:00:00.000Z',
      },
      {
        sourceType: 'IncidentEvent',
        opaqueIdentity: 'a',
        occurredAt: '2026-09-01T00:00:00.000Z',
      },
    ];
    expect(sourceFingerprint({ ...base, facts })).toBe(
      sourceFingerprint({ ...base, facts: [...facts].reverse() }),
    );
  });
  it('changes both hashes when a relevant fact changes', () => {
    const first = sourceFingerprint({ ...base, facts: [] });
    const second = sourceFingerprint({
      ...base,
      facts: [
        {
          sourceType: 'IncidentEvent',
          opaqueIdentity: 'x',
          occurredAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    });
    expect(first).not.toBe(second);
    expect(
      calculationKey({
        ...base,
        capabilityCode: 'INCIDENT',
        sourceFingerprint: first,
      }),
    ).not.toBe(
      calculationKey({
        ...base,
        capabilityCode: 'INCIDENT',
        sourceFingerprint: second,
      }),
    );
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });
});
