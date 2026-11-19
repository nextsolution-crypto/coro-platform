import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {
  decodePDFRawStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import {
  IncidentReportPdfRenderer,
  INCIDENT_REPORT_RENDERER_VERSION,
} from './incident-report-pdf.renderer';

describe('IncidentReportPdfRenderer', () => {
  it.each(['LETTER', 'A4'] as const)(
    'renders a deterministic authoritative %s document',
    async (pageFormat) => {
      const bytes = await new IncidentReportPdfRenderer().render({
        locale: 'fr-CA',
        pageFormat,
        reportNumber: 'IR-TEST-001',
        title: 'Incident synthetique',
        versionNumber: 2,
        reportId: 'report-1',
        reportVersionId: 'version-2',
        buildingName: 'Immeuble fictif',
        timeZone: 'America/Toronto',
        contentHash: 'a'.repeat(64),
        content: {
          summary: 'Verification sans donnee reelle',
          empty: '',
          people: [{ name: 'Personne fictive', role: 'TEMOIN' }],
        },
        schema: {
          schemaVersion: '1.0',
          sections: [
            {
              key: 'main',
              title: 'Renseignements',
              fields: [
                { key: 'summary', label: 'Resume', type: 'LONG_TEXT' },
                { key: 'empty', label: 'Vide', type: 'SHORT_TEXT' },
                {
                  key: 'people',
                  label: 'Personnes',
                  type: 'REPEATABLE_SECTION',
                },
              ],
            },
          ],
        },
        approvals: [
          {
            decision: 'APPROVED',
            actorRoleSnapshot: 'SUPERVISOR',
            actorType: 'CLIENT_USER',
            actorId: 'reviewer-1',
            actorDisplayName: 'Marie-Ève Prémont',
            actorDisplayNameSource: 'CURRENT_PROFILE',
            decidedAt: new Date('2026-12-15T12:00:00Z'),
          },
        ],
        generatedAt: new Date('2026-12-15T12:05:00Z'),
      });
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBeGreaterThan(0);
      expect(pdf.getCreator()).toBe(INCIDENT_REPORT_RENDERER_VERSION);
      expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    },
  );

  it('embeds the exact Noto Sans fonts used for measuring and drawing', async () => {
    const bytes = await new IncidentReportPdfRenderer().render(
      thisInput({ title: 'Évacuation — sécurité, bâtiment et œuvre' }),
    );
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
        if (!font.postscriptName) throw new Error('Embedded font has no name');
        embedded.set(font.postscriptName, fontBytes);
      }
      if (object.get(PDFName.of('ToUnicode'))) unicodeMaps += 1;
    }
    expect([...embedded.keys()].sort()).toEqual(['NotoSans', 'NotoSans-Bold']);
    expect(unicodeMaps).toBe(2);
    for (const [name, filename] of [
      ['NotoSans', 'NotoSans-Regular.ttf'],
      ['NotoSans-Bold', 'NotoSans-Bold.ttf'],
    ]) {
      expect(
        embedded
          .get(name)
          ?.equals(
            await readFile(join(process.cwd(), 'assets', 'fonts', filename)),
          ),
      ).toBe(true);
    }
  });

  it('renders a readable actor block, local dates and long multipage content', async () => {
    const bytes = await new IncidentReportPdfRenderer().render(
      thisInput({
        content: {
          occurredAt: '2026-11-19T17:30:00.000Z',
          summary:
            'Présence simulée d’eau au sol. Sécurité, bâtiment, évacuation. '.repeat(
              180,
            ),
          reference: 'X'.repeat(260),
        },
        schema: {
          schemaVersion: '1.0',
          sections: [
            {
              key: 'event',
              title: 'Événement',
              fields: [
                { key: 'occurredAt', label: 'Date et heure', type: 'DATETIME' },
                { key: 'summary', label: 'Résumé', type: 'LONG_TEXT' },
                {
                  key: 'reference',
                  label: 'Référence longue',
                  type: 'SHORT_TEXT',
                },
              ],
            },
          ],
        },
        approvals: [
          {
            decision: 'REVIEWED',
            actorRoleSnapshot: 'INCIDENT_REPORT_REVIEW',
            actorType: 'CLIENT_USER',
            actorId: 'reviewer-1',
            actorDisplayName: 'Marie-Ève Prémont',
            actorDisplayNameSource: 'CURRENT_PROFILE',
            decidedAt: new Date('2026-11-19T18:21:20.036Z'),
          },
          {
            decision: 'APPROVED',
            actorRoleSnapshot: 'INCIDENT_REPORT_APPROVE',
            actorType: 'CLIENT_USER',
            actorId: 'reviewer-1',
            actorDisplayName: 'Marie-Ève Prémont',
            actorDisplayNameSource: 'CURRENT_PROFILE',
            decidedAt: new Date('2026-11-19T18:21:43.257Z'),
          },
        ],
      }),
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getCreator()).toBe(INCIDENT_REPORT_RENDERER_VERSION);
    expect(pdf.getCreationDate()?.toISOString()).toBe(
      '2026-11-19T18:21:57.000Z',
    );
  }, 30_000);
});

function thisInput(overrides: Record<string, unknown> = {}) {
  return {
    locale: 'fr-CA' as const,
    pageFormat: 'LETTER' as const,
    reportNumber: 'IR-20261119-9D7A5AA4',
    title: 'RECETTE CORO — TEST FICTIF — PR362',
    versionNumber: 1,
    reportId: '9d7a5aa4-e54a-4fef-b541-21e7df870ab7',
    reportVersionId: '753e573e-46ec-43aa-9ebd-343e3496dd93',
    buildingName: 'Tour Prémont',
    timeZone: 'America/Toronto',
    contentHash: 'a'.repeat(64),
    content: { summary: 'Vérification sans donnée réelle.' },
    schema: {
      schemaVersion: '1.0' as const,
      sections: [
        {
          key: 'main',
          title: 'Événement',
          fields: [
            { key: 'summary', label: 'Résumé', type: 'LONG_TEXT' as const },
          ],
        },
      ],
    },
    approvals: [
      {
        decision: 'APPROVED',
        actorRoleSnapshot: 'INCIDENT_REPORT_APPROVE',
        actorType: 'CLIENT_USER',
        actorId: 'reviewer-1',
        actorDisplayName: 'Marie-Ève Prémont',
        actorDisplayNameSource: 'CURRENT_PROFILE' as const,
        decidedAt: new Date('2026-11-19T18:21:43.257Z'),
      },
    ],
    generatedAt: new Date('2026-11-19T18:21:57.758Z'),
    ...overrides,
  };
}
