import { PDFDocument } from 'pdf-lib';
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
});
