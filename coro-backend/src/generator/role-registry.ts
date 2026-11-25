// ============================================================
// CORO — Liste unique des rôles d'urgence
// Un code = un nom, partout : organigramme, procédures, IA, PDF.
// Le nom donné dans l'organigramme du projet l'emporte s'il a été modifié.
// ============================================================

import { SYSTEM_ROLES } from './module3.templates';

export interface RoleDefinition {
  code: string;
  labelFR: string;
  labelEN: string;
  /** Anciens noms du même rôle, remplacés par le nom officiel. */
  aliasesFR?: string[];
  /** Rôle générique, toujours présent (pas une case de l'organigramme). */
  generic?: boolean;
}

export const ROLE_REGISTRY: RoleDefinition[] = [
  { code: 'ROLE-CU', labelFR: "Coordonnateur d'urgence", labelEN: 'Emergency Coordinator' },
  { code: 'ROLE-ALT', labelFR: 'Agent de liaison corporative de crise', labelEN: 'Corporate Crisis Liaison Officer' },
  { code: 'ROLE-AS', labelFR: 'Agent de sécurité', labelEN: 'Security Agent', aliasesFR: ['Agent de sécurité / Responsable'] },
  { code: 'ROLE-EPI', labelFR: 'Équipe de première intervention', labelEN: 'First Response Team', aliasesFR: ['Équipier de première intervention'] },
  { code: 'ROLE-RM', labelFR: 'Responsable mécanique du bâtiment', labelEN: 'Building Mechanical Supervisor', aliasesFR: ['Responsable de la maintenance', 'Responsable mécanique'] },
  { code: 'ROLE-RPR', labelFR: 'Responsable du point de rassemblement', labelEN: 'Assembly Point Supervisor' },
  { code: 'ROLE-SS', labelFR: 'Surveillant de sortie', labelEN: 'Exit Monitor' },
  { code: 'ROLE-BRI', labelFR: 'Brigadier', labelEN: 'Floor Warden' },
  { code: 'ROLE-RS', labelFR: 'Responsable de secteur', labelEN: 'Sector Supervisor' },
  { code: 'ROLE-CHE', labelFR: 'Chercheurs', labelEN: 'Searchers', aliasesFR: ['Chercheur(s)', "Chef d'équipe"] },
  {
    code: 'ROLE-ACC',
    labelFR: "Accompagnateur pour personne nécessitant l'aide à l'évacuation",
    labelEN: 'Evacuation Assistance Companion',
    aliasesFR: ['Accompagnateur PPNAE'],
  },
  { code: 'ROLE-OCC', labelFR: 'Occupants / Travailleurs', labelEN: 'Occupants / Workers', generic: true },
  { code: 'TOUS', labelFR: 'Tous les intervenants', labelEN: 'All Responders', generic: true },
];

const BY_CODE = new Map(ROLE_REGISTRY.map((role) => [role.code, role]));

export function roleDefinition(code: string | undefined): RoleDefinition | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code === 'ROLE-TOUS' ? 'TOUS' : code);
}

export function isGenericRole(code: string | undefined): boolean {
  return !!roleDefinition(code)?.generic;
}

/** « COORDONNATEUR D'URGENCE » → « Coordonnateur d'urgence ». */
export function sentenceCase(label: string): string {
  const trimmed = (label || '').trim();
  if (!trimmed || trimmed !== trimmed.toUpperCase()) return trimmed;
  const lower = trimmed.toLocaleLowerCase('fr-CA');
  return lower.charAt(0).toLocaleUpperCase('fr-CA') + lower.slice(1);
}

const normalize = (value: string) =>
  (value || '')
    .toLocaleLowerCase('fr-CA')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Le libellé est-il un nom de ce rôle (officiel ou ancien) ? */
export function isNameOfRole(code: string, label: string): boolean {
  const role = roleDefinition(code);
  if (!role || !label) return false;
  const target = normalize(label);
  return [role.labelFR, role.labelEN, ...(role.aliasesFR || [])].some(
    (name) => normalize(name) === target,
  );
}

/**
 * Nom d'un rôle pour un projet : celui de l'organigramme s'il a été renommé
 * ou s'il s'agit d'un rôle ajouté, sinon le nom officiel.
 */
export function roleLabel(
  code: string,
  lang: 'fr' | 'en',
  orgRoles: any[] = [],
): string {
  const orgRole = orgRoles.find(
    (role: any) => role && (role.roleCode === code || (!role.roleCode && role.id === code)),
  );
  const official = roleDefinition(code);
  if (orgRole) {
    const system = SYSTEM_ROLES.find((role) => role.roleCode === orgRole.roleCode);
    const field = lang === 'fr' ? 'label' : 'label_en';
    const renamed = !system || normalize(system[field] || '') !== normalize(orgRole[field] || '');
    if ((renamed || !official) && orgRole[field]) return sentenceCase(orgRole[field]);
    if (!official && orgRole.label) return sentenceCase(orgRole.label);
  }
  if (official) return lang === 'fr' ? official.labelFR : official.labelEN;
  return code;
}

/** Rôles proposés à l'IA et dans les listes de choix d'un projet. */
export function projectRoleChoices(orgRoles: any[] = [], activeCodes: string[] = []) {
  return activeCodes.map((code) => ({
    code,
    labelFR: roleLabel(code, 'fr', orgRoles),
    labelEN: roleLabel(code, 'en', orgRoles),
  }));
}
