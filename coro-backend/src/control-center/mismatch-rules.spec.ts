import { hasComparableLimitMismatch, observedMismatch } from './mismatch-rules';

describe('Phase 3A mismatch safety', () => {
  it('does not turn unavailable or inferred observations into commercial mismatches', () => {
    expect(
      observedMismatch({
        licensed: false,
        quality: 'NOT_AVAILABLE',
        observed: null,
      }),
    ).toEqual([]);
    expect(
      observedMismatch({
        licensed: false,
        quality: 'INFERABLE',
        observed: true,
      }),
    ).toEqual([]);
  });
  it('compares limits only for the same snapshot provenance and metric', () => {
    const grants = [
      {
        sourceSnapshotLineId: 'line',
        limits: [
          {
            metricCode: 'SITE',
            quantity: { toString: () => '32' },
            unlimited: false,
          },
        ],
      },
    ];
    expect(
      hasComparableLimitMismatch({
        snapshotLineId: 'line',
        metric: 'SITE',
        quantity: { toString: () => '50' },
        grants,
      }),
    ).toBe(true);
    expect(
      hasComparableLimitMismatch({
        snapshotLineId: 'other',
        metric: 'SITE',
        quantity: { toString: () => '50' },
        grants,
      }),
    ).toBe(false);
    expect(
      hasComparableLimitMismatch({
        snapshotLineId: 'line',
        metric: 'CLIENT',
        quantity: { toString: () => '50' },
        grants,
      }),
    ).toBe(false);
  });
  it('only compares explicit canonical observations and never mutates', () => {
    expect(
      observedMismatch({
        licensed: false,
        quality: 'CANONICAL',
        observed: true,
      })[0],
    ).toMatchObject({
      code: 'OBSERVED_WITHOUT_ENTITLEMENT',
      mutationPerformed: false,
    });
    expect(
      observedMismatch({
        licensed: true,
        quality: 'CANONICAL',
        observed: false,
      })[0],
    ).toMatchObject({
      code: 'ENTITLED_NOT_OBSERVED',
      mutationPerformed: false,
    });
  });
});
