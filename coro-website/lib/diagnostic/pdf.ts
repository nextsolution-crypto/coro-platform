import { jsPDF } from 'jspdf';
import type { Locale } from '@/lib/site/locale';
import { diagnosticQuestions } from './config.ts';
import { buildResiliencePortraitGeometry, PORTRAIT_CENTER, PORTRAIT_RADIUS } from './portrait.ts';
import { diagnosticDimensionLabel, diagnosticLevelLabel, type DiagnosticResultModel } from './results.ts';
import type { CompleteDiagnosticResponses } from './types.ts';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const NAVY = '#031b2e';
const BLUE = '#1267a8';
const RED = '#cf372d';
const MUTED = '#526575';
const LIGHT = '#e5edf3';
const SURFACE = '#f5f8fa';

const copy = {
  fr: {
    report: 'Diagnostic Express CORO', organization: 'Portrait organisationnel', date: 'Date', version: 'Version du questionnaire', score: 'Score indicatif', partial: 'Score partiel', level: 'Niveau de préparation', coverage: 'Couverture des réponses', portrait: 'Portrait de résilience', strengths: 'Forces identifiées', improvements: "Priorités d'amélioration", verification: 'Priorités de vérification', reservations: 'Réserves', recommendations: 'Recommandations personnalisées', issue: 'Enjeu opérationnel', practice: 'Bonne pratique', action: 'Action concrète', plan: "Plan d'amélioration", modules: 'Modules CORO pertinents', availability: 'Disponibilité', limits: 'Limites méthodologiques', next: 'Prochaines étapes', noStrength: 'Aucune force ne peut être déduite des réponses.', noImprovement: 'Aucune priorité corrective déclarée.', noVerification: 'Aucune information inconnue à vérifier.', unknown: 'Information inconnue', na: 'Non applicable', alternative: 'La couverture numérique est insuffisante pour former une surface radar interprétable.', methodology: "Ce diagnostic est indicatif, repose uniquement sur les réponses déclarées, n'est pas l'Indice CORO officiel et ne remplace ni un audit ni une validation terrain.", nextText: 'Valider les constats avec les équipes concernées, prioriser les actions et confirmer leur efficacité sur le terrain.', page: 'Page', confidential: 'Résultat généré localement - aucune réponse transmise à CORO.',
  },
  en: {
    report: 'CORO Express Diagnostic', organization: 'Organizational portrait', date: 'Date', version: 'Questionnaire version', score: 'Indicative score', partial: 'Partial score', level: 'Preparation level', coverage: 'Response coverage', portrait: 'Resilience portrait', strengths: 'Identified strengths', improvements: 'Improvement priorities', verification: 'Verification priorities', reservations: 'Reservations', recommendations: 'Personalized recommendations', issue: 'Operational issue', practice: 'Good practice', action: 'Concrete action', plan: 'Improvement plan', modules: 'Relevant CORO modules', availability: 'Availability', limits: 'Methodological limitations', next: 'Next steps', noStrength: 'No strength can be derived from the answers.', noImprovement: 'No declared corrective priority.', noVerification: 'No unknown information requires verification.', unknown: 'Unknown information', na: 'Not applicable', alternative: 'There is insufficient numeric coverage to form an interpretable radar surface.', methodology: 'This diagnostic is indicative, is based only on declared answers, is not the official CORO Index and does not replace an audit or field validation.', nextText: 'Validate the findings with the relevant teams, prioritize actions and confirm their effectiveness in the field.', page: 'Page', confidential: 'Result generated locally - no answer sent to CORO.',
  },
} as const;

export type DiagnosticPdfInput = {
  model: DiagnosticResultModel;
  responses: CompleteDiagnosticResponses;
  locale: Locale;
  generatedAt: Date;
  logoDataUrl?: string;
};

function lines(doc: jsPDF, text: string, width = CONTENT_WIDTH) { return doc.splitTextToSize(text, width) as string[]; }

function textBlock(doc: jsPDF, text: string, x: number, y: number, width: number, options?: { size?: number; color?: string; weight?: 'normal' | 'bold'; lineHeight?: number }) {
  const size = options?.size ?? 10;
  const lineHeight = options?.lineHeight ?? 1.35;
  doc.setFont('helvetica', options?.weight ?? 'normal'); doc.setFontSize(size); doc.setTextColor(options?.color ?? NAVY);
  const wrapped = lines(doc, text, width); doc.text(wrapped, x, y, { lineHeightFactor: lineHeight });
  return y + wrapped.length * size * lineHeight;
}

