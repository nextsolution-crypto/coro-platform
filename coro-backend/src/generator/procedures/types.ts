// ============================================================
// CORO — Types officiels des procédures
// Partagés par toutes les procédures de la bibliothèque
// ============================================================

export interface ProcedureStep {
  id: string;
  textFR: string;
  textEN: string;
  isBold?: boolean;
  isRed?: boolean;
  isCommentable?: boolean;
  isList?: boolean;
  subSteps?: ProcedureStep[];
}

export interface RoleSection {
  roleCode: string;
  roleLabelFR: string;
  roleLabelEN: string;
  headerColor: string;
  steps: ProcedureStep[];
}

export interface ProcedureTemplate {
  id: string;
  code: string;             // Ex: 'P001', 'P002'
  titleFR: string;
  titleEN: string;
  icon?: string;
  headerColor: string;
  incidentCode?: string;
  activationRule: string;   // 'always' | 'double_signal' | 'has_gas' | etc.
  documentTypes: string[];
  phase?: string;
  directivesGenerales?: ProcedureStep[];
  roleSections: RoleSection[];
}

// ============================================================
// COULEURS OFFICIELLES
// ============================================================

export const COLORS = {
  red:    '#C0392B',
  orange: '#E67E22',
  yellow: '#F39C12',
  dark:   '#2C3E50',
  blue:   '#2980B9',
  green:  '#27AE60',
};

// ============================================================
// UTILITAIRE — génère un ID d'étape unique
// ============================================================

export function sid(procedureCode: string, index: number): string {
  return `${procedureCode}_step_${index.toString().padStart(3, '0')}`;
}