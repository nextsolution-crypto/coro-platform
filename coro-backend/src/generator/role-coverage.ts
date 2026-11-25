// ============================================================
// CORO — Couverture des rôles dans les procédures
// Règle unique utilisée par la génération, l'éditeur et le PDF :
//  - un rôle actif de l'organigramme garde sa section, sous son nom unique;
//  - un rôle absent n'est plus retiré en silence : ses tâches sont reprises
//    par le rôle choisi par le conseiller (le coordonnateur d'urgence est
//    proposé), ou le conseiller confirme qu'elles ne sont pas reprises;
//  - tant que le conseiller n'a pas décidé, le rôle est signalé « à confirmer ».
// ============================================================

import { isGenericRole, isNameOfRole, roleDefinition, roleLabel } from './role-registry';

/** Valeur d'une décision : code du rôle qui reprend les tâches, ou NONE. */
export type RoleAssignment = string;
export const NOT_TAKEN_OVER = 'NONE';
export const DEFAULT_TAKEOVER_ROLE = 'ROLE-CU';

export interface RoleCoverage {
  activeCodes: string[];
  assignments: Record<string, RoleAssignment>;
  orgRoles: any[];
  /** Garde toutes les sections (inventaire des rôles nommés, sans filtrer). */
  keepAll?: boolean;
}

export function toRoleCoverage(value: string[] | RoleCoverage | undefined): RoleCoverage {
  if (Array.isArray(value)) return { activeCodes: value, assignments: {}, orgRoles: [] };
  return {
    activeCodes: value?.activeCodes || [],
    assignments: value?.assignments || {},
    orgRoles: value?.orgRoles || [],
    keepAll: !!value?.keepAll,
  };
}

const isLibraryProcedure = (procedure: any) => /^P\d+$/i.test(procedure?.code || '');

/**
 * Une section de la bibliothèque dont le titre décrit une situation
 * (« Personne qui constate l'incident ») plutôt que le rôle de son code
 * s'adresse à tous.
 */
function effectiveRoleCode(procedure: any, section: any): string {
  const code = section?.roleCode === 'ROLE-TOUS' ? 'TOUS' : section?.roleCode;
  if (!isLibraryProcedure(procedure) || isGenericRole(code) || !roleDefinition(code)) return code;
  const label = String(section.roleLabelFR || '');
  const official = roleDefinition(code)!.labelFR;
  const isSubtitled = label.toLocaleLowerCase('fr-CA').startsWith(`${official.toLocaleLowerCase('fr-CA')} —`);
  if (!label || isNameOfRole(code, label) || isSubtitled) return code;
  return 'TOUS';
}

function labelledSection(procedure: any, section: any, coverage: RoleCoverage) {
  const code = effectiveRoleCode(procedure, section);
  if (isGenericRole(code)) {
    return {
      ...section,
      roleCode: code,
      roleLabelFR: section.roleLabelFR || roleLabel(code, 'fr'),
      roleLabelEN: section.roleLabelEN || roleLabel(code, 'en'),
    };
  }
  const fr = roleLabel(code, 'fr', coverage.orgRoles);
  const en = roleLabel(code, 'en', coverage.orgRoles);
  // Garde un sous-titre de la bibliothèque (« Coordonnateur d'urgence — Agent de sécurité console »).
  const subtitle = (value: string | undefined) => {
    const index = (value || '').indexOf(' — ');
    return index > 0 ? value!.slice(index) : '';
  };
  return {
    ...section,
    roleCode: code,
    roleLabelFR: fr + subtitle(section.roleLabelFR),
    roleLabelEN: en + subtitle(section.roleLabelEN),
  };
}

function takeoverStep(procedure: any, absentCode: string, coverage: RoleCoverage) {
  return {
    id: `${procedure.code || procedure.id}_reprise_${absentCode}`,
    textFR: `**Reprenez les tâches de : ${roleLabel(absentCode, 'fr', coverage.orgRoles)}**`,
    textEN: `**Take over the tasks of: ${roleLabel(absentCode, 'en', coverage.orgRoles)}**`,
    isBold: true,
    isTakeover: true,
  };
}

