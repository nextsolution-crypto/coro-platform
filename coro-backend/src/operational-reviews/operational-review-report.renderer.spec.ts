import { PDFDocument } from 'pdf-lib';
import { buildOperationalReviewReportText, OperationalReviewReportData, OperationalReviewReportRenderer } from './operational-review-report.renderer';

const data: OperationalReviewReportData = {
  reference: 'REX-2026-000001', reviewVersion: 1, title: 'Évaluation — œuvrer à la sécurité', summary: null,
  confidentiality: 'BUILDING_TEAM', sourceType: 'POPULATION', evidenceReference: 'CORO-SP-2026-000001', evidenceVersion: 1,
  organizationNameAtGeneration: 'Organisation Québec', buildingNameAtGeneration: 'Installation Prémont',
  createdAt: '2026-09-20T10:00:00.000Z', submittedAt: '2026-09-20T11:00:00.000Z', finalizedAt: '2026-09-21T12:00:00.000Z',
  createdByType: 'CLIENT_USER', submittedByType: 'CLIENT_USER', finalizedByType: 'CLIENT_USER',
  generatedAt: '2026-09-21T16:42:00.000Z', generatedByType: 'CLIENT_USER',
  findings: [{ category: 'STRENGTH', title: 'Point fort', description: 'Équipe préparée.\nCoordination efficace.', severity: 'HIGH', impact: null, status: 'ACCEPTED', recommendations: [
    { title: null, description: 'Améliorer la coordination', rationale: 'Écart observé', priority: 'MEDIUM', status: 'DEFERRED', decisionComment: 'À revoir', decidedAt: '2026-09-21T11:00:00.000Z' },
  ] }],
};

describe('OperationalReviewReportRenderer', () => {
  it('humanise le contenu historique sans exposer les actions courantes ni les identifiants', () => {
    const lines = buildOperationalReviewReportText(data).join('\n');
    expect(lines).toContain('REX-2026-000001');
    expect(lines).toContain('CORO-SP-2026-000001 · Version 1');
    expect(lines).toContain('Importance : Élevée');
    expect(lines).toContain('Décision : Reportée');
    expect(lines).toContain('Non renseignée');
    expect(lines).not.toMatch(/BUILDING_TEAM|STRENGTH|DEFERRED|clientIntentId|subscriber|destination|provider|storageKey/i);
  });

  it.each(['INCIDENT', 'EXERCISE'] as const)('fonctionne sans données Population pour %s', (sourceType) => {
    const lines = buildOperationalReviewReportText({ ...data, sourceType, evidenceReference: null, evidenceVersion: null }).join('\n');
    expect(lines).toContain(`Source : ${sourceType === 'INCIDENT' ? 'Incident' : 'Exercice'}`);
    expect(lines).not.toContain('CORO-SP-2026-000001');
  });

  it('produit un PDF A4 multipage avec Unicode et métadonnées maîtrisées', async () => {
    const renderer = new OperationalReviewReportRenderer();
    const bytes = await renderer.render({ ...data, findings: [{ ...data.findings[0], description: ('Événement à Québec — œuvre, façade, été. '.repeat(35) + '\n').repeat(3) }] });
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getPage(0).getSize()).toMatchObject({ width: 595.28, height: 841.89 });
    expect(pdf.getTitle()).toContain(data.reference);
    expect(pdf.getCreator()).toBe('coro-rex-pdf/1.0.0');
    expect(pdf.getCreationDate()?.toISOString()).toBe(data.generatedAt);
  });

  it('produit les mêmes octets pour un snapshot identique', async () => {
    const renderer = new OperationalReviewReportRenderer();
    const first = await renderer.render(data);
    const second = await renderer.render(data);
    expect(second.equals(first)).toBe(true);
  });
});
