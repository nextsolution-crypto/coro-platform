import {
  ProposalDetailResponseSource,
  ProposalListResponseSource,
  proposalDetailResponse,
  proposalListResponse,
  proposalRevisionResponse,
} from './proposal-response';

const assertNoBigInt = (value: unknown): void => {
  expect(typeof value).not.toBe('bigint');
  if (Array.isArray(value)) value.forEach(assertNoBigInt);
  else if (value && typeof value === 'object')
    Object.values(value).forEach(assertNoBigInt);
};

describe('Proposal HTTP response projection', () => {
  const large = 9007199254740993123456789n;
  const revisionMoney = {
    oneTimeTotalMinor: large,
    recurringMonthlyCadenceMinor: 50000n,
    recurringAnnualCadenceMinor: 0n,
    monthlyRecurringEquivalentMinor: 50000n,
    annualRecurringEquivalentMinor: 600000n,
    estimatedUsageTotalMinor: 0n,
    firstYearCommitmentMinor: 850000n,
  };

  it('serializes all reachable Proposal Detail BigInts recursively', () => {
    const source = {
      id: 'proposal-a',
      revisions: [
        {
          id: 'revision-a',
          ...revisionMoney,
          lines: [
            {
              catalogUnitAmountMinor: large,
              proposedUnitAmountMinor: 50000n,
              catalogExtendedAmountMinor: large,
              proposedExtendedAmountMinor: 50000n,
              tiers: [
                {
                  amountMinor: large,
                  extendedAmountMinor: large,
                },
              ],
              adjustments: [{ overrideAmountMinor: large }],
            },
          ],
          inputs: [{ integerValue: large, moneyMinor: large }],
          adjustments: [{ overrideAmountMinor: large }],
          commitments: [{ amountMinor: large }],
          valueAnalysis: {
            currentBillableRateMinorPerHour: large,
            estimatedCapacityValueMinor: large,
          },
          exclusivities: [],
          documents: [],
        },
      ],
    } as unknown as ProposalDetailResponseSource;

    const response = proposalDetailResponse(source)!;
    assertNoBigInt(response);
    expect(response.revisions[0]).toMatchObject({
      oneTimeTotalMinor: large.toString(),
      recurringMonthlyCadenceMinor: '50000',
      annualRecurringEquivalentMinor: '600000',
      firstYearCommitmentMinor: '850000',
    });
    expect(response.revisions[0].lines[0]).toMatchObject({
      catalogUnitAmountMinor: large.toString(),
      proposedUnitAmountMinor: '50000',
    });
    expect(response.revisions[0].valueAnalysis).toMatchObject({
      currentBillableRateMinorPerHour: large.toString(),
      estimatedCapacityValueMinor: large.toString(),
    });
  });

  it('keeps lifecycle revision responses exact and JSON safe', () => {
    const response = proposalRevisionResponse(revisionMoney);
    assertNoBigInt(response);
    expect(response.oneTimeTotalMinor).toBe(large.toString());
    expect(response.annualRecurringEquivalentMinor).toBe('600000');
  });

  it('preserves null Proposal reads', () => {
    expect(proposalDetailResponse(null)).toBeNull();
  });

  it('projects Proposal lists without raw BigInt or internal relations', () => {
    const source = [
      {
        id: 'proposal-a',
        reference: 'PROP-TEST',
        title: 'Test proposal',
        status: 'DRAFT',
        createdAt: new Date('2026-10-09T00:00:00.000Z'),
        organization: null,
        prospect: { displayName: 'Test prospect' },
        revisions: [
          {
            id: 'revision-a',
            revisionNumber: 1,
            status: 'DRAFT',
            validFrom: null,
            validUntil: new Date('2026-11-09T00:00:00.000Z'),
            ...revisionMoney,
          },
        ],
      },
    ] as unknown as ProposalListResponseSource[];

    const response = proposalListResponse(source);
    expect(() => JSON.stringify(response)).not.toThrow();
    assertNoBigInt(response);
    expect(response[0]).toMatchObject({
      reference: 'PROP-TEST',
      status: 'DRAFT',
      prospect: { displayName: 'Test prospect' },
      revisions: [
        {
          revisionNumber: 1,
          oneTimeTotalMinor: large.toString(),
          recurringAnnualCadenceMinor: '0',
          firstYearCommitmentMinor: '850000',
        },
      ],
    });
    expect(response[0]).not.toHaveProperty('createdByUserId');
    expect(response[0].revisions[0]).not.toHaveProperty('internalNotes');
  });

  it('keeps empty Proposal lists valid', () => {
    expect(proposalListResponse([])).toEqual([]);
    expect(JSON.stringify(proposalListResponse([]))).toBe('[]');
  });
});
