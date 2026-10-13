import { ProposalIssuanceReadinessService } from './proposal-issuance-readiness.service';

jest.mock('./proposal-customer-preview', () => ({
  buildProposalCustomerPreview: jest.fn(() => ({ totals: {} })),
}));
const revision = (overrides: Record<string, unknown> = {}) => ({
  id: 'revision-1',
  proposalId: 'proposal-1',
  revisionNumber: 1,
  status: 'INTERNAL_REVIEW',
  createdAt: new Date('2026-10-01T12:00:00Z'),
  sentAt: null,
  acceptedAt: null,
  calculatedAt: new Date('2026-10-01T12:00:00Z'),
  firstYearCommitmentMinor: 2492500n,
  proposal: {
    id: 'proposal-1',
    organizationId: 'organization-1',
    prospectId: null,
  },
  createdBy: null,
  sourcePriceBookVersion: { status: 'ACTIVE' },
  lines: [{ calculationStatus: 'CALCULATED', capability: null }],
  inputs: [],
  exclusivities: [],
  commitments: [],
  valueAnalysis: null,
  temporalTerms: {
    serviceStartDate: new Date('2026-11-01T00:00:00Z'),
    initialInvoiceDate: new Date('2026-11-01T00:00:00Z'),
    externalSignatureDate: null,
    externalSignatureEvidence: null,
    offerValidityDays: 90,
    initialTermMonths: 12,
    paymentNetDays: 30,
    automaticRenewal: true,
    nonrenewalNoticeDays: 30,
    renewalTermMonths: 12,
    contractualTimezone: 'America/Toronto',
    calendarConventionVersion: 'proposal-calendar/v1',
  },
  simulationConversion: {
    scenario: { families: [{ familyCode: 'PROFESSIONAL' }] },
  },
  ...overrides,
});

const document = {
  id: 'document-1',
  proposalRevisionId: 'revision-1',
  status: 'FINALIZED',
  fileName: 'offer.pdf',
  artifactVersion: 1,
  compositionSnapshotId: 'snapshot-1',
  compositionSnapshotHash: 'a'.repeat(64),
  compositionReadiness: 'ISSUANCE_READY',
  sha256: 'b'.repeat(64),
  sizeBytes: 1234,
};

function fixture(source = revision()) {
  const db = {
    commercialProposalRevision: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce({ id: source.id }),
    },
    proposalDocument: { findFirst: jest.fn().mockResolvedValue(document) },
    proposalDocumentCompositionSnapshot: {
      findFirst: jest.fn().mockResolvedValue({ id: 'snapshot-1' }),
    },
    adminAuditEvent: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const compositions = {
    evaluateCurrent: jest.fn().mockResolvedValue({
      snapshot: {
        id: 'snapshot-1',
        templateCode: 'CORO_PROFESSIONAL',
        language: 'FR',
        canonicalHash: 'a'.repeat(64),
      },
      current: {
        issuanceReady: true,
        canonicalHash: 'a'.repeat(64),
        diagnostics: [],
      },
    }),
  };
  const service = new ProposalIssuanceReadinessService(
    db as never,
    compositions as never,
    {} as never,
  );
  return { db, compositions, service };
}

describe('ProposalIssuanceReadinessService', () => {
  it('is READY only for the exact current governed revision and document', async () => {
    const { service } = fixture();
    const result = await service.evaluate(
      'proposal-1',
      'revision-1',
      'document-1',
    );
    expect(result.status).toBe('READY');
    expect(result.blockers).toEqual([]);
    expect(result.document?.id).toBe('document-1');
  });

  it('returns actionable blockers for draft clauses/composition and missing temporal terms', async () => {
    const { db, compositions, service } = fixture(
      revision({ temporalTerms: null }),
    );
    compositions.evaluateCurrent.mockResolvedValueOnce({
      snapshot: {
        id: 'snapshot-1',
        templateCode: 'CORO_PROFESSIONAL',
        language: 'FR',
        canonicalHash: 'a'.repeat(64),
      },
      current: {
        issuanceReady: false,
        canonicalHash: 'c'.repeat(64),
        diagnostics: [],
      },
    });
    db.proposalDocumentCompositionSnapshot.findFirst.mockResolvedValueOnce({
      id: 'snapshot-2',
    });
    const result = await service.evaluate('proposal-1', 'revision-1');
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['TEMPORAL_TERMS_MISSING', 'C01_SNAPSHOT_STALE']),
    );
  });

  it('prevents issuance with a PDF different from the explicit approval evidence', async () => {
    const source = revision({ status: 'READY' });
    const { db, service } = fixture(source);
    db.adminAuditEvent.findFirst.mockResolvedValueOnce({
      afterData: { documentId: 'another-document' },
    });
    const result = await service.evaluate(
      'proposal-1',
      'revision-1',
      'document-1',
      'ISSUANCE',
    );
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers.map(({ code }) => code)).toContain(
      'APPROVED_DOCUMENT_MISMATCH',
    );
  });
});
