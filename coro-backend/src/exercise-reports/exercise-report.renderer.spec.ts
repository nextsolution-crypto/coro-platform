import { PDFDocument } from 'pdf-lib';
import {
  EXERCISE_REPORT_GENERATOR_VERSION,
  ExerciseReportRenderer,
} from './exercise-report.renderer';

describe('ExerciseReportRenderer', () => {
  it('renders a deterministic private-publication artifact with official metadata', async () => {
    const bytes = await new ExerciseReportRenderer().render(
      {
        activityLabel: 'Exercice synthétique',
        organizationId: 'org-qa',
        buildingName: 'Bâtiment QA',
        buildingAddress: 'Montréal',
        type: 'EVACUATION',
        scenario: 'Scénario contrôlé',
        conclusion: 'Conclusion validée',
        participants: [],
        timelineEntries: [],
        findings: [],
        recommendations: [],
        actionItems: [],
      },
      1,
      { code: 'CORO_STANDARD', version: 1 },
    );

    const pdf = await PDFDocument.load(bytes);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toContain('Exercice synthétique');
    expect(pdf.getCreator()).toBe(EXERCISE_REPORT_GENERATOR_VERSION);
  });
});