function pageHeader(doc: jsPDF, title: string, logoDataUrl?: string) {
  doc.setFillColor(255, 255, 255); doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', MARGIN, 34, 84, 31.3, undefined, 'FAST');
  else { doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(NAVY); doc.text('CORO', MARGIN, 57); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(BLUE); doc.text(title.toUpperCase(), PAGE_WIDTH - MARGIN, 53, { align: 'right' });
  doc.setDrawColor(LIGHT); doc.line(MARGIN, 72, PAGE_WIDTH - MARGIN, 72);
}

function pageFooter(doc: jsPDF, locale: Locale) {
  const t = copy[locale]; const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) { doc.setPage(page); doc.setDrawColor(LIGHT); doc.line(MARGIN, 754, PAGE_WIDTH - MARGIN, 754); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED); doc.text(t.confidential, MARGIN, 770); doc.text(`${t.page} ${page} / ${pages}`, PAGE_WIDTH - MARGIN, 770, { align: 'right' }); }
}

function metric(doc: jsPDF, x: number, y: number, width: number, label: string, value: string) {
  doc.setFillColor(SURFACE); doc.setDrawColor(LIGHT); doc.roundedRect(x, y, width, 58, 5, 5, 'FD');
  textBlock(doc, label, x + 10, y + 17, width - 20, { size: 8, color: MUTED, weight: 'bold' });
  textBlock(doc, value, x + 10, y + 40, width - 20, { size: 15, weight: 'bold', lineHeight: 1.05 });
}

function drawPortrait(doc: jsPDF, input: DiagnosticPdfInput, x: number, y: number, size: number) {
  const geometry = buildResiliencePortraitGeometry(input.responses);
  const scale = size / (PORTRAIT_RADIUS * 2 + 44);
  const originX = x + size / 2; const originY = y + size / 2;
  const project = (px: number, py: number) => ({ x: originX + (px - PORTRAIT_CENTER) * scale, y: originY + (py - PORTRAIT_CENTER) * scale });
  if (geometry.usesAlternative) return false;
  doc.setDrawColor(LIGHT); doc.setLineWidth(.6);
  for (const polygon of geometry.gridPolygons) { const points = polygon.split(' ').map((pair) => { const [px, py] = pair.split(',').map(Number); return project(px, py); }); for (let i = 0; i < points.length; i += 1) { const next = points[(i + 1) % points.length]; doc.line(points[i].x, points[i].y, next.x, next.y); } }
  for (const point of geometry.points) { const axis = project(point.axisX, point.axisY); doc.line(originX, originY, axis.x, axis.y); }
  if (geometry.closedPolygon) { const points = geometry.points.map((point) => project(point.x, point.y)); doc.setFillColor(206, 225, 239); doc.setDrawColor(BLUE); doc.setLineWidth(2); doc.lines(points.slice(1).map((point, index) => [point.x - points[index].x, point.y - points[index].y]), points[0].x, points[0].y, [1, 1], 'FD', true); }
  else { doc.setDrawColor(BLUE); doc.setLineWidth(2); for (const segment of geometry.openSegments) { const points = segment.split(' ').map((pair) => { const [px, py] = pair.split(',').map(Number); return project(px, py); }); for (let i = 1; i < points.length; i += 1) doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y); } }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY);
  for (const point of geometry.points) { const marker = point.value === null ? project(point.axisX, point.axisY) : project(point.x, point.y); doc.setDrawColor(point.value === null ? MUTED : RED); doc.setLineWidth(1.6); if (point.answerId === 'D') { doc.rect(marker.x - 3, marker.y - 3, 6, 6); } else if (point.answerId === 'E') { doc.line(marker.x - 3, marker.y - 3, marker.x + 3, marker.y + 3); doc.line(marker.x + 3, marker.y - 3, marker.x - 3, marker.y + 3); } else { doc.setFillColor(255, 255, 255); doc.circle(marker.x, marker.y, 3, 'FD'); } const axis = project(point.axisX, point.axisY); doc.text(point.dimensionId, axis.x, axis.y + (axis.y < originY ? -7 : 10), { align: 'center' }); }
  return true;
}

function bulletList(doc: jsPDF, title: string, items: readonly string[], fallback: string, y: number) {
  y = textBlock(doc, title, MARGIN, y, CONTENT_WIDTH, { size: 16, weight: 'bold' }) + 6;
  const values = items.length ? items : [fallback];
  for (const item of values) { doc.setFillColor(RED); doc.circle(MARGIN + 3, y - 3, 2, 'F'); y = textBlock(doc, item, MARGIN + 12, y, CONTENT_WIDTH - 12, { size: 9.5, color: NAVY }) + 6; }
  return y + 8;
}

function addContentPage(doc: jsPDF, title: string, logoDataUrl?: string) { doc.addPage('letter', 'portrait'); pageHeader(doc, title, logoDataUrl); return 98; }

