import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const EXERCISE_REPORT_GENERATOR_VERSION = 'coro-exercise-report/1.0.0';

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim();

export class ExerciseReportRenderer {
  async render(report: any, version: number, template: any): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.setTitle(`CORO Exercise Report - ${clean(report.activityLabel)}`);
    pdf.setAuthor('CORO');
    pdf.setCreator(EXERCISE_REPORT_GENERATOR_VERSION);
    const lines: Array<[string, boolean]> = [
      ['CORO - RAPPORT OFFICIEL D’EXERCICE', true],
      [`Version ${version} | ${clean(report.type)}`, false],
      [`Organisation: ${clean(report.organizationId)}`, false],
      [
        `Batiment: ${clean(report.buildingName)} - ${clean(report.buildingAddress)}`,
        false,
      ],
      [`Exercice: ${clean(report.activityLabel)}`, false],
      [`Scenario: ${clean(report.scenario)}`, false],
      [`Modele: ${clean(template.code)} v${template.version}`, false],
      ['', false],
      ['PARTICIPANTS', true],
      ...(report.participants ?? []).map(
        (item: any) =>
          [
            `${clean(item.name)} - ${clean(item.teamFunction || item.simulatedRole)}`,
            false,
          ] as [string, boolean],
      ),
      ['', false],
      ['CHRONOLOGIE', true],
      ...(report.timelineEntries ?? []).map(
        (item: any) =>
          [
            `${clean(item.occurredAt)} | ${clean(item.event)} | ${clean(item.description)}`,
            false,
          ] as [string, boolean],
      ),
      ['', false],
      ['CONSTATS', true],
      ...(report.findings ?? []).map(
        (item: any) =>
          [
            `${clean(item.type)} | ${clean(item.title)} | ${clean(item.description)}`,
            false,
          ] as [string, boolean],
      ),
      ['', false],
      ['RECOMMANDATIONS', true],
      ...(report.recommendations ?? []).map(
        (item: any) => [clean(item.text), false] as [string, boolean],
      ),
      ['', false],
      ['ACTIONS', true],
      ...(report.actionItems ?? []).map(
        (item: any) =>
          [
            `${clean(item.title)} | ${clean(item.assignedTo)} | ${clean(item.dueDate)}`,
            false,
          ] as [string, boolean],
      ),
      ['', false],
      ['CONCLUSION', true],
      [clean(report.conclusion), false],
    ];
    let page = pdf.addPage([595.28, 841.89]);
    let y = 790;
    for (const [raw, heading] of lines) {
      const font = heading ? bold : regular;
      const size = heading ? 13 : 9.5;
      const words = (raw || ' ').split(/\s+/);
      let line = '';
      const wrapped: string[] = [];
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) < 495) line = next;
        else {
          if (line) wrapped.push(line);
          line = word;
        }
      }
      wrapped.push(line || ' ');
      for (const text of wrapped) {
        if (y < 55) {
          page = pdf.addPage([595.28, 841.89]);
          y = 790;
        }
        page.drawText(text, {
          x: 50,
          y,
          size,
          font,
          color: heading ? rgb(0.08, 0.32, 0.29) : rgb(0.12, 0.16, 0.18),
        });
        y -= heading ? 20 : 14;
      }
      if (heading || !raw) y -= 5;
    }
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }
}
