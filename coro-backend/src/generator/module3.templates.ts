// ============================================================
// CORO — Module 3 : Rôles et responsabilités
// Architecture 100% flexible — rôles système + rôles libres
// Source noms : module2.section2_2
// ============================================================

import type { DocumentContext } from './module1/module1.index';

// ============================================================
// TYPES
// ============================================================

export type ShiftType     = 'jour' | 'soir' | 'nuit';
export type ScheduleType  = 'semaine' | 'weekend';
export type ColumnType    = 'left' | 'right' | 'top' | 'full';
export type RoleSource    = 'system' | 'custom';

export interface OrgRole {
  id: string;
  roleCode?: string;        // Référence seed (ex: 'ROLE-CU') — vide si custom
  label: string;            // Nom FR affiché dans l'organigramme
  label_en: string;         // Nom EN
  note?: string;            // Sous-titre optionnel FR (ex: "Agent de sécurité")
  note_en?: string;         // Sous-titre EN
  color: string;            // Couleur de fond de la boîte
  textColor?: string;       // Couleur du texte (défaut: blanc)
  borderColor?: string;     // Bordure optionnelle (ex: rouge pour EPI)
  level: number;            // Niveau hiérarchique (0 = sommet)
  column: ColumnType;       // Position dans l'organigramme
  isActive: boolean;        // Visible dans l'organigramme
  isSystem: boolean;        // true = rôle système (désactivable mais pas supprimable)
  source: RoleSource;
  order: number;            // Ordre d'affichage dans sa colonne
}

export interface MemberEntry {
  id: string;
  roleId: string;
  roleLabel: string;
  roleLabel_en: string;
  shift: ShiftType;
  schedule: ScheduleType;
  personneDesignee: string;
  substitut: string;
}

export interface Module3Data {
  orgRoles: OrgRole[];
  members: MemberEntry[];
  activeShifts: ShiftType[];
}

// ============================================================
// PALETTE DE COULEURS DISPONIBLES POUR L'UI
// ============================================================

export const ROLE_COLORS_PALETTE = [
  { label: 'Rouge (commandement)',  value: '#C0392B', text: '#FFFFFF' },
  { label: 'Gris (technique)',      value: '#BDC3C7', text: '#2C3E50' },
  { label: 'Vert (évacuation)',     value: '#82B366', text: '#FFFFFF' },
  { label: 'Beige (brigadier)',     value: '#FFE6CC', text: '#2C3E50' },
  { label: 'Blanc (liaison)',       value: '#FFFFFF',  text: '#2C3E50', border: '#2C3E50' },
  { label: 'Bleu (administration)', value: '#2980B9', text: '#FFFFFF' },
  { label: 'Noir (direction)',      value: '#2C3E50', text: '#FFFFFF' },
  { label: 'Orange (support)',      value: '#E67E22', text: '#FFFFFF' },
  { label: 'Vert foncé (sécurité)', value: '#1E8449', text: '#FFFFFF' },
  { label: 'Violet (liaison corp)', value: '#8E44AD', text: '#FFFFFF' },
];

// ============================================================
// RÔLES SYSTÈME DE BASE
// (suggestions pré-remplies, toujours modifiables)
// ============================================================

