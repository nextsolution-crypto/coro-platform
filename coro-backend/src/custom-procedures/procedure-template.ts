// ============================================================
// CORO — Gabarit unique des procédures
// Toute procédure (bibliothèque, IA, import, rédaction) suit la même forme :
//   titre FR/EN, objectif, couleur, encadrés, sections par rôle,
//   étapes { textFR, textEN, isBold, isRed, subSteps[] }.
// Style : verbe vouvoyé à l'impératif, en gras, en tête d'étape
// (« **Vérifiez** le panneau… »).
// ============================================================

import { harmonizeStepText } from '../generator/step-style';

export interface TemplateStep {
  id: string;
  textFR: string;
  textEN: string;
  isBold?: boolean;
  isRed?: boolean;
  isList?: boolean;
  subSteps?: TemplateStep[];
}

export interface TemplateRoleSection {
  roleCode: string;
  roleLabelFR: string;
  roleLabelEN: string;
  headerColor?: string;
  steps: TemplateStep[];
}

export interface TemplateContent {
  code?: string;
  titleFR: string;
  titleEN: string;
  objective?: string;
  color: string;
  headerColor: string;
  activationRule: string;
  documentTypes?: string[];
  roleSections: TemplateRoleSection[];
  importantBoxes: { type: string; text: string; textEN?: string }[];
  crossReferences: string[];
}

export const PROCEDURE_COLORS = ['#C0392B', '#E67E22', '#8E44AD', '#2980B9', '#27AE60', '#2C3E50'];

const clean = (value: unknown, max = 2000): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

function normalizeStep(raw: any, idBase: string, index: number, depth = 0): TemplateStep | null {
  const source = typeof raw === 'string' ? { textFR: raw } : raw || {};
  const textFR = clean(source.textFR ?? source.text ?? source.fr);
  if (!textFR) return null;
  const textEN = clean(source.textEN ?? source.en) || textFR;
  const step: TemplateStep = {
    id: clean(source.id, 80) || `${idBase}_${depth ? 's' : ''}${index + 1}`,
    textFR: harmonizeStepText(textFR, { bold: depth === 0 }),
    textEN,
  };
  if (depth === 0 && (source.isBold || /^\*\*/.test(step.textFR))) step.isBold = true;
  if (source.isRed) step.isRed = true;
  if (depth > 0 || source.isList) step.isList = true;
  if (depth === 0 && Array.isArray(source.subSteps)) {
    const subSteps = source.subSteps
      .map((sub: any, i: number) => normalizeStep(sub, `${step.id}`, i, 1))
      .filter(Boolean) as TemplateStep[];
    if (subSteps.length) step.subSteps = subSteps;
  }
  return step;
}

/**
 * Ramène tout contenu de procédure au gabarit : ancien format IA
 * (actions / actionsEN / roleName) comme nouveau.
 */
export function toTemplateContent(raw: any, record: any = {}): TemplateContent {
  const content = raw || {};
  const code = clean(content.code || record.code, 40) || undefined;
  const color =
    [content.headerColor, content.color, record.color].find(
      (value) => typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value),
    ) || '#2C3E50';
  const idBase = code || clean(record.id, 40) || 'CP';

  const roleSections: TemplateRoleSection[] = (Array.isArray(content.roleSections) ? content.roleSections : [])
    .map((rs: any, sectionIndex: number) => {
      const rawSteps = Array.isArray(rs?.steps)
        ? rs.steps
        : (Array.isArray(rs?.actions) ? rs.actions : []).map((action: string, i: number) => ({
            textFR: action,
            textEN: Array.isArray(rs.actionsEN) ? rs.actionsEN[i] : undefined,
          }));
      const steps = rawSteps
        .map((step: any, i: number) => normalizeStep(step, `${idBase}_r${sectionIndex + 1}`, i))
        .filter(Boolean) as TemplateStep[];
      const roleCode = clean(rs?.roleCode, 80) || 'TOUS';
      return {
        roleCode,
        roleLabelFR: clean(rs?.roleLabelFR || rs?.roleName, 200) || roleCode,
        roleLabelEN: clean(rs?.roleLabelEN || rs?.roleNameEN || rs?.roleName, 200) || roleCode,
        headerColor: typeof rs?.headerColor === 'string' ? rs.headerColor : undefined,
        steps,
      };
    })
    .filter((section: TemplateRoleSection) => section.steps.length > 0);

  return {
    ...(code ? { code } : {}),
    titleFR: clean(content.titleFR || record.titleFR, 200).toLocaleUpperCase('fr-CA'),
    titleEN: clean(content.titleEN || record.titleEN, 200).toLocaleUpperCase('en-CA'),
    objective: clean(content.objective || record.objective, 600) || undefined,
    color,
    headerColor: color,
    activationRule: clean(content.activationRule, 40) || 'manual',
    ...(Array.isArray(content.documentTypes) ? { documentTypes: content.documentTypes } : {}),
    roleSections,
    importantBoxes: (Array.isArray(content.importantBoxes) ? content.importantBoxes : [])
      .map((box: any) => ({
        type: box?.type === 'NOTE' ? 'NOTE' : 'IMPORTANT',
        text: clean(box?.text ?? box?.textFR, 800),
        ...(clean(box?.textEN, 800) ? { textEN: clean(box.textEN, 800) } : {}),
      }))
      .filter((box: any) => box.text),
    crossReferences: (Array.isArray(content.crossReferences) ? content.crossReferences : [])
      .map((ref: unknown) => clean(ref, 20))
      .filter(Boolean),
  };
}

export interface TemplateIssue {
  where: string;
  problem: string;
}

/** Verbe à l'infinitif en tête (« Vérifier le… ») plutôt que vouvoyé. */
function startsWithInfinitive(text: string): boolean {
  const first = text.replace(/^\*\*/, '').split(/[\s*:,]/)[0] || '';
  return /^[A-Za-zÀ-ÿ]{3,}(er|ir|re)$/iu.test(first) && !/ure$/iu.test(first) && !/^(Votre|Lettre|Entre|Contre|Notre|Autre|Premier|Dernier|Hier)$/iu.test(first);
}

/** Écarts au gabarit, à corriger avant d'enregistrer. */
export function templateIssues(content: TemplateContent, allowedRoleCodes?: string[]): TemplateIssue[] {
  const issues: TemplateIssue[] = [];
  if (!content.titleFR) issues.push({ where: 'titre', problem: 'titre français manquant' });
  if (!content.titleEN) issues.push({ where: 'titre', problem: 'titre anglais manquant' });
  if (!content.roleSections.length) issues.push({ where: 'procédure', problem: 'aucune section par rôle' });
  for (const section of content.roleSections) {
    if (allowedRoleCodes && !allowedRoleCodes.includes(section.roleCode) && section.roleCode !== 'TOUS') {
      issues.push({ where: section.roleLabelFR, problem: `rôle ${section.roleCode} hors de la liste des rôles du projet` });
    }
    section.steps.forEach((step, index) => {
      const where = `${section.roleLabelFR}, étape ${index + 1}`;
      if (startsWithInfinitive(step.textFR)) {
        issues.push({ where, problem: `verbe à l'infinitif (« ${step.textFR.replace(/\*\*/g, '').slice(0, 40)} ») : utiliser le vouvoiement impératif` });
      }
      const plain = (value: string) => (value || '').replace(/\*\*/g, '').trim();
      if (!step.textEN || plain(step.textEN) === plain(step.textFR)) {
        issues.push({ where, problem: 'traduction anglaise manquante' });
      }
    });
  }
  return issues;
}
