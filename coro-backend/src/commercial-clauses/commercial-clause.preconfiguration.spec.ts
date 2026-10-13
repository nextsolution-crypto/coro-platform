import { CommercialClauseCategory } from '@prisma/client';
import {
  B01_DRAFT_PROVENANCE,
  B01_OFFICIAL_LEGAL_REFERENCES,
  B01_STANDARD_CLAUSE_DRAFTS,
} from './commercial-clause.preconfiguration';

describe('B01 standard clause preconfiguration registry', () => {
  it('contains every canonical category exactly once with complete bilingual drafts', () => {
    const categories = Object.values(CommercialClauseCategory);
    expect(B01_STANDARD_CLAUSE_DRAFTS).toHaveLength(25);
    expect(
      new Set(B01_STANDARD_CLAUSE_DRAFTS.map(({ category }) => category)),
    ).toEqual(new Set(categories));
    for (const draft of B01_STANDARD_CLAUSE_DRAFTS) {
      expect(draft.titleFR.trim().length).toBeGreaterThan(3);
      expect(draft.titleEN.trim().length).toBeGreaterThan(3);
      expect(draft.textFR.trim().length).toBeGreaterThan(80);
      expect(draft.textEN.trim().length).toBeGreaterThan(80);
      expect(draft.textFR).not.toContain('NOT_APPROVED');
      expect(draft.textEN).not.toContain('NOT_APPROVED');
      expect(draft.legalReviewNotes.trim()).not.toHaveLength(0);
      expect(draft.legalReferences).toEqual(B01_OFFICIAL_LEGAL_REFERENCES);
    }
    expect(B01_DRAFT_PROVENANCE).toContain('LEGAL_REVIEW_REQUIRED');
  });

  it('preserves founder defaults and flags unresolved decisions', () => {
    const byCategory = new Map(
      B01_STANDARD_CLAUSE_DRAFTS.map((draft) => [draft.category, draft]),
    );
    expect(byCategory.get('OFFER_VALIDITY')?.textEN).toContain('ninety (90)');
    expect(byCategory.get('SAAS_SUBSCRIPTION')?.textEN).toContain(
      'twelve (12)',
    );
    expect(byCategory.get('PAYMENT_TERMS')?.textEN).toContain('thirty (30)');
    expect(byCategory.get('RENEWAL')?.textEN).toContain('Automatic renewal');
    expect(byCategory.get('RENEWAL')?.textEN).toContain('TO BE CONFIRMED');
    expect(byCategory.get('LIABILITY')?.textEN).toContain('TO BE CONFIRMED');
    expect(byCategory.get('DATA_RETENTION_AND_RETURN')?.textEN).toContain(
      'TO BE CONFIRMED',
    );
    expect(byCategory.get('ADDITIONAL_FEES')?.textEN).toContain(
      'TO BE CONFIRMED',
    );
  });
});
