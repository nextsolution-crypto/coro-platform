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
  referenceImages?: ProcedureImage[];
}

export interface ProcedureImage {
  id: string;
  captionFR: string;
  captionEN: string;
  srcFR: string;   // chemin ou URL image FR
  srcEN: string;   // chemin ou URL image EN
}

// ============================================================
// COULEURS OFFICIELLES
// ============================================================

export const COLORS = {
  // Codes incidents officiels
  red:       '#C0392B',  // Code Rouge / Alarme incendie
  green:     '#27AE60',  // Code Vert
  blue:      '#2980B9',  // Code Bleu
  gray:      '#7F8C8D',  // Code Gris
  white:     '#ECF0F1',  // Code Blanc
  dark:      '#2C3E50',  // Code Noir
  orange:    '#E67E22',  // Code Orange
  yellow:    '#F1C40F',  // Code Jaune
  brown:     '#8B4513',  // Code Brun
  turquoise: '#1ABC9C',  // Code Turquoise
  garnet:    '#8B0000',  // Code Grenat
  pink:      '#E91E63',  // Code Rose
  purple:    '#8E44AD',  // Code Violet
  silver:    '#95A5A6',  // Code Argent
  indigo:    '#4B0082',  // Protocole-18
  fireAlert: '#FF6600',  // Alerte incendie
  fireAlarm: '#FF0000',  // Alarme incendie
  teal:      '#008B8B',  // Ascenseur / urgence technique
};

// ============================================================
// UTILITAIRE — génère un ID d'étape unique
// ============================================================

export function sid(procedureCode: string, index: number): string {
  return `${procedureCode}_step_${index.toString().padStart(3, '0')}`;
}