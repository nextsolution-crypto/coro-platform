import { readFile } from 'fs/promises';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';

export const CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION = 'coro-corrective-actions-pdf/1.0.0';

export type TrackingAction = {
  reference: string | null; title: string; description: string | null; priority: string; status: string;
  source: { findingDisplayOrder: number | null; findingTitle: string | null; recommendationDisplayOrder: number | null; recommendationTitle: string | null; recommendationDecision: string | null };
  assigneeType: string | null; assigneeDisplayName: string | null; dueDate: string | null;
  createdAt: string; completedAt: string | null; verifiedAt: string | null; closedAt: string | null;
  completionComment: string | null; closureComment: string | null; withdrawnEvidenceCount: number;
  evidence: { type: string; title: string; submittedAt: string; fileSize: number | null; sha256: string | null }[];
  verifications: { attemptNumber: number; verdict: string; comment: string | null; verifiedAt: string; actorType: string }[];
};

export type TrackingRenderData = {
  schemaVersion: number; snapshotAt: string;
  review: { reference: string; version: number; title: string; confidentiality: string; finalizedAt: string | null; sourceType: string; organizationNameAtSnapshot?: string | null; buildingNameAtSnapshot?: string | null };
  actions: TrackingAction[];
};

export type TrackingPdfMetadata = { reportVersion: number; generatedAt: string; generatorVersion: string; generatedByType: string };

const statusLabels: Record<string, string> = {
  PLANNED: 'Planifiée', IN_PROGRESS: 'En cours', COMPLETED: 'Réalisation déclarée',
  VERIFIED: 'Vérifiée', CLOSED: 'Fermée', CANCELLED: 'Annulée',
};
const priorityLabels: Record<string, string> = { CRITICAL: 'Critique', WARNING: 'À surveiller', INFO: 'Information' };
const verdictLabels: Record<string, string> = { REJECTED: 'Rejetée', ACCEPTED: 'Acceptée' };
const evidenceLabels: Record<string, string> = { NOTE: 'Note', LINK: 'Lien', DOCUMENT: 'Document', PHOTO: 'Photo', SYSTEM_REFERENCE: 'Référence CORO' };
const confidentialityLabels: Record<string, string> = { RESTRICTED: 'Restreint', BUILDING_TEAM: 'Équipe du bâtiment', ORGANIZATION: 'Organisation', ADVISOR: 'Conseiller' };
const actorLabels: Record<string, string> = { CLIENT_USER: 'Utilisateur client', USER: 'Utilisateur CORO', SYSTEM: 'Système CORO' };
const clean = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const label = (mapping: Record<string, string>, value: string | null) => value ? mapping[value] ?? 'Non renseigné' : 'Non renseigné';
const date = (value: string | null) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Non renseigné';
  const parts = new Intl.DateTimeFormat('fr-CA', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')} à ${part('hour')} h ${part('minute')} UTC`;
};

export function trackingKpis(data: TrackingRenderData) {
  const counts = { total: data.actions.length, planned: 0, inProgress: 0, completed: 0, verified: 0, closed: 0, cancelled: 0 };
  for (const action of data.actions) {
    if (!statusLabels[action.status] || !priorityLabels[action.priority]) throw new Error('TRACKING_SNAPSHOT_UNSUPPORTED');
    if (action.status === 'PLANNED') counts.planned++;
    else if (action.status === 'IN_PROGRESS') counts.inProgress++;
    else if (action.status === 'COMPLETED') counts.completed++;
    else if (action.status === 'VERIFIED') counts.verified++;
    else if (action.status === 'CLOSED') counts.closed++;
    else if (action.status === 'CANCELLED') counts.cancelled++;
  }
  const applicable = counts.total - counts.cancelled;
  return { ...counts, applicable, closureRate: applicable ? Math.round(counts.closed / applicable * 100) : null };
}

type Line = { text: string; kind?: 'section' | 'action' | 'sub' | 'gap' };
const line = (text: string, kind?: Line['kind']): Line => ({ text: clean(text), kind });

