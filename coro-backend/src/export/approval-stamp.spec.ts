jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));
import { approvalStampFromVersion, shortContentHash } from './approval-stamp';
import { generateCoverPage } from './templates/cover.template';

const base = {
  documentType: 'PMU',
  documentTypeLabel: "Plan de mesures d'urgence",
  buildingName: 'Tour A',
  buildingType: 'Bureaux',
  buildingAddress: '1, rue Test, Montréal, QC',
  clientName: 'Client <test>',
  year: 2026,
  language: 'fr' as const,
};

describe('traçabilité imprimée (M1-05)', () => {
  it("lit la version, la date, l'approbateur et l'empreinte de la version approuvée", () => {
    expect(
      approvalStampFromVersion({
        versionNumber: 3,
        snapshot: {
          type: 'APPROVAL',
          contentHash: 'ab'.repeat(32),
          approvedAt: '2026-11-21T15:00:00.000Z',
          approvedBy: '  Ada Admin ',
        },
      }),
    ).toEqual({
      versionNumber: 3,
      approvedAt: '2026-11-21T15:00:00.000Z',
      approvedBy: 'Ada Admin',
      contentHash: 'ab'.repeat(32),
    });
    expect(approvalStampFromVersion({ versionNumber: 1, snapshot: { type: 'MANUAL' } })).toBeUndefined();
    // Approbation antérieure au registre d'empreintes : version sans empreinte.
    expect(
      approvalStampFromVersion({ versionNumber: 8, snapshot: { type: 'APPROVAL', approvedBy: 'Ada' } }),
    ).toEqual({ versionNumber: 8, approvedAt: null, approvedBy: 'Ada', contentHash: null });
    expect(shortContentHash('3F9A01bc77de' + '0'.repeat(52))).toBe('3f9a 01bc 77de');
  });

  it('imprime la version approuvée en couverture, jamais le compte de l’historique', () => {
    const html = generateCoverPage({
      ...base,
      versionNumber: 7,
      approval: {
        versionNumber: 3,
        approvedAt: '2026-11-21T15:00:00.000Z',
        approvedBy: 'Ada <Admin>',
        shortHash: '3f9a 01bc 77de',
      },
    });
    expect(html).toContain('Version approuvée : v3');
    expect(html).toContain('21 novembre 2026');
    expect(html).toContain('Ada &lt;Admin&gt;');
    expect(html).toContain('Empreinte : 3f9a 01bc 77de');
    expect(html).not.toContain('7.0');
  });

  it("omet l'empreinte d'une approbation ancienne sans la présenter comme non approuvée", () => {
    const html = generateCoverPage({
      ...base,
      approval: { versionNumber: 8, approvedAt: null, approvedBy: null, shortHash: null },
    });
    expect(html).toContain('Version approuvée : v8');
    expect(html).not.toContain('Empreinte');
    expect(html).not.toContain('non approuvée');
  });

  it('marque un rendu non approuvé comme version de travail', () => {
    const html = generateCoverPage({ ...base, versionNumber: 4 });
    expect(html).toContain('Version de travail — non approuvée');
    expect(html).not.toContain('4.0');
    const en = generateCoverPage({ ...base, language: 'en' });
    expect(en).toContain('Working version — not approved');
  });
});