export const SYSTEM_ROLES: OrgRole[] = [
  {
    id: 'sys_coordonnateur',
    roleCode: 'ROLE-CU',
    label: 'COORDONNATEUR D\'URGENCE',
    label_en: 'EMERGENCY COORDINATOR',
    color: '#C0392B',
    textColor: '#FFFFFF',
    level: 0,
    column: 'top',
    isActive: true,
    isSystem: true,
    source: 'system',
    order: 0,
  },
  {
    id: 'sys_agent_liaison',
    roleCode: 'ROLE-ALT',
    label: 'AGENT DE LIAISON CORPORATIVE DE CRISE',
    label_en: 'CORPORATE CRISIS LIAISON OFFICER',
    note: '(Pour événement majeur seulement)',
    note_en: '(For major events only)',
    color: '#FFFFFF',
    textColor: '#2C3E50',
    borderColor: '#2C3E50',
    level: 1,
    column: 'left',
    isActive: false,
    isSystem: true,
    source: 'system',
    order: 1,
  },
  {
    id: 'sys_epi',
    roleCode: 'ROLE-EPI',
    label: 'ÉQUIPE DE PREMIÈRE INTERVENTION',
    label_en: 'FIRST RESPONSE TEAM',
    color: '#FFFFFF',
    textColor: '#C0392B',
    borderColor: '#C0392B',
    level: 2,
    column: 'left',
    isActive: false,
    isSystem: true,
    source: 'system',
    order: 2,
  },
  {
    id: 'sys_resp_mecanique',
    roleCode: 'ROLE-RM',
    label: 'RESPONSABLE MÉCANIQUE DU BÂTIMENT',
    label_en: 'BUILDING MECHANICAL SUPERVISOR',
    color: '#BDC3C7',
    textColor: '#2C3E50',
    level: 3,
    column: 'left',
    isActive: true,
    isSystem: true,
    source: 'system',
    order: 3,
  },
  {
    id: 'sys_resp_rassemblement',
    roleCode: 'ROLE-RPR',
    label: 'RESPONSABLE DU POINT DE RASSEMBLEMENT',
    label_en: 'ASSEMBLY POINT SUPERVISOR',
    color: '#82B366',
    textColor: '#FFFFFF',
    level: 4,
    column: 'left',
    isActive: true,
    isSystem: true,
    source: 'system',
    order: 4,
  },
  {
    id: 'sys_surveillant_sortie',
    roleCode: 'ROLE-SS',
    label: 'SURVEILLANT DE SORTIE',
    label_en: 'EXIT MONITOR',
    color: '#82B366',
    textColor: '#FFFFFF',
    level: 5,
    column: 'left',
    isActive: true,
    isSystem: true,
    source: 'system',
    order: 5,
  },
  {
    id: 'sys_brigadier',
    roleCode: 'ROLE-BRI',
    label: 'BRIGADIER',
    label_en: 'FLOOR WARDEN',
    color: '#FFE6CC',
    textColor: '#2C3E50',
    level: 6,
    column: 'left',
    isActive: true,
    isSystem: true,
    source: 'system',
    order: 6,
  },
  {
    id: 'sys_resp_secteur',
    roleCode: 'ROLE-RS',
    label: 'RESPONSABLE DE SECTEUR',
    label_en: 'SECTOR SUPERVISOR',
    note: '(1 par locataire)',
    note_en: '(1 per tenant)',
    color: '#C0392B',
    textColor: '#FFFFFF',
    level: 2,
    column: 'right',
    isActive: false,
    isSystem: true,
    source: 'system',
    order: 7,
  },
  {
    id: 'sys_chercheur',
    roleCode: 'ROLE-CHE',
    label: 'CHERCHEURS',
    label_en: 'SEARCHERS',
    note: '(Au besoin)',
    note_en: '(As needed)',
    color: '#C0392B',
    textColor: '#FFFFFF',
    level: 3,
    column: 'right',
    isActive: true,
    isSystem: true,
    source: 'system',
    order: 8,
  },
  {
    id: 'sys_accompagnateur',
    roleCode: 'ROLE-ACC',
    label: 'ACCOMPAGNATEUR POUR PERSONNE NÉCESSITANT L\'AIDE À L\'ÉVACUATION',
    label_en: 'EVACUATION ASSISTANCE COMPANION',
    color: '#C0392B',
    textColor: '#FFFFFF',
    level: 4,
    column: 'right',
    isActive: false,
    isSystem: true,
    source: 'system',
    order: 9,
  },
];

// ============================================================
// ACTIVATION AUTOMATIQUE selon configuration
// ============================================================

export function activateSystemRoles(
  config: any,
  ctx: DocumentContext
): OrgRole[] {
  return SYSTEM_ROLES.map(role => {
    let updated = { ...role };

    switch (role.id) {
      case 'sys_coordonnateur':
        updated.isActive = true;
        if (config?.agentSecurite || config?.securite24h) {
          updated.note    = '(Agent de sécurité)';
          updated.note_en = '(Security Agent)';
        }
        break;
      case 'sys_agent_liaison':
        updated.isActive = !!(config?.multiLocataires || ctx.multiLocataires);
        break;
      case 'sys_epi':
        updated.isActive = config?.panneauType === 'DOUBLE';
        break;
      case 'sys_resp_secteur':
        updated.isActive = !!(config?.multiLocataires || ctx.multiLocataires);
        break;
      case 'sys_accompagnateur':
        updated.isActive = !!(config?.personnelHandicap);
        break;
    }

    return updated;
  });
}

// ============================================================
// EXTRACTION NOM depuis section 2.2
// ============================================================

