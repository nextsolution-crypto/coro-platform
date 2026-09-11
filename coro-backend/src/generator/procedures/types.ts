// ============================================================
// CORO — Types officiels des procédures
// Partagés par toutes les procédures de la bibliothèque
// ============================================================

export type ActivationRule =
  | 'always'
  | 'double_signal'
  | 'simple_signal'
  | 'has_gas'
  | 'has_ammonia'
  | 'has_sprinklers'
  | 'has_elevators'
  | 'has_hazmat'
  | 'has_lithium'
  | 'boma_certified'
  | 'has_pool'
  | 'has_kitchen'
  | 'manual'
  | 'is_industrial'
  | 'industrial_with_ammonia';

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
  activationRule: ActivationRule;
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
  srcFR?: string;         // chemin ou URL image FR (héritage)
  srcEN?: string;         // chemin ou URL image EN (héritage)
  base64FR?: string;      // data:image/png;base64,... ou data:image/jpeg;base64,...
  base64EN?: string;      // data:image/jpeg;base64,... ou data:image/png;base64,...
  mimeType?: string;      // 'image/png' ou 'image/jpeg'
}

// ============================================================
// COULEURS OFFICIELLES
// ============================================================

export const COLORS = {
  // Codes incidents officiels
  red:       '#C0392B',
  green:     '#27AE60',
  blue:      '#2980B9',
  gray:      '#7F8C8D',
  white:     '#ECF0F1',
  dark:      '#2C3E50',
  orange:    '#E67E22',
  yellow:    '#F1C40F',
  brown:     '#8B4513',
  turquoise: '#1ABC9C',
  garnet:    '#8B0000',
  pink:      '#E91E63',
  purple:    '#8E44AD',
  silver:    '#95A5A6',
  indigo:    '#4B0082',
  fireAlert: '#FF6600',
  fireAlarm: '#FF0000',
  teal:      '#008B8B',

  // Couleurs procédures uniquement
  slate:     '#607D8B',
  olive:     '#808000',
  amber:     '#FF8F00',
  onyx:      '#353839',
  steel:     '#4682B4',
  coral:     '#FF6B6B',
  sapphire:  '#0057A8',
  glacier:   '#A8D8EA',
  cobalt:    '#0047AB',
  scarlet:   '#FF2400',
};

// ============================================================
// UTILITAIRE — génère un ID d'étape unique
// ============================================================

export function sid(procedureCode: string, index: number): string {
  return `${procedureCode}_step_${index.toString().padStart(3, '0')}`;
}
