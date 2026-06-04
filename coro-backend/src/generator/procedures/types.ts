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
  red:       '#C0392B',  // P004 Alarme incendie / Code Rouge
  green:     '#27AE60',  // Code Vert
  blue:      '#2980B9',  // P013 Urgence médicale / Code Bleu
  gray:      '#7F8C8D',  // P005 Fuite de gaz / Code Gris
  white:     '#ECF0F1',  // P011 Menace active / Code Blanc
  dark:      '#2C3E50',  // P015 Colis suspect / Code Noir
  orange:    '#E67E22',  // P002 Découverte fumée / Code Orange
  yellow:    '#F1C40F',  // Code Jaune
  brown:     '#8B4513',  // P018 Mat. dangereuses / Code Brun
  turquoise: '#1ABC9C',  // P017 Bris gicleurs / Code Turquoise
  garnet:    '#8B0000',  // P021 VE incendie + P026 Batterie lithium / Code Grenat
  pink:      '#E91E63',  // Code Rose
  purple:    '#8E44AD',  // P020 Manifestation / Code Violet
  silver:    '#95A5A6',  // Code Argent
  indigo:    '#4B0082',  // Protocole-18
  fireAlert: '#FF6600',  // P003 Alerte incendie
  fireAlarm: '#FF0000',  // Alarme incendie
  teal:      '#008B8B',  // P012 Ascenseur

  // Couleurs procédures uniquement
  slate:     '#607D8B',  // P001 Directives générales
  olive:     '#808000',  // P014 Gaz toxique
  amber:     '#FF8F00',  // P016 Coupure de courant
  onyx:      '#353839',  // P019 Alerte bombe
  steel:     '#4682B4',  // P022 Vents violents
  coral:     '#FF6B6B',  // P023 Vagues de chaleur
  sapphire:  '#0057A8',  // P024 Inondations
  glacier:   '#A8D8EA',  // P025 Verglas
  cobalt:    '#0047AB',  // P027 Noyade
  scarlet:   '#FF2400',  // P028 Incendie cuisine
};

// ============================================================
// UTILITAIRE — génère un ID d'étape unique
// ============================================================

export function sid(procedureCode: string, index: number): string {
  return `${procedureCode}_step_${index.toString().padStart(3, '0')}`;
}