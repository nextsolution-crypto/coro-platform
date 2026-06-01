// ============================================================
// CORO — Module 4 : Orchestrateur des procédures
// Source de vérité : /procedures/index.ts
// ============================================================

import { DocumentContext } from './module1.templates';
import {
  getActiveProcedures,
  getAllProcedures,
  getProcedureById,
  PROCEDURES_REGISTRY,
} from './procedures/index';

export { getActiveProcedures, getAllProcedures, getProcedureById };

// ============================================================
// GÉNÉRATION MODULE 4 COMPLET
// ============================================================

export function generateModule4(
  ctx: DocumentContext,
  config: any = {},
  activeRoleCodes: string[] = [],
  customProcedureIds: string[] = [], // IDs ajoutés manuellement depuis la bibliothèque
): any {
  // Procédures auto selon config
  const autoProcedures = getActiveProcedures(
    config,
    ctx.documentType,
    activeRoleCodes,
  );

  // Procédures manuelles ajoutées depuis la bibliothèque
  const manualProcedures = customProcedureIds
    .map(id => getProcedureById(id))
    .filter(Boolean)
    .filter(p => !autoProcedures.find(a => a!.id === p!.id)) // Évite les doublons
    .map(p => ({
      ...p!,
      roleSections: p!.roleSections.filter(rs =>
        rs.roleCode === 'TOUS' || activeRoleCodes.includes(rs.roleCode)
      ),
    }));

  const allProcedures = [...autoProcedures, ...manualProcedures];

  // Numérotation dynamique (4.1, 4.2, etc.)
  // P001 directives générales = pas numérotée
  const numbered = allProcedures
    .filter(p => p.id !== 'p001_directives_generales')
    .map((p, idx) => ({ ...p, sectionNumber: `4.${idx + 1}` }));

  const directives = allProcedures.find(p => p.id === 'p001_directives_generales');

  return {
    moduleNumber: 4,
    title_fr: 'PROCÉDURES DES MEMBRES DE L\'ÉQUIPE D\'URGENCE',
    title_en: 'EMERGENCY TEAM MEMBER PROCEDURES',
    language: 'fr', // Sera dupliqué pour EN
    directivesGenerales: directives || null,
    procedures: numbered,
    totalProcedures: numbered.length,
  };
}

// ============================================================
// EXPORT — Liste complète pour l'UI bibliothèque
// ============================================================

export { PROCEDURES_REGISTRY };