export function buildTrackingReportLines(data: TrackingRenderData, meta: TrackingPdfMetadata): Line[] {
  const kpi = trackingKpis(data);
  const actions = [...data.actions].sort((a, b) =>
    (a.source.findingDisplayOrder ?? Number.MAX_SAFE_INTEGER) - (b.source.findingDisplayOrder ?? Number.MAX_SAFE_INTEGER) ||
    (a.source.recommendationDisplayOrder ?? Number.MAX_SAFE_INTEGER) - (b.source.recommendationDisplayOrder ?? Number.MAX_SAFE_INTEGER) ||
    (a.reference ?? '').localeCompare(b.reference ?? '', 'fr'));
  const lines: Line[] = [
    line('1. IDENTIFICATION ET SITUATION', 'section'),
    line(`REX source : ${data.review.reference} — ${data.review.title}`),
    line(`Version REX : ${data.review.version}  ·  État de suivi R${meta.reportVersion}`),
    line(`Situation au : ${date(data.snapshotAt)}`),
    line(`Organisation : ${data.review.organizationNameAtSnapshot ?? 'Non renseignée dans le snapshot'}`),
    line(`Bâtiment : ${data.review.buildingNameAtSnapshot ?? 'Non renseigné dans le snapshot'}`),
    line(`Confidentialité : ${label(confidentialityLabels, data.review.confidentiality)}`),
    line("Ce rapport reflète l'état des actions à la date de situation indiquée. Leur état peut avoir évolué depuis."),
    line('', 'gap'), line('2. SYNTHÈSE', 'section'),
    line(`Actions : ${kpi.total}  ·  Planifiées : ${kpi.planned}  ·  En cours : ${kpi.inProgress}`),
    line(`Réalisation déclarée : ${kpi.completed}  ·  Vérifiées : ${kpi.verified}  ·  Fermées : ${kpi.closed}  ·  Annulées : ${kpi.cancelled}`),
    line(kpi.closureRate === null ? 'Taux de fermeture : non applicable (aucune action applicable).' :
      `Taux de fermeture : ${kpi.closed} action${kpi.closed > 1 ? 's' : ''} fermée${kpi.closed > 1 ? 's' : ''} sur ${kpi.applicable} action${kpi.applicable > 1 ? 's' : ''} applicable${kpi.applicable > 1 ? 's' : ''} (${kpi.closureRate} %).`),
  ];
  if (!actions.length) lines.push(line('Aucune action corrective liée à ce REX à la date de situation.'));
  lines.push(line('', 'gap'), line('3. ÉTAT DES ACTIONS', 'section'));
  if (!actions.length) lines.push(line('Aucune action à présenter.'));
  for (const action of actions) {
    lines.push(line(`${action.reference ?? 'Référence non renseignée'} — ${action.title}`, 'action'),
      line(`${label(statusLabels, action.status)}  ·  Priorité : ${label(priorityLabels, action.priority)}`),
      line(`Responsable au moment de la situation : ${action.assigneeDisplayName ?? 'Non renseigné'}`),
      line(`Échéance : ${date(action.dueDate)}`));
  }
  lines.push(line('', 'gap'), line('4. DÉTAIL DES ACTIONS', 'section'));
  if (!actions.length) lines.push(line('Aucun détail à présenter.'));
  for (const action of actions) {
    lines.push(line(`${action.reference ?? 'Référence non renseignée'} — ${action.title}`, 'action'));
    if (action.source.findingDisplayOrder !== null) lines.push(line(`Constat ${String(action.source.findingDisplayOrder).padStart(2, '0')} : ${action.source.findingTitle ?? 'Non renseigné'}`));
    if (action.source.recommendationDisplayOrder !== null) lines.push(line(`Recommandation ${action.source.findingDisplayOrder ?? '?'}.${action.source.recommendationDisplayOrder} : ${action.source.recommendationTitle ?? 'Non renseignée'}`));
    lines.push(line(`Statut : ${label(statusLabels, action.status)}  ·  Priorité : ${label(priorityLabels, action.priority)}`),
      line(`Responsable : ${action.assigneeDisplayName ?? 'Non renseigné'}`), line(`Échéance : ${date(action.dueDate)}`),
      line(`Créée le : ${date(action.createdAt)}`));
    if (action.description) lines.push(line(`Description : ${action.description}`));
    if (action.completedAt) lines.push(line(`Réalisation déclarée le : ${date(action.completedAt)}`));
    if (action.verifiedAt) lines.push(line(`Vérifiée le : ${date(action.verifiedAt)}`));
    if (action.closedAt) lines.push(line(`Fermée le : ${date(action.closedAt)}`));
    if (action.completionComment) lines.push(line(`Commentaire de réalisation : ${action.completionComment}`));
    if (action.closureComment) lines.push(line(`Commentaire de fermeture : ${action.closureComment}`));
    lines.push(line('Preuves', 'sub'));
    if (!action.evidence.length) lines.push(line('Aucune preuve active inventoriée.'));
    for (const [index, evidence] of action.evidence.entries()) {
      lines.push(line(`${index + 1}. ${evidenceLabels[evidence.type] ?? 'Preuve'} — ${evidence.title}  ·  ${date(evidence.submittedAt)}`));
      if ((evidence.type === 'DOCUMENT' || evidence.type === 'PHOTO') && evidence.fileSize) lines.push(line(`Taille : ${Math.ceil(evidence.fileSize / 1024)} Ko`));
      if ((evidence.type === 'DOCUMENT' || evidence.type === 'PHOTO') && evidence.sha256) lines.push(line(`SHA-256 de la preuve : ${evidence.sha256}`));
    }
    if (action.withdrawnEvidenceCount) lines.push(line(`${action.withdrawnEvidenceCount} preuve${action.withdrawnEvidenceCount > 1 ? 's' : ''} retirée${action.withdrawnEvidenceCount > 1 ? 's' : ''} de l'inventaire actif.`));
    lines.push(line('Historique des vérifications', 'sub'));
    if (!action.verifications.length) lines.push(line('Aucune tentative de vérification.'));
    for (const verification of [...action.verifications].sort((a, b) => a.attemptNumber - b.attemptNumber)) {
      if (!verdictLabels[verification.verdict]) throw new Error('TRACKING_SNAPSHOT_UNSUPPORTED');
      lines.push(line(`Tentative ${verification.attemptNumber} — ${label(verdictLabels, verification.verdict)}  ·  ${date(verification.verifiedAt)}  ·  ${label(actorLabels, verification.actorType)}`));
      if (verification.comment) lines.push(line(`Commentaire : ${verification.comment}`));
    }
    lines.push(line('', 'gap'));
  }
  lines.push(line('5. TRAÇABILITÉ', 'section'), line(`REX : ${data.review.reference}  ·  Version REX ${data.review.version}  ·  État de suivi R${meta.reportVersion}`),
    line(`Situation au : ${date(data.snapshotAt)}`), line(`Rapport généré le : ${date(meta.generatedAt)}  ·  ${label(actorLabels, meta.generatedByType)}`),
    line(`Générateur : ${meta.generatorVersion}`), line(`Confidentialité : ${label(confidentialityLabels, data.review.confidentiality)}`),
    line("L'empreinte SHA-256 des octets du PDF est conservée séparément dans CORO. Ce document ne constitue pas une signature numérique indépendante."));
  return lines;
}

