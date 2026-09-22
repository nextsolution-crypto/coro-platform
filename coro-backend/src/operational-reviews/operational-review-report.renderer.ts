import { readFile } from 'fs/promises';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';

export const OPERATIONAL_REVIEW_REPORT_GENERATOR_VERSION = 'coro-rex-pdf/1.1.0';

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
  PROPOSED: 'Proposée', DEFERRED: 'Reportée', CLIENT_USER: 'Utilisateur client', USER: 'Utilisateur CORO', SYSTEM: 'Système CORO',
};
const human = (value: string | null) => value ? labels[value] ?? 'Non renseigné' : 'Non renseigné';
const clean = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const date = (value: string | null) => {
  if (!value) return 'Non renseigné';
  const parts = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')} à ${part('hour').padStart(2, '0')} h ${part('minute')} UTC`;
};

export function buildOperationalReviewReportText(data: OperationalReviewReportData): string[] {
  const lines = [
    'RAPPORT DE RETOUR D’EXPÉRIENCE', data.reference, `Version REX ${data.reviewVersion} · Version rapport ${data.reportVersion ?? 1}`,
    'FINALISÉ', `Confidentialité : ${human(data.confidentiality)}`,
    `Source : ${human(data.sourceType)}`, `Finalisé le : ${date(data.finalizedAt)}`,
    '[[PAGE_BREAK]]', '1. IDENTIFICATION', `Référence : ${data.reference}`, `Version REX : ${data.reviewVersion}`,
    `Statut : Finalisé`, `Confidentialité : ${human(data.confidentiality)}`,
    `Organisation : ${data.organizationNameAtGeneration ?? 'Non renseigné'}`,
    `Bâtiment : ${data.buildingNameAtGeneration ?? 'Non renseigné'}`,
    'Les noms de l’organisation et du bâtiment correspondent aux valeurs enregistrées lors de la génération du rapport.',
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
    'Le présent rapport restitue le retour d’expérience tel qu’il a été finalisé. Aucune donnée ultérieure n’y est incorporée.',
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
    let page!: PDFPage;
    let y = 0;
    const addPage = () => {
      page = pdf.addPage([595.28, 841.89]); pages.push(page); y = 784;
      if (pages.length > 1) {
        page.drawText('CORO  |  RAPPORT DE RETOUR D’EXPÉRIENCE', { x: 48, y: 813, size: 8, font: bold, color: rgb(.08, .38, .31) });
        page.drawLine({ start: { x: 48, y: 801 }, end: { x: 547, y: 801 }, thickness: .6, color: rgb(.72, .78, .76) });
      }
    };
    const ensure = (height: number) => { if (y - height < 64) addPage(); };
    const ink = rgb(.14, .2, .2);
    const green = rgb(.08, .34, .29);
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
    const drawWrapped = (text: string, size = 10, font: PDFFont = regular, leading = 17.5, color = ink) => {
      for (const item of wrap(text, size, font)) {
        ensure(leading);
        page.drawText(item || ' ', { x: 48, y, size, font, color });
        y -= leading;
      }
    };
    addPage();
    page.drawText('CORO', { x: 48, y, size: 31, font: bold, color: green }); y -= 48;
    page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1.2, color: green }); y -= 36;
    drawWrapped('RAPPORT DE RETOUR D’EXPÉRIENCE', 19, bold, 28, green); y -= 12;
    drawWrapped(data.reference, 15, bold, 23); y -= 9;
    drawWrapped(`Version du REX : ${data.reviewVersion}`, 10, regular, 19);
    drawWrapped(`Version du rapport : ${data.reportVersion ?? 1}`, 10, regular, 19);
    drawWrapped('Statut : Finalisé', 10, bold, 19, green);
    if ((data.reportVersion ?? 1) > 1) drawWrapped('Version documentaire corrigée à la suite d’une correction technique.', 9, regular, 17, green);
    y -= 31;
    page.drawLine({ start: { x: 48, y: y + 12 }, end: { x: 547, y: y + 12 }, thickness: .6, color: rgb(.72, .78, .76) });
    drawWrapped('IDENTIFICATION DU RAPPORT', 9, bold, 22, green); y -= 6;
    if (data.organizationNameAtGeneration) drawWrapped(`Organisation : ${clean(data.organizationNameAtGeneration)}`);
    if (data.buildingNameAtGeneration) drawWrapped(`Bâtiment : ${clean(data.buildingNameAtGeneration)}`);
    drawWrapped(`Source : ${human(data.sourceType)}`);
    drawWrapped(`Finalisé le : ${date(data.finalizedAt)}`);
    drawWrapped(`Confidentialité : ${human(data.confidentiality)}`);
    y -= 20;
    drawWrapped('Les noms de l’organisation et du bâtiment reflètent les valeurs enregistrées lors de la génération du rapport.', 8, regular, 14, rgb(.35, .41, .4));

    addPage();
    const lines = buildOperationalReviewReportText(data);
    const body = lines.slice(lines.indexOf('[[PAGE_BREAK]]') + 1);
    for (const [index, raw] of body.entries()) {
      if (raw === '') { y -= 11; continue; }
      const section = /^\d+\. /.test(raw);
      const finding = /^Constat \d+/.test(raw);
      const recommendation = /^Recommandation \d+/.test(raw);
      const heading = section || finding || recommendation;
      const size = section ? 13 : heading ? 11.5 : 10;
      const font = heading ? bold : regular;
      const leading = heading ? 19 : 17.5;
      if (heading) {
        const following = body.slice(index + 1).filter(Boolean).slice(0, section ? 1 : finding ? 3 : 1);
        const nextHeight = following.reduce((height, line) => height + Math.min(2, wrap(line, 10, regular).length) * 17.5, 0);
        ensure(Math.min(110, wrap(raw, size, font).length * leading + nextHeight + 13));
        y -= section ? 13 : 9;
      } else if (/^(Catégorie|Importance|Gravité|Statut|Priorité|Décision|Impact|Décidée le|Aucune recommandation)/.test(raw)) {
        ensure(wrap(raw, size, font).length * leading + 5);
      }
      drawWrapped(raw, size, font, leading, heading ? green : ink);
      if (section) {
        page.drawLine({ start: { x: 48, y: y + 3 }, end: { x: 547, y: y + 3 }, thickness: .45, color: rgb(.77, .82, .8) });
        y -= 8;
      } else if (heading) y -= 5;
    }
    pages.forEach((item, index) => {
      if (index === 0) return;
      item.drawLine({ start: { x: 48, y: 43 }, end: { x: 547, y: 43 }, thickness: .5, color: rgb(.72, .78, .76) });
      item.drawText(`${data.reference} · REX ${data.reviewVersion} · Rapport ${data.reportVersion ?? 1} · ${human(data.confidentiality)}`, { x: 48, y: 26, size: 7.5, font: regular });
      const pageLabel = `Page ${index + 1} / ${pages.length}`;
      item.drawText(pageLabel, { x: 547 - regular.widthOfTextAtSize(pageLabel, 7.5), y: 26, size: 7.5, font: regular });
    });
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }
}
