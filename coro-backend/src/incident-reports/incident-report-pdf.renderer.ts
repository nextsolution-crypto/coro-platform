import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { IncidentReportFormSchema } from './incident-report-form-engine';

export const INCIDENT_REPORT_RENDERER_VERSION =
  'coro-incident-report-pdf/1.0.0';
type Locale = 'fr-CA' | 'en-CA';
type PageFormat = 'LETTER' | 'A4';

const text = (value: unknown) => {
  const raw =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return [...raw]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('')
    .trim();
};
const labels = {
  'fr-CA': {
    title: "RAPPORT D'INCIDENT",
    report: 'Rapport',
    version: 'Version',
    building: 'Bâtiment',
    approvals: 'Approbations',
    integrity: 'Intégrité',
    generated: 'Généré le',
  },
  'en-CA': {
    title: 'INCIDENT REPORT',
    report: 'Report',
    version: 'Version',
    building: 'Building',
    approvals: 'Approvals',
    integrity: 'Integrity',
    generated: 'Generated on',
  },
};

export interface IncidentReportPdfInput {
  locale: Locale;
  pageFormat: PageFormat;
  reportNumber: string;
  title: string;
  versionNumber: number;
  reportId: string;
  reportVersionId: string;
  buildingName: string;
  contentHash: string;
  content: Record<string, unknown>;
  schema: IncidentReportFormSchema;
  approvals: Array<{
    decision: string;
    actorRoleSnapshot: string;
    decidedAt: Date;
  }>;
  generatedAt: Date;
}

export class IncidentReportPdfRenderer {
  async render(input: IncidentReportPdfInput): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const size: [number, number] =
      input.pageFormat === 'LETTER' ? [612, 792] : [595.28, 841.89];
    pdf.setTitle(`${input.reportNumber} - ${text(input.title)}`);
    pdf.setAuthor('CORO');
    pdf.setCreator(INCIDENT_REPORT_RENDERER_VERSION);
    pdf.setProducer('CORO / pdf-lib');
    const l = labels[input.locale];
    let page = pdf.addPage(size);
    let y = size[1] - 54;
    const addPage = () => {
      page = pdf.addPage(size);
      y = size[1] - 54;
    };
    const draw = (
      raw: string,
      options: {
        bold?: boolean;
        fontSize?: number;
        color?: ReturnType<typeof rgb>;
        gap?: number;
      } = {},
    ) => {
      const font = options.bold ? bold : regular;
      const fontSize = options.fontSize ?? 9.5;
      const lines = this.wrap(text(raw) || ' ', font, fontSize, size[0] - 92);
      for (const line of lines) {
        if (y < 62) addPage();
        page.drawText(line, {
          x: 46,
          y,
          size: fontSize,
          font,
          color: options.color ?? rgb(0.1, 0.15, 0.18),
        });
        y -= fontSize + 5;
      }
      y -= options.gap ?? 2;
    };
    draw(l.title, {
      bold: true,
      fontSize: 18,
      color: rgb(0.03, 0.38, 0.32),
      gap: 8,
    });
    draw(
      `${l.report}: ${input.reportNumber} | ${l.version}: ${input.versionNumber}`,
      { bold: true },
    );
    draw(`${l.building}: ${text(input.buildingName)}`);
    draw(text(input.title), { fontSize: 13, bold: true, gap: 10 });
    for (const section of input.schema.sections) {
      const visible = section.fields.filter((field) => {
        const value = input.content[field.key];
        return (
          value !== undefined &&
          value !== null &&
          value !== '' &&
          (!Array.isArray(value) || value.length > 0)
        );
      });
      if (!visible.length) continue;
      draw(
        text(
          input.locale === 'en-CA'
            ? section.titleEn || section.title
            : section.title,
        ),
        {
          bold: true,
          fontSize: 12,
          color: rgb(0.03, 0.38, 0.32),
          gap: 4,
        },
      );
      for (const field of visible) {
        const value = input.content[field.key];
        if (Array.isArray(value)) {
          draw(
            text(
              input.locale === 'en-CA'
                ? field.labelEn || field.label
                : field.label,
            ),
            { bold: true },
          );
          value.forEach((item, index) =>
            draw(`${index + 1}. ${this.format(item)}`),
          );
        } else
          draw(
            `${text(input.locale === 'en-CA' ? field.labelEn || field.label : field.label)}: ${this.format(value)}`,
          );
      }
      y -= 5;
    }
    if (input.approvals.length) {
      draw(l.approvals, {
        bold: true,
        fontSize: 12,
        color: rgb(0.03, 0.38, 0.32),
      });
      input.approvals.forEach((approval) =>
        draw(
          `${approval.decision} - ${text(approval.actorRoleSnapshot)} - ${approval.decidedAt.toISOString()}`,
        ),
      );
    }
    draw(`${l.integrity}: SHA-256 ${input.contentHash}`, {
      bold: true,
      gap: 1,
    });
    draw(`Report ID: ${input.reportId} | Version ID: ${input.reportVersionId}`);
    draw(
      `${l.generated}: ${input.generatedAt.toISOString()} | ${INCIDENT_REPORT_RENDERER_VERSION}`,
    );
    const pages = pdf.getPages();
    pages.forEach((item, index) =>
      item.drawText(`${index + 1} / ${pages.length}`, {
        x: size[0] - 76,
        y: 28,
        size: 8,
        font: regular,
        color: rgb(0.35, 0.4, 0.42),
      }),
    );
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }

  private wrap(
    value: string,
    font: PDFFont,
    size: number,
    width: number,
  ): string[] {
    const words = value.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line || ' ');
    return lines;
  }
  private format(value: unknown): string {
    if (value && typeof value === 'object')
      return Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => `${key}: ${text(item)}`)
        .join(' | ');
    return text(value);
  }
}