export class CorrectiveActionTrackingReportRenderer {
  async render(data: TrackingRenderData, meta: TrackingPdfMetadata): Promise<Buffer> {
    if (data.schemaVersion !== 1 || !data.review?.reference || !Array.isArray(data.actions) || !data.snapshotAt) throw new Error('TRACKING_SNAPSHOT_UNSUPPORTED');
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const generatedAt = new Date(meta.generatedAt);
    pdf.setTitle(`Rapport de suivi des actions correctives — ${data.review.reference}`);
    pdf.setAuthor('CORO'); pdf.setSubject(`Situation des actions au ${date(data.snapshotAt)}`);
    pdf.setCreator(meta.generatorVersion); pdf.setProducer('CORO / pdf-lib');
    pdf.setCreationDate(generatedAt); pdf.setModificationDate(generatedAt);
    const fonts = join(process.cwd(), 'assets', 'fonts');
    const [regularBytes, boldBytes] = await Promise.all([readFile(join(fonts, 'NotoSans-Regular.ttf')), readFile(join(fonts, 'NotoSans-Bold.ttf'))]);
    const regular = await pdf.embedFont(regularBytes, { subset: false });
    const bold = await pdf.embedFont(boldBytes, { subset: false });
    const pages: PDFPage[] = [];
    let page!: PDFPage;
    let y = 0;
    const green = rgb(.08, .34, .29);
    const ink = rgb(.14, .2, .2);
    const addPage = () => {
      page = pdf.addPage([595.28, 841.89]); pages.push(page); y = 784;
      if (pages.length > 1) {
        page.drawText('CORO  |  RAPPORT DE SUIVI DES ACTIONS CORRECTIVES', { x: 48, y: 813, size: 8, font: bold, color: green });
        page.drawLine({ start: { x: 48, y: 801 }, end: { x: 547, y: 801 }, thickness: .6, color: rgb(.72, .78, .76) });
      }
    };
    const ensure = (height: number) => { if (y - height < 64) addPage(); };
    const wrap = (value: string, size: number, font: PDFFont) => {
      const output: string[] = [];
      for (const paragraph of clean(value).split(/\r?\n/)) {
        let current = '';
        for (const word of paragraph.split(/\s+/)) {
          const next = current ? `${current} ${word}` : word;
          if (font.widthOfTextAtSize(next, size) <= 499) { current = next; continue; }
          if (current) output.push(current);
          current = '';
          for (const char of Array.from(word)) {
            if (font.widthOfTextAtSize(current + char, size) > 499 && current) { output.push(current); current = ''; }
            current += char;
          }
        }
        output.push(current || ' ');
      }
      return output;
    };
    const draw = (value: string, size = 10, font: PDFFont = regular, leading = 17, color = ink) => {
      for (const segment of wrap(value, size, font)) {
        ensure(leading); page.drawText(segment || ' ', { x: 48, y, size, font, color }); y -= leading;
      }
    };
    addPage();
    draw('CORO', 31, bold, 48, green);
    page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1.2, color: green }); y -= 36;
    draw('RAPPORT DE SUIVI', 20, bold, 29, green);
    draw('DES ACTIONS CORRECTIVES', 20, bold, 30, green); y -= 18;
    draw(data.review.reference, 15, bold, 26);
    draw(`Situation au : ${date(data.snapshotAt)}`, 11, bold, 23);
    draw(`État de suivi R${meta.reportVersion}`, 11, bold, 23, green); y -= 21;
    draw(`Organisation : ${data.review.organizationNameAtSnapshot ?? 'Non renseignée dans le snapshot'}`);
    draw(`Bâtiment : ${data.review.buildingNameAtSnapshot ?? 'Non renseigné dans le snapshot'}`);
    draw(`Confidentialité : ${label(confidentialityLabels, data.review.confidentiality)}`); y -= 24;
    draw('Document généré par CORO', 9, regular, 16);
    addPage();
    const lines = buildTrackingReportLines(data, meta);
    for (const [index, item] of lines.entries()) {
      if (item.kind === 'gap') { y -= 9; continue; }
      const heading = item.kind === 'section' || item.kind === 'action' || item.kind === 'sub';
      const font = heading ? bold : regular;
      const size = item.kind === 'section' ? 13 : item.kind === 'action' ? 11.5 : item.kind === 'sub' ? 10.5 : 10;
      const leading = heading ? 19 : 17;
      if (heading) {
        const following = lines.slice(index + 1).filter((entry) => entry.kind !== 'gap').slice(0, item.kind === 'section' ? 1 : 2);
        const followHeight = following.reduce((sum, entry) => sum + Math.min(2, wrap(entry.text, 10, regular).length) * 17, 0);
        ensure(Math.min(125, wrap(item.text, size, font).length * leading + followHeight + 14));
        y -= item.kind === 'section' ? 14 : 8;
      }
      draw(item.text, size, font, leading, heading ? green : ink);
      if (item.kind === 'section') {
        page.drawLine({ start: { x: 48, y: y + 4 }, end: { x: 547, y: y + 4 }, thickness: .45, color: rgb(.77, .82, .8) });
        y -= 8;
      } else if (heading) y -= 4;
    }
    pages.forEach((item, index) => {
      if (index === 0) return;
      item.drawLine({ start: { x: 48, y: 43 }, end: { x: 547, y: 43 }, thickness: .5, color: rgb(.72, .78, .76) });
      item.drawText(`${data.review.reference} · Suivi actions R${meta.reportVersion} · ${label(confidentialityLabels, data.review.confidentiality)}`, { x: 48, y: 26, size: 7.5, font: regular });
      const pageLabel = `Page ${index + 1} / ${pages.length}`;
      item.drawText(pageLabel, { x: 547 - regular.widthOfTextAtSize(pageLabel, 7.5), y: 26, size: 7.5, font: regular });
    });
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }
}
