import { readFile } from 'fs/promises';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';

export const OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION = 'coro-rex-pdf/1.0.1';

type Recommendation = {
  title: string | null; description: string; rationale: string | null; priority: string | null;
  status: string; decisionComment: string | null; decidedAt: string | null;
};
type Finding = {
  category: string; title: string; description: string; severity: string; impact: string | null;
  status: string; recommendations: Recommendation[];
};
export type OperationalReviewReportData = {
  reference: string; reviewVersion: number; reportVersion?: number; title: string; summary: string | null;
  confidentiality: string; sourceType: 'POPULATION' | 'INCIDENT' | 'EXERCISE';
  evidenceReference: string | null; evidenceVersion: number | null;
  organizationNameAtGeneration: string | null; buildingNameAtGeneration: string | null;
  createdAt: string; submittedAt: string | null; finalizedAt: string;
  createdByType: string; submittedByType: string | null; finalizedByType: string;
  generatedAt: string; generatedByType: string; findings: Finding[];
};

const labels: Record<string, string> = {
  RESTRICTED: 'Restreint', BUILDING_TEAM: 'Équipe du bâtiment', ORGANIZATION: 'Organisation', ADVISOR: 'Conseiller',
  POPULATION: 'Sentinelle Population', INCIDENT: 'Incident', EXERCISE: 'Exercice',
  STRENGTH: 'Point fort', GAP: 'Lacune', OBSERVATION: 'Observation', NON_COMPLIANCE: 'Non-conformité',
  RISK: 'Risque', IMPROVEMENT_OPPORTUNITY: "Occasion d'amélioration",
  CRITICAL: 'Critique', HIGH: 'Élevée', MEDIUM: 'Modérée', LOW: 'Faible', INFORMATIONAL: 'Information',
  OPEN: 'Ouvert', ACCEPTED: 'Acceptée', REJECTED: 'Rejetée', MONITORED: 'Sous surveillance', CLOSED: 'Fermé',
  PROPOSED: 'Proposée', DEFERRED: 'Reportée', CLIENT_USER: 'Utilisateur client', USER: 'Conseiller CORO', SYSTEM: 'Système CORO',
};
const human = (value: string | null) => value ? labels[value] ?? 'Non renseigné' : 'Non renseigné';
const clean = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const date = (value: string | null) => value ? new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value)).replace(/ (\d{1,2}) h (\d{2})$/, ' à $1 h $2') + ' UTC' : 'Non renseigné';

export function buildOperationalReviewReportText(data: OperationalReviewReportData): string[] {
  const lines = [
    'RAPPORT DE RETOUR D’EXPÉRIENCE', data.reference, `Version REX ${data.reviewVersion} · Version rapport ${data.reportVersion ?? 1}`,
    'FINALISÉ', `Confidentialité : ${human(data.confidentiality)}`,
    `Source : ${human(data.sourceType)}`, `Finalisé le : ${date(data.finalizedAt)}`,
    '[[PAGE_BREAK]]', '1. IDENTIFICATION', `Référence : ${data.reference}`, `Version REX : ${data.reviewVersion}`,
    `Statut : Finalisé`, `Confidentialité : ${human(data.confidentiality)}`,
    `Organisation (nom relevé à la génération) : ${data.organizationNameAtGeneration ?? 'Non renseigné'}`,
    `Bâtiment (nom relevé à la génération) : ${data.buildingNameAtGeneration ?? 'Non renseigné'}`,
    `Créé le : ${date(data.createdAt)} · ${human(data.createdByType)}`,
    `Soumis le : ${date(data.submittedAt)} · ${human(data.submittedByType)}`,
    `Finalisé le : ${date(data.finalizedAt)} · ${human(data.finalizedByType)}`,
    '', '2. CONTEXTE', `Source du retour d’expérience : ${human(data.sourceType)}`,
  ];
  if (data.evidenceReference) lines.push(`Dossier de preuve associé : ${data.evidenceReference} · Version ${data.evidenceVersion}`);
  lines.push('', '3. SYNTHÈSE EXÉCUTIVE', data.title, data.summary?.trim() || 'Non renseignée', '', '4. CONSTATS ET RECOMMANDATIONS');
  if (data.findings.length === 0) lines.push('Aucun constat enregistré.');
  for (const [index, finding] of data.findings.entries()) {
    const number = String(index + 1).padStart(2, '0');
    lines.push(`Constat ${number} — ${finding.title}`, `Catégorie : ${human(finding.category)}`,
      `${finding.category === 'STRENGTH' ? 'Importance' : 'Gravité'} : ${human(finding.severity)}`,
      `Statut : ${human(finding.status)}`, finding.description);
    if (finding.impact) lines.push(`Impact : ${finding.impact}`);
    if (!finding.recommendations.length) lines.push('Aucune recommandation associée.');
    for (const [recommendationIndex, recommendation] of finding.recommendations.entries()) {
      const label = `Recommandation ${number}.${recommendationIndex + 1}`;
      lines.push(`${label} — ${recommendation.title?.trim() || label}`, recommendation.description,
        `Priorité : ${human(recommendation.priority)}`, `Décision : ${human(recommendation.status)}`);
      if (recommendation.rationale) lines.push(`Justification : ${recommendation.rationale}`);
      if (recommendation.decisionComment) lines.push(`Commentaire de décision : ${recommendation.decisionComment}`);
      if (recommendation.decidedAt) lines.push(`Décidée le : ${date(recommendation.decidedAt)}`);
    }
    lines.push('');
  }
  lines.push('5. ACTIONS CORRECTIVES',
    'Les actions correctives issues des recommandations acceptées sont suivies séparément dans CORO et poursuivent leur cycle indépendamment du présent rapport finalisé.',
    '', '6. NOTE DOCUMENTAIRE',
    'Le présent rapport reflète le retour d’expérience tel qu’il a été finalisé. Le suivi des actions correctives est réalisé séparément dans CORO.',
    '', '7. TRAÇABILITÉ', `Référence : ${data.reference} · Version REX ${data.reviewVersion}`,
    `Source : ${human(data.sourceType)}`, `REX finalisé le : ${date(data.finalizedAt)}`,
    `Rapport généré le : ${date(data.generatedAt)} · ${human(data.generatedByType)}`,
    `Générateur : ${OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION}`,
    'L’empreinte SHA-256 des octets du PDF est conservée séparément dans CORO. Ce document ne constitue pas une signature numérique indépendante.');
  return lines.map(clean);
}

