import { CAPABILITY_REGISTRY } from './capability-registry';

describe('Capability registry', () => {
  it('expose exactement la taxonomie commerciale approuvée', () => {
    expect(CAPABILITY_REGISTRY.map(({ code }) => code)).toEqual([
      'COMPLIANCE_OPERATIONS',
      'PERFORMANCE',
      'INCIDENT',
      'KNOWLEDGE',
      'AI',
      'NETWORK',
      'SENTINELLE',
      'SENTINELLE_POPULATION',
      'CAMPUS',
    ]);
    expect(CAPABILITY_REGISTRY).toHaveLength(9);
    expect(CAPABILITY_REGISTRY.map(({ code }) => code)).not.toEqual(
      expect.arrayContaining(['BOOKING', 'PLANNER', 'DOCUMENTS', 'PROJECTS']),
    );
  });

  it.each(['NETWORK', 'CAMPUS'])('marque %s FUTURE et indisponible', (code) => {
    expect(
      CAPABILITY_REGISTRY.find((item) => item.code === code),
    ).toMatchObject({
      lifecycle: 'FUTURE',
      platformAvailability: 'NOT_AVAILABLE',
    });
  });
});