export function extractNameFromSection2_2(
  roleId: string,
  section2_2: any[]
): string {
  if (!section2_2 || !Array.isArray(section2_2)) return '';

  const keywords: Record<string, string[]> = {
    sys_coordonnateur:     ['coordonnateur', 'coordinator', 'urgence'],
    sys_resp_mecanique:    ['mécanique', 'maintenance', 'mechanical', 'entretien'],
    sys_resp_rassemblement:['rassemblement', 'assembly'],
    sys_epi:               ['intervention', 'epi', 'first response'],
    sys_agent_liaison:     ['liaison', 'directeur', 'director', 'gestionnaire'],
  };

  const keys = keywords[roleId] || [];
  if (keys.length === 0) return '';

  const match = section2_2.find(entry =>
    keys.some(k =>
      entry.role?.toLowerCase().includes(k.toLowerCase())
    )
  );

  return match?.name || '';
}

// ============================================================
// GÉNÉRATION TABLEAU MEMBRES 3.2
// ============================================================

export function buildMemberTable(
  orgRoles: OrgRole[],
  config: any,
  section2_2: any[]
): MemberEntry[] {
  // Rôles actifs sauf agent liaison (pas dans tableau membres)
  const activeRoles = orgRoles.filter(r =>
    r.isActive && r.id !== 'sys_agent_liaison'
  );

  const activeShifts = getActiveShifts(config);
  const schedules: ScheduleType[] = ['semaine', 'weekend'];
  const entries: MemberEntry[] = [];

  for (const role of activeRoles) {
    for (const schedule of schedules) {
      for (const shift of activeShifts) {
        const personneDesignee = (shift === 'jour' && schedule === 'semaine')
          ? extractNameFromSection2_2(role.id, section2_2)
          : '';

        entries.push({
          id: `${role.id}_${schedule}_${shift}`,
          roleId: role.id,
          roleLabel: role.label,
          roleLabel_en: role.label_en,
          shift,
          schedule,
          personneDesignee,
          substitut: '',
        });
      }
    }
  }

  return entries;
}

// ============================================================
// UTILITAIRE — shifts actifs
// ============================================================

export function getActiveShifts(config: any): ShiftType[] {
  const shifts: ShiftType[] = [];
  if (config?.occupationJour !== false) shifts.push('jour');
  if (config?.occupationSoir === true)  shifts.push('soir');
  if (config?.occupationNuit === true)  shifts.push('nuit');
  return shifts.length > 0 ? shifts : ['jour'];
}

// ============================================================
// GÉNÉRATION MODULE 3 COMPLET
// ============================================================

function buildModule3(
  ctx: DocumentContext,
  config: any,
  section2_2: any[],
  lang: 'fr' | 'en',
  existingCustomRoles: OrgRole[] = []
): any {
  // Rôles système activés selon config
  const systemRoles = activateSystemRoles(config, ctx);

  // Fusion : rôles système + rôles custom existants
  const allRoles = [...systemRoles, ...existingCustomRoles];

  // Tableau membres depuis tous les rôles actifs
  const members = buildMemberTable(allRoles, config, section2_2);

  const titles = lang === 'fr' ? {
    module:  'RÔLES ET RESPONSABILITÉS DE L\'ÉQUIPE D\'URGENCE',
    s31:     'ORGANIGRAMME DE L\'ÉQUIPE D\'URGENCE',
    s32:     'LISTE DES MEMBRES DE L\'ÉQUIPE D\'URGENCE',
  } : {
    module:  'EMERGENCY TEAM ROLES AND RESPONSIBILITIES',
    s31:     'EMERGENCY TEAM ORGANIZATIONAL CHART',
    s32:     'EMERGENCY TEAM MEMBER LIST',
  };

  return {
    moduleNumber: 3,
    title: titles.module,
    language: lang,
    sections: [
      {
        id: '3.1',
        title: titles.s31,
        type: 'org_chart',
        orgRoles: allRoles,         // Tous les rôles (actifs + inactifs pour l'éditeur)
      },
      {
        id: '3.2',
        title: titles.s32,
        type: 'member_table',
        members,
        activeShifts: getActiveShifts(config),
      },
    ],
  };
}

// ============================================================
// EXPORT PRINCIPAL
// ============================================================

export function generateModule3(
  ctx: DocumentContext,
  config: any = {},
  section2_2: any[] = [],
  existingCustomRoles: OrgRole[] = []
): any {
  return {
    fr: buildModule3(ctx, config, section2_2, 'fr', existingCustomRoles),
    en: buildModule3(ctx, config, section2_2, 'en', existingCustomRoles),
  };
}