export class OperationalReviewReportRenderer {
  async render(data: OperationalReviewReportData): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const generatedAt = new Date(data.generatedAt);
    pdf.setTitle(`${data.reference} — Rapport de retour d’expérience`);
    pdf.setAuthor('CORO'); pdf.setSubject('Retour d’expérience finalisé');
    pdf.setCreator(OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION); pdf.setProducer('CORO / pdf-lib');
    pdf.setCreationDate(generatedAt); pdf.setModificationDate(generatedAt);
    const fontDirectory = join(process.cwd(), 'assets', 'fonts');
    const [regularBytes, boldBytes] = await Promise.all([
      readFile(join(fontDirectory, 'NotoSans-Regular.ttf')),
      readFile(join(fontDirectory, 'NotoSans-Bold.ttf')),
    ]);
    const regular = await pdf.embedFont(regularBytes, { subset: false });
    const bold = await pdf.embedFont(boldBytes, { subset: false });
    const pages: PDFPage[] = [];
    let page: PDFPage;
    let y = 0;
    const addPage = () => {
      page = pdf.addPage([595.28, 841.89]); pages.push(page); y = 784;
      if (pages.length > 1) page.drawText('CORO  |  RAPPORT DE RETOUR D’EXPÉRIENCE', { x: 48, y: 813, size: 8, font: bold, color: rgb(.08, .38, .31) });
    };
    const ensure = (height: number) => { if (y - height < 64) addPage(); };
    const drawLine = (text: string, size: number, font: PDFFont, color = rgb(.14, .2, .2)) => {
      ensure(size + 8);
      page.drawText(text || ' ', { x: 48, y, size, font, color }); y -= size + 6;
    };
    const wrap = (text: string, size: number, font: PDFFont) => {
      const output: string[] = [];
      for (const paragraph of text.split(/\r?\n/)) {
        let line = '';
        for (const word of paragraph.split(/\s+/)) {
          const next = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(next, size) <= 499) { line = next; continue; }
          if (line) output.push(line);
          line = '';
          for (const char of Array.from(word)) {
            if (font.widthOfTextAtSize(line + char, size) > 499 && line) { output.push(line); line = ''; }
            line += char;
          }
        }
        output.push(line || ' ');
      }
      return output;
    };
    addPage();
    const lines = buildOperationalReviewReportText(data);
    drawLine('CORO', 31, bold, rgb(.08, .38, .31)); y -= 100;
    for (const raw of lines) {
      if (raw === '[[PAGE_BREAK]]') { addPage(); continue; }
      if (raw === '') { y -= 9; continue; }
      const heading = /^\d+\. |^Constat \d+|^Recommandation \d+/.test(raw);
      const size = heading ? 12 : 9.5;
      const font = heading ? bold : regular;
      const wrapped = wrap(raw, size, font);
      if (heading) ensure(Math.min(58, (wrapped.length + 2) * (size + 6)));
      for (const item of wrapped) drawLine(item, size, font, heading ? rgb(.08, .34, .29) : rgb(.14, .2, .2));
      if (heading) y -= 7;
    }
    pages.forEach((item, index) => {
      if (index === 0) return;
      item.drawLine({ start: { x: 48, y: 43 }, end: { x: 547, y: 43 }, thickness: .5, color: rgb(.72, .78, .76) });
      item.drawText(`${data.reference} · Version ${data.reviewVersion} · ${human(data.confidentiality)}`, { x: 48, y: 26, size: 7, font: regular });
      item.drawText(`Page ${index + 1} / ${pages.length}`, { x: 492, y: 26, size: 7, font: regular });
    });
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }
}
