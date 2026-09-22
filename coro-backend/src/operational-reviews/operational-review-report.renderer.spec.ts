import { readFile } from 'fs/promises';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { decodePDFRawStream, PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
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
    expect(pdf.getCreator()).toBe('coro-rex-pdf/1.1.0');
    expect(pdf.getCreationDate()?.toISOString()).toBe(data.generatedAt);
  });

  it('produit les mêmes octets pour un snapshot identique', async () => {
    const renderer = new OperationalReviewReportRenderer();
    const first = await renderer.render(data);
    const second = await renderer.render(data);
    expect(second.equals(first)).toBe(true);
  });

  it('indique la version documentaire R2 sans changer le contenu métier', () => {
    expect(buildOperationalReviewReportText({ ...data, reportVersion: 2 })).toContain('Version REX 1 · Version rapport 2');
    expect(buildOperationalReviewReportText(data)).toContain('Version REX 1 · Version rapport 1');
  });

  it('formate UTC sans double préposition et avec heure à deux chiffres à minuit', () => {
    const text = buildOperationalReviewReportText({
      ...data, finalizedAt: '2026-09-21T16:46:00.000Z', generatedAt: '2026-09-22T00:29:00.000Z',
      generatedByType: 'USER', reportVersion: 3,
    }).join('\n');
    expect(text).toContain('21 septembre 2026 à 16 h 46 UTC');
    expect(text).toContain('22 septembre 2026 à 00 h 29 UTC');
    expect(text).not.toContain('à à');
    expect(text).toContain('Utilisateur CORO');
    expect(text).toContain('Version rapport 3');
  });

  it('conserve la catégorie et le statut historiques des constats', () => {
    const text = buildOperationalReviewReportText({
      ...data, findings: [{ ...data.findings[0], category: 'STRENGTH', status: 'OPEN', description: 'Problème décrit par le rédacteur.' }],
    }).join('\n');
    expect(text).toContain('Catégorie : Point fort');
    expect(text).toContain('Statut : Ouvert');
    expect(text).toContain('Problème décrit par le rédacteur.');
  });

  it('pagine un dossier long sans perdre les métadonnées PDF ni les polices', async () => {
    const findings = Array.from({ length: 14 }, (_, index) => ({
      ...data.findings[0], title: `Constat ${index + 1} — coordination`,
      description: 'Observation détaillée sur les mesures d’urgence et la coordination. '.repeat(30),
      recommendations: [{ ...data.findings[0].recommendations[0], description: 'Amélioration proposée et documentée. '.repeat(18) }],
    }));
    const bytes = await new OperationalReviewReportRenderer().render({ ...data, findings });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(5);
    expect(pdf.getCreator()).toBe('coro-rex-pdf/1.1.0');
    expect(pdf.getTitle()).toContain(data.reference);
    expect(pdf.getAuthor()).toBe('CORO');
    expect(pdf.getSubject()).toBe('Retour d’expérience finalisé');
    for (const page of pdf.getPages()) expect(page.getSize()).toMatchObject({ width: 595.28, height: 841.89 });
  }, 30_000);

  it('embarque deux vraies polices statiques intégrales et des tables ToUnicode', async () => {
    const bytes = await new OperationalReviewReportRenderer().render({
      ...data, title: 'Équipe — é è à ç ù œ É 12345',
    });
    const pdf = await PDFDocument.load(bytes);
    const embedded = new Map<string, Buffer>();
    let unicodeMaps = 0;
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFDict)) continue;
      const file = object.get(PDFName.of('FontFile2'));
      if (file) {
        const stream = pdf.context.lookup(file) as PDFRawStream;
        const fontBytes = Buffer.from(decodePDFRawStream(stream).decode());
        const font = fontkit.create(fontBytes);
        expect(font.postscriptName).not.toBeNull();
        if (!font.postscriptName) throw new Error('Embedded font has no PostScript name');
        embedded.set(font.postscriptName, fontBytes);
      }
      if (object.get(PDFName.of('ToUnicode'))) unicodeMaps += 1;
    }
    expect([...embedded.keys()].sort()).toEqual(['NotoSans', 'NotoSans-Bold']);
    expect(unicodeMaps).toBe(2);
    for (const [name, filename] of [['NotoSans', 'NotoSans-Regular.ttf'], ['NotoSans-Bold', 'NotoSans-Bold.ttf']]) {
      expect(embedded.get(name)?.equals(await readFile(join(process.cwd(), 'assets', 'fonts', filename)))).toBe(true);
    }
  });
});
