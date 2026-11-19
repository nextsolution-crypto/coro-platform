import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import {
  FormFieldDefinition,
  IncidentReportFormSchema,
} from './incident-report-form-engine';

export const INCIDENT_REPORT_RENDERER_VERSION =
  'coro-incident-report-pdf/1.1.0';
type Locale = 'fr-CA' | 'en-CA';
type PageFormat = 'LETTER' | 'A4';

const clean = (value: unknown) => {
  const raw =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return Array.from(raw)
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
        code === 127
        ? ' '
        : character;
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
    approvals: 'Révision et approbation',
    reviewedBy: 'Révisé par',
    reviewedAt: 'Date de révision',
    approvedBy: 'Approuvé par',
    approvedAt: "Date d'approbation",
    actorResolved: "nom résolu lors de l'export",
    actorStable: 'Identifiant historique stable',
    integrity: 'Intégrité',
    traceability: 'Traçabilité',
    generated: 'Généré le',
    renderer: 'Moteur de rendu',
    hashNotice:
      "L'empreinte SHA-256 vérifie le contenu figé de la version du rapport; elle ne constitue pas une signature numérique.",
    unknownActor: 'Identité nominative historique non enregistrée',
  },
  'en-CA': {
    title: 'INCIDENT REPORT',
    report: 'Report',
    version: 'Version',
    building: 'Building',
    approvals: 'Review and approval',
    reviewedBy: 'Reviewed by',
    reviewedAt: 'Review date',
    approvedBy: 'Approved by',
    approvedAt: 'Approval date',
    actorResolved: 'name resolved at export time',
    actorStable: 'Stable historical identifier',
    integrity: 'Integrity',
    traceability: 'Traceability',
    generated: 'Generated on',
    renderer: 'Rendering engine',
    hashNotice:
      'The SHA-256 digest verifies the frozen report version content; it is not a digital signature.',
    unknownActor: 'Historical display name was not recorded',
  },
};

export interface IncidentReportPdfApproval {
  decision: string;
  actorRoleSnapshot: string;
  actorType: string;
  actorId: string;
  actorDisplayName: string | null;
  actorDisplayNameSource: 'CURRENT_PROFILE' | 'STABLE_ACTOR_ID';
  decidedAt: Date;
}

export interface IncidentReportPdfInput {
  locale: Locale;
  pageFormat: PageFormat;
  reportNumber: string;
  title: string;
  versionNumber: number;
  reportId: string;
  reportVersionId: string;
  buildingName: string;
  timeZone: string;
  contentHash: string;
  content: Record<string, unknown>;
  schema: IncidentReportFormSchema;
  approvals: IncidentReportPdfApproval[];
  generatedAt: Date;
}

export class IncidentReportPdfRenderer {
  async render(input: IncidentReportPdfInput): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fontDirectory = join(process.cwd(), 'assets', 'fonts');
    const [regularBytes, boldBytes] = await Promise.all([
      readFile(join(fontDirectory, 'NotoSans-Regular.ttf')),
      readFile(join(fontDirectory, 'NotoSans-Bold.ttf')),
    ]);
    // Use the same embedded static fonts for measurement and drawing. This
    // avoids viewer-dependent Base-14 substitution and metric drift.
    const regular = await pdf.embedFont(regularBytes, { subset: false });
    const bold = await pdf.embedFont(boldBytes, { subset: false });
    const size: [number, number] =
      input.pageFormat === 'LETTER' ? [612, 792] : [595.28, 841.89];
    pdf.setTitle(`${input.reportNumber} - ${clean(input.title)}`);
    pdf.setAuthor('CORO');
    pdf.setSubject('Rapport incident approuvé');
    pdf.setCreator(INCIDENT_REPORT_RENDERER_VERSION);
    pdf.setProducer('CORO / pdf-lib');
    pdf.setCreationDate(input.generatedAt);
    pdf.setModificationDate(input.generatedAt);

    const l = labels[input.locale];
    const pages: PDFPage[] = [];
    let page!: PDFPage;
    let y = 0;
    const margin = 46;
    const contentWidth = size[0] - margin * 2;
    const ink = rgb(0.1, 0.15, 0.18);
    const muted = rgb(0.35, 0.4, 0.42);
    const green = rgb(0.03, 0.38, 0.32);

