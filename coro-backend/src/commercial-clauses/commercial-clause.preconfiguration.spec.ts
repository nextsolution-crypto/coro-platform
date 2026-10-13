import { CommercialClauseCategory } from '@prisma/client';
import {
  B01_DRAFT_PROVENANCE,
  B01_OFFICIAL_LEGAL_REFERENCES,
  B01_PREVIOUS_STANDARD_CLAUSE_DRAFTS,
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

  it('aligns the confirmed Founder policies in complete bilingual drafts', () => {
    const byCategory = new Map(
      B01_STANDARD_CLAUSE_DRAFTS.map((draft) => [draft.category, draft]),
    );
    expect(byCategory.get('OFFER_VALIDITY')?.textEN).toContain('ninety (90)');
    expect(byCategory.get('SAAS_SUBSCRIPTION')?.textEN).toContain(
      'twelve (12)',
    );
    expect(byCategory.get('PAYMENT_TERMS')?.textEN).toContain('thirty (30)');
    expect(byCategory.get('RENEWAL')?.textEN).toContain('automatically renews');
    expect(byCategory.get('RENEWAL')?.textEN).toContain(
      'successive periods of twelve (12) calendar months',
    );
    expect(byCategory.get('RENEWAL')?.textEN).toContain('thirty (30)');
    expect(byCategory.get('TERMINATION')?.textEN).toContain('thirty (30)');
    expect(byCategory.get('LIABILITY')?.textEN).toContain(
      'fees paid or payable for the affected services',
    );
    expect(byCategory.get('LIABILITY')?.textEN).toContain('gross fault');
    expect(byCategory.get('LIABILITY')?.textFR).toContain('préjudice corporel');
    expect(byCategory.get('SUPPORT_AND_MAINTENANCE')?.textEN).toContain(
      '9:00 a.m. to 5:00 p.m. America/Toronto',
    );
    expect(byCategory.get('SUPPORT_AND_MAINTENANCE')?.textEN).toContain(
      'No 24/7 support',
    );
    expect(byCategory.get('SERVICE_AVAILABILITY')?.textEN).not.toContain(
      '99.9%',
    );
    expect(byCategory.get('DATA_RETENTION_AND_RETURN')?.textEN).toContain(
      'thirty (30) calendar days',
    );
    expect(byCategory.get('ADDITIONAL_FEES')?.textEN).toContain(
      'SMS is charged based on usage',
    );
    expect(byCategory.get('ADDITIONAL_FEES')?.textEN).toContain('PriceBook');
    expect(byCategory.get('ADDITIONAL_FEES')?.textEN).not.toMatch(
      /\$|\b\d+[.,]\d{2}\b/,
    );
    expect(byCategory.get('SCOPE_CHANGE')?.textEN).toContain(
      'No exclusivity is included',
    );
    expect(byCategory.get('SCOPE_CHANGE')?.textEN).toContain(
      'separate express agreement',
    );
  });

  it('retains the exact previous standard baseline for safe human-edit detection', () => {
    expect(B01_PREVIOUS_STANDARD_CLAUSE_DRAFTS).toHaveLength(25);
    expect(
      B01_PREVIOUS_STANDARD_CLAUSE_DRAFTS.find(
        ({ category }) => category === 'RENEWAL',
      )?.textEN,
    ).toContain('TO BE CONFIRMED');
    expect(B01_PREVIOUS_STANDARD_CLAUSE_DRAFTS).not.toBe(
      B01_STANDARD_CLAUSE_DRAFTS,
    );
  });
});
