import { METRIC_REGISTRY } from './metric-registry';

describe('Phase 3C metric registry', () => {
  it('contains only approved deterministic metrics', () => {
    expect(METRIC_REGISTRY.map((m) => m.code)).toEqual([
      'INCIDENTS_STARTED',
      'EVACUATIONS_STARTED',
      'OCCUPANCY_EVENTS',
      'UNIQUE_OBSERVED_SENTINELLE_SITES',
      'POPULATION_OPERATIONAL_EVENTS',
      'POPULATION_ALERTS_ACTIVATED',
    ]);
    expect(
      METRIC_REGISTRY.every((m) => m.billingStatus === 'NOT_EVALUATED'),
    ).toBe(true);
    expect(
      METRIC_REGISTRY.every((m) =>
        ['CANONICAL', 'DERIVED'].includes(m.minimumSourceQuality),
      ),
    ).toBe(true);
  });
});