    const addPage = () => {
      page = pdf.addPage(size);
      pages.push(page);
      y = size[1] - 54;
      if (pages.length > 1) {
        page.drawText(`${input.reportNumber}  |  ${l.title}`, {
          x: margin,
          y: size[1] - 29,
          size: 8,
          font: bold,
          color: green,
        });
        page.drawLine({
          start: { x: margin, y: size[1] - 37 },
          end: { x: size[0] - margin, y: size[1] - 37 },
          thickness: 0.6,
          color: rgb(0.72, 0.78, 0.76),
        });
      }
    };
    const ensure = (height: number) => {
      if (y - height < 62) addPage();
    };
    const draw = (
      raw: string,
      options: {
        bold?: boolean;
        fontSize?: number;
        color?: ReturnType<typeof rgb>;
        gap?: number;
        leading?: number;
      } = {},
    ) => {
      const font = options.bold ? bold : regular;
      const fontSize = options.fontSize ?? 9.5;
      const leading = options.leading ?? fontSize + 5;
      const lines = this.wrap(clean(raw) || ' ', font, fontSize, contentWidth);
      const blockHeight = lines.length * leading + (options.gap ?? 2);
      const maximumPageBlockHeight = size[1] - 116;
      // Keep short blocks together, but stream blocks that cannot fit on one
      // page. Moving an oversized block wholesale would leave a mostly blank
      // preceding page.
      ensure(
        blockHeight <= maximumPageBlockHeight
          ? blockHeight
          : leading + (options.gap ?? 2),
      );
      for (const line of lines) {
        if (y < 62) addPage();
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: options.color ?? ink,
        });
        y -= leading;
      }
      y -= options.gap ?? 2;
    };
    const heading = (raw: string) => {
      ensure(42);
      draw(raw, { bold: true, fontSize: 12, color: green, gap: 5 });
    };

    addPage();
    draw(l.title, { bold: true, fontSize: 18, color: green, gap: 8 });
    draw(
      `${l.report}: ${input.reportNumber}  |  ${l.version}: ${input.versionNumber}`,
      { bold: true },
    );
    draw(`${l.building}: ${clean(input.buildingName)}`);
    draw(clean(input.title), { fontSize: 13, bold: true, gap: 10 });

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
      heading(
        clean(
          input.locale === 'en-CA'
            ? section.titleEn || section.title
            : section.title,
        ),
      );
      for (const field of visible) {
        const value = input.content[field.key];
        const fieldLabel = clean(
          input.locale === 'en-CA' ? field.labelEn || field.label : field.label,
        );
        if (Array.isArray(value)) {
          draw(fieldLabel, { bold: true, gap: 1 });
          value.forEach((item, index) =>
            draw(`${index + 1}. ${this.format(item, field, input)}`),
          );
        } else {
          draw(`${fieldLabel}: ${this.format(value, field, input)}`);
        }
      }
      y -= 5;
    }

    if (input.approvals.length) {
      heading(l.approvals);
      for (const approval of input.approvals) {
        const reviewed = approval.decision === 'REVIEWED';
        const approved = approval.decision === 'APPROVED';
        if (!reviewed && !approved) continue;
        const actorLabel = approval.actorDisplayName
          ? `${approval.actorDisplayName} (${l.actorResolved})`
          : l.unknownActor;
        draw(`${reviewed ? l.reviewedBy : l.approvedBy}: ${actorLabel}`, {
          bold: true,
          gap: 1,
        });
        draw(
          `${reviewed ? l.reviewedAt : l.approvedAt}: ${this.formatDate(approval.decidedAt, input.locale, input.timeZone)}`,
          { gap: 1 },
        );
        draw(
          `${l.actorStable}: ${approval.actorType}/${approval.actorId}  |  ${approval.actorRoleSnapshot}`,
          { fontSize: 8, color: muted, gap: 4 },
        );
      }
    }

    heading(l.traceability);
    draw(`${l.integrity}: SHA-256 ${input.contentHash}`, {
      bold: true,
      gap: 1,
    });
    draw(l.hashNotice, { fontSize: 8, color: muted, gap: 2 });
    draw(
      `Report ID: ${input.reportId}  |  Version ID: ${input.reportVersionId}`,
      {
        fontSize: 8,
        color: muted,
        gap: 1,
      },
    );
    draw(
      `${l.generated}: ${this.formatDate(input.generatedAt, input.locale, input.timeZone)}  |  ${l.renderer}: ${INCIDENT_REPORT_RENDERER_VERSION}`,
      { fontSize: 8, color: muted },
    );

    pages.forEach((item, index) =>
      item.drawText(`${index + 1} / ${pages.length}`, {
        x: size[0] - 76,
        y: 28,
        size: 8,
        font: regular,
        color: muted,
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
    const lines: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
          line = next;
          continue;
        }
        if (line) lines.push(line);
        line = '';
        for (const character of Array.from(word)) {
          if (line && font.widthOfTextAtSize(line + character, size) > width) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
      }
      lines.push(line || ' ');
    }
    return lines;
  }

  private format(
    value: unknown,
    field: FormFieldDefinition,
    input: Pick<IncidentReportPdfInput, 'locale' | 'timeZone'>,
  ): string {
    if (field.type === 'DATETIME' && typeof value === 'string') {
      const instant = new Date(value);
      if (!Number.isNaN(instant.getTime()))
        return this.formatDate(instant, input.locale, input.timeZone);
    }
    if (value && typeof value === 'object')
      return Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => `${key}: ${clean(item)}`)
        .join(' | ');
    return clean(value);
  }

  private formatDate(date: Date, locale: Locale, timeZone: string): string {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? '';
    if (locale === 'fr-CA')
      return `${part('day')} ${part('month')} ${part('year')} à ${part('hour')} h ${part('minute')} (${timeZone})`;
    return `${part('month')} ${part('day')}, ${part('year')} at ${part('hour')}:${part('minute')} (${timeZone})`;
  }
}