/** Section d'un rôle actif, nom unique, tâches reprises incluses. */
export function applyRoleCoverage<T extends { roleSections?: any[] }>(
  procedure: T,
  rawCoverage: string[] | RoleCoverage,
): T {
  const coverage = toRoleCoverage(rawCoverage);
  const active = new Set(coverage.activeCodes);
  const result: any[] = [];

  const sectionFor = (code: string, template: any) => {
    let target = result.find((section) => section.roleCode === code);
    if (!target) {
      target = labelledSection(
        procedure,
        { roleCode: code, headerColor: template?.headerColor, steps: [] },
        coverage,
      );
      result.push(target);
    }
    return target;
  };

  for (const raw of procedure.roleSections || []) {
    const section = labelledSection(procedure, raw, coverage);
    const code = section.roleCode;
    if (isGenericRole(code) || active.has(code) || coverage.keepAll) {
      const existing = result.find((s) => s.roleCode === code && !isGenericRole(code));
      if (existing) existing.steps = [...(existing.steps || []), ...(section.steps || [])];
      else result.push(section);
      continue;
    }
    const takeover = coverage.assignments[code];
    if (!takeover || takeover === NOT_TAKEN_OVER || !active.has(takeover)) continue;
    const target = sectionFor(takeover, raw);
    target.steps = [
      ...(target.steps || []),
      takeoverStep(procedure, code, coverage),
      ...(raw.steps || []),
    ];
  }

  return { ...procedure, roleSections: result };
}

export interface UncoveredRole {
  code: string;
  labelFR: string;
  labelEN: string;
  procedures: { id: string; code?: string; titleFR?: string; titleEN?: string }[];
  /** Décision enregistrée (code du rôle repreneur ou NONE), sinon absente. */
  decision?: RoleAssignment;
  proposedTakeover: string;
}

/** Rôles nommés par des procédures mais absents de l'organigramme. */
export function findUncoveredRoles(
  procedures: any[],
  rawCoverage: string[] | RoleCoverage,
): UncoveredRole[] {
  const coverage = toRoleCoverage(rawCoverage);
  const active = new Set(coverage.activeCodes);
  const byCode = new Map<string, UncoveredRole>();
  for (const procedure of procedures || []) {
    for (const raw of procedure?.roleSections || []) {
      const code = effectiveRoleCode(procedure, raw);
      if (!code || isGenericRole(code) || active.has(code)) continue;
      if (!byCode.has(code)) {
        const decision = coverage.assignments[code];
        byCode.set(code, {
          code,
          labelFR: roleDefinition(code) ? roleLabel(code, 'fr', coverage.orgRoles) : raw.roleLabelFR || code,
          labelEN: roleDefinition(code) ? roleLabel(code, 'en', coverage.orgRoles) : raw.roleLabelEN || code,
          procedures: [],
          ...(decision ? { decision } : {}),
          proposedTakeover: active.has(DEFAULT_TAKEOVER_ROLE)
            ? DEFAULT_TAKEOVER_ROLE
            : coverage.activeCodes[0] || DEFAULT_TAKEOVER_ROLE,
        });
      }
      const entry = byCode.get(code)!;
      if (!entry.procedures.some((p) => p.id === procedure.id)) {
        entry.procedures.push({
          id: procedure.id,
          code: procedure.code,
          titleFR: procedure.titleFR,
          titleEN: procedure.titleEN,
        });
      }
    }
  }
  return [...byCode.values()];
}

/** Décisions valables : rôle absent → rôle actif ou NONE. */
export function sanitizeAssignments(
  input: unknown,
  activeCodes: string[],
): Record<string, RoleAssignment> {
  const out: Record<string, RoleAssignment> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [code, target] of Object.entries(input as Record<string, unknown>)) {
    if (typeof code !== 'string' || code.length > 80 || typeof target !== 'string') continue;
    if (activeCodes.includes(code)) continue;
    if (target === NOT_TAKEN_OVER || activeCodes.includes(target)) out[code] = target;
  }
  return out;
}
