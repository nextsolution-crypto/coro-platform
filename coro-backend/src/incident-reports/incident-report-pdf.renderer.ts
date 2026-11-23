import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import {
  FormFieldDefinition,
  IncidentReportFormSchema,
} from './incident-report-form-engine';

export const INCIDENT_REPORT_RENDERER_VERSION =
  'coro-incident-report-pdf/1.2.0';

/**
 * Page de certification bilingue (M8-04) : toujours en français ET en
 * anglais, quelle que soit la langue du rapport, pour qu'un tiers (assureur,
 * inspecteur, tribunal) comprenne ce que le sceau CORO garantit.
 */
const certification = {
  title: 'CERTIFICATION DU DOCUMENT / DOCUMENT CERTIFICATION',
  identity: 'Identification / Identification',
  report: 'Rapport / Report',
  version: 'Version approuvée / Approved version',
  building: 'Bâtiment / Building',
  approvedBy: 'Approuvé par / Approved by',
  approvedAt: "Date d'approbation / Approval date",
  generated: "Date de l'export / Export date",
  contentHash: 'Empreinte du contenu (SHA-256) / Content digest (SHA-256)',
  guaranteesFr: 'Ce que garantit ce document',
  guaranteesEn: 'What this document guarantees',
  frozenFr:
    "Le contenu de ce rapport correspond à la version approuvée, figée dans CORO au moment de l'approbation; il ne peut plus être modifié. L'empreinte SHA-256 ci-dessus identifie ce contenu de façon unique.",
  frozenEn:
    'The content of this report matches the approved version, frozen in CORO at the time of approval; it can no longer be changed. The SHA-256 digest above uniquely identifies this content.',
  signedFr:
    "Ce fichier PDF porte le sceau numérique CORO : il est signé par la clé de la plateforme CORO au moment de l'export. Toute modification du fichier après sa génération rend la signature invalide. Un jeton d'horodatage RFC 3161, émis par une autorité d'horodatage indépendante, est conservé par CORO avec l'export.",
  signedEn:
    'This PDF file carries the CORO digital seal: it is signed with the CORO platform key at export time. Any change to the file after it was generated invalidates the signature. An RFC 3161 time-stamp token, issued by an independent time-stamping authority, is kept by CORO with the export.',
  verifyFr:
    "Pour vérifier : ouvrez le fichier dans un lecteur PDF (par exemple Adobe Acrobat Reader) et consultez le panneau Signatures. Le certificat est émis par CORO et non par une autorité publique : votre lecteur peut indiquer que l'identité du signataire est inconnue, mais il confirme si le document a été modifié depuis sa signature.",
  verifyEn:
    'To verify: open the file in a PDF reader (for example Adobe Acrobat Reader) and check the Signatures panel. The certificate is issued by CORO, not by a public authority: your reader may report the signer identity as unknown, but it confirms whether the document has been changed since it was signed.',
  unsignedFr:
    "Cet export ne porte pas de signature numérique de la plateforme. Son authenticité peut être confirmée auprès de CORO à l'aide du numéro de rapport, de la version et de l'empreinte ci-dessus.",
  unsignedEn:
    'This export does not carry a platform digital signature. Its authenticity can be confirmed with CORO using the report number, version and digest above.',
  scopeFr:
    "Le sceau CORO atteste l'intégrité et l'origine du document; il ne constitue pas une certification de conformité réglementaire.",
  scopeEn:
    'The CORO seal attests to the integrity and origin of the document; it is not a certification of regulatory compliance.',
};
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
  /** La plateforme signera ce PDF (sceau CORO) après le rendu. */
  signatureExpected?: boolean;
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

    // ── Page de certification bilingue ──
    addPage();
    draw(certification.title, { bold: true, fontSize: 14, color: green, gap: 10 });
    heading(certification.identity);
    draw(`${certification.report}: ${input.reportNumber}`, { bold: true, gap: 1 });
    draw(`${certification.version}: ${input.versionNumber}`, { gap: 1 });
    draw(`${certification.building}: ${clean(input.buildingName)}`, { gap: 1 });
    const approval = [...input.approvals]
      .reverse()
      .find((item) => item.decision === 'APPROVED');
    if (approval) {
      draw(
        `${certification.approvedBy}: ${approval.actorDisplayName ?? `${approval.actorType}/${approval.actorId}`}`,
        { gap: 1 },
      );
      draw(
        `${certification.approvedAt}: ${this.formatDate(approval.decidedAt, 'fr-CA', input.timeZone)}`,
        { gap: 1 },
      );
    }
    draw(
      `${certification.generated}: ${this.formatDate(input.generatedAt, 'fr-CA', input.timeZone)}`,
      { gap: 4 },
    );
    draw(certification.contentHash, { bold: true, fontSize: 8.5, gap: 1 });
    draw(input.contentHash, { fontSize: 8.5, gap: 8 });
    const block = (title: string, paragraphs: string[]) => {
      heading(title);
      for (const paragraph of paragraphs) draw(paragraph, { fontSize: 9, gap: 5 });
    };
    block(
      certification.guaranteesFr,
      input.signatureExpected
        ? [certification.frozenFr, certification.signedFr, certification.verifyFr, certification.scopeFr]
        : [certification.frozenFr, certification.unsignedFr, certification.scopeFr],
    );
    block(
      certification.guaranteesEn,
      input.signatureExpected
        ? [certification.frozenEn, certification.signedEn, certification.verifyEn, certification.scopeEn]
        : [certification.frozenEn, certification.unsignedEn, certification.scopeEn],
    );
    draw(
      `Report ID: ${input.reportId}  |  Version ID: ${input.reportVersionId}  |  ${INCIDENT_REPORT_RENDERER_VERSION}`,
      { fontSize: 7.5, color: muted },
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