export function generateDiagnosticPdf(input: DiagnosticPdfInput): Uint8Array {
  const { model, responses, locale, generatedAt, logoDataUrl } = input; const t = copy[locale]; const evaluation = model.evaluation;
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true, putOnlyUsedFonts: true });
  doc.setProperties({ title: t.report, subject: t.organization, author: 'CORO', creator: 'CORO Diagnostic Express' });
  doc.setCreationDate(generatedAt);
  pageHeader(doc, t.organization, logoDataUrl);
  let y = textBlock(doc, t.report, MARGIN, 112, CONTENT_WIDTH, { size: 25, weight: 'bold', lineHeight: 1.1 });
  y = textBlock(doc, `${t.date}: ${new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { dateStyle: 'long' }).format(generatedAt)}  |  ${t.version}: ${evaluation.questionnaireVersion}`, MARGIN, y + 8, CONTENT_WIDTH, { size: 8.5, color: MUTED }) + 16;
  const gap = 10; const metricWidth = (CONTENT_WIDTH - gap * 2) / 3;
  metric(doc, MARGIN, y, metricWidth, evaluation.isDefinitive ? t.score : t.partial, evaluation.score === null ? '—' : `${evaluation.score} %`);
  metric(doc, MARGIN + metricWidth + gap, y, metricWidth, t.level, evaluation.level ? diagnosticLevelLabel(evaluation.level, locale) : '—');
  metric(doc, MARGIN + (metricWidth + gap) * 2, y, metricWidth, t.coverage, `${evaluation.coveragePercent} % (${evaluation.evaluableCount}/8)`);
  y += 78; y = textBlock(doc, locale === 'fr' ? 'Synthèse' : 'Summary', MARGIN, y, CONTENT_WIDTH, { size: 15, weight: 'bold' }) + 5;
  const summary = locale === 'fr' ? (evaluation.isDefinitive ? `Le résultat déclaré situe la préparation au niveau « ${diagnosticLevelLabel(evaluation.level!, locale)} ».` : `La couverture de ${evaluation.coveragePercent} % ne permet pas d'attribuer un niveau définitif.`) : (evaluation.isDefinitive ? `The declared result places preparedness at the “${diagnosticLevelLabel(evaluation.level!, locale)}” level.` : `${evaluation.coveragePercent}% coverage is insufficient to assign a definitive level.`);
  y = textBlock(doc, summary, MARGIN, y, CONTENT_WIDTH, { size: 10 }) + 10;
  y = textBlock(doc, t.portrait, MARGIN, y, CONTENT_WIDTH, { size: 15, weight: 'bold' }) + 2;
  if (!drawPortrait(doc, input, MARGIN + 128, y, 260)) y = textBlock(doc, t.alternative, MARGIN, y + 8, CONTENT_WIDTH, { size: 9.5, color: MUTED }) + 12; else y += 268;
  const dimensionY = Math.min(y, 615); doc.setFontSize(7.5); doc.setTextColor(NAVY);
  diagnosticQuestions.forEach((question, index) => { const column = index % 2; const row = Math.floor(index / 2); const answer = responses[question.id]; const suffix = answer === 'D' ? t.unknown : answer === 'E' ? t.na : `${answer} (${answer === 'A' ? '3' : answer === 'B' ? '2' : '0'}/3)`; doc.text(`${question.id}  ${question.dimension[locale]}: ${suffix}`, MARGIN + column * 260, dimensionY + row * 18); });

  y = addContentPage(doc, `${t.strengths} & ${t.improvements}`, logoDataUrl);
  y = bulletList(doc, t.strengths, model.strengths.map((item) => `${diagnosticDimensionLabel(item.dimensionId, locale)} - ${item.observation[locale]}`), t.noStrength, y);
  y = bulletList(doc, t.improvements, model.improvementRecommendations.map((item) => `${diagnosticDimensionLabel(item.dimensionId, locale)} - ${item.action[locale]}`), t.noImprovement, y);
  y = bulletList(doc, t.verification, model.verificationRecommendations.map((item) => `${diagnosticDimensionLabel(item.dimensionId, locale)} - ${item.action[locale]}`), t.noVerification, y);
  const reservations = diagnosticQuestions.filter((question) => responses[question.id] === 'D' || responses[question.id] === 'E').map((question) => `${question.id} - ${question.dimension[locale]}: ${responses[question.id] === 'D' ? t.unknown : t.na}`);
  bulletList(doc, t.reservations, reservations, locale === 'fr' ? 'Aucune réserve D/E déclarée.' : 'No D/E reservation declared.', y);

  y = addContentPage(doc, t.recommendations, logoDataUrl);
  let recommendationsOnPage = 0;
  for (const recommendation of model.detailedRecommendations) {
    const textWidth = CONTENT_WIDTH - 24;
    const titleHeight = lines(doc, `${recommendation.dimensionId} - ${diagnosticDimensionLabel(recommendation.dimensionId, locale)}`, textWidth).length * 12 * 1.35;
    const issueHeight = lines(doc, `${t.issue}: ${recommendation.operationalIssue[locale]}`, textWidth).length * 8.5 * 1.35;
    const practiceHeight = lines(doc, `${t.practice}: ${recommendation.goodPractice[locale]}`, textWidth).length * 8.5 * 1.35;
    const actionHeight = lines(doc, `${t.action}: ${recommendation.action[locale]}`, textWidth).length * 8.5 * 1.35;
    const blockHeight = titleHeight + issueHeight + practiceHeight + actionHeight + 54;
    if (recommendationsOnPage >= 4 || y + blockHeight > 720) {
      y = addContentPage(doc, t.recommendations, logoDataUrl);
      recommendationsOnPage = 0;
    }
    doc.setFillColor(SURFACE); doc.setDrawColor(LIGHT); doc.roundedRect(MARGIN, y - 15, CONTENT_WIDTH, blockHeight - 8, 5, 5, 'FD');
    y = textBlock(doc, `${recommendation.dimensionId} - ${diagnosticDimensionLabel(recommendation.dimensionId, locale)}`, MARGIN + 12, y + 4, CONTENT_WIDTH - 24, { size: 12, weight: 'bold' }) + 3;
    y = textBlock(doc, `${t.issue}: ${recommendation.operationalIssue[locale]}`, MARGIN + 12, y, CONTENT_WIDTH - 24, { size: 8.5 }) + 3;
    y = textBlock(doc, `${t.practice}: ${recommendation.goodPractice[locale]}`, MARGIN + 12, y, CONTENT_WIDTH - 24, { size: 8.5 }) + 3;
    y = textBlock(doc, `${t.action}: ${recommendation.action[locale]}`, MARGIN + 12, y, CONTENT_WIDTH - 24, { size: 8.5, weight: 'bold' }) + 16;
    recommendationsOnPage += 1;
  }

  y = addContentPage(doc, t.plan, logoDataUrl);
  for (const step of model.plan) { doc.setFillColor(SURFACE); doc.setDrawColor(LIGHT); doc.roundedRect(MARGIN, y - 15, CONTENT_WIDTH, 84, 5, 5, 'FD'); y = textBlock(doc, `${step.period} ${locale === 'fr' ? 'jours' : 'days'} - ${diagnosticDimensionLabel(step.dimensionId, locale)}`, MARGIN + 12, y + 5, CONTENT_WIDTH - 24, { size: 12, weight: 'bold' }) + 5; y = textBlock(doc, step.recommendation.action[locale], MARGIN + 12, y, CONTENT_WIDTH - 24, { size: 9 }) + 23; }
  y = textBlock(doc, t.modules, MARGIN, y, CONTENT_WIDTH, { size: 16, weight: 'bold' }) + 8;
  for (const moduleItem of model.relevantModules) y = textBlock(doc, `${moduleItem.name[locale]} - ${t.availability}: ${moduleItem.availabilityLabel[locale]}. ${moduleItem.qualification[locale]}`, MARGIN + 10, y, CONTENT_WIDTH - 10, { size: 8.5 }) + 7;
  if (y > 620) y = addContentPage(doc, t.limits, logoDataUrl);
  y = textBlock(doc, t.limits, MARGIN, y + 8, CONTENT_WIDTH, { size: 16, weight: 'bold' }) + 7; y = textBlock(doc, t.methodology, MARGIN, y, CONTENT_WIDTH, { size: 9.5, color: MUTED }) + 17;
  y = textBlock(doc, t.next, MARGIN, y, CONTENT_WIDTH, { size: 16, weight: 'bold' }) + 7; textBlock(doc, t.nextText, MARGIN, y, CONTENT_WIDTH, { size: 9.5 });
  pageFooter(doc, locale);
  return new Uint8Array(doc.output('arraybuffer'));
}

export async function loadCoroLogoDataUrl(): Promise<string> {
  const response = await fetch('/coro-logo.png', { method: 'GET', credentials: 'same-origin' });
  if (!response.ok) throw new Error('CORO_LOGO_UNAVAILABLE');
  const blob = await response.blob();
  return await new Promise((resolvePromise, reject) => { const reader = new FileReader(); reader.onload = () => resolvePromise(String(reader.result)); reader.onerror = () => reject(new Error('CORO_LOGO_UNREADABLE')); reader.readAsDataURL(blob); });
}
