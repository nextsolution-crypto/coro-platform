// ============================================================
// CORO — Module 4 : Orchestrateur des procédures
// Source de vérité : /procedures/index.ts
// ============================================================

import type { DocumentContext } from './module1/module1.index';
import {
  getActiveProcedures,
  getAllProcedures,
  getProcedureById,
  PROCEDURES_REGISTRY,
} from './procedures/index';
import { applyRoleCoverage, RoleCoverage, toRoleCoverage } from './role-coverage';

export { getActiveProcedures, getAllProcedures, getProcedureById };

// ============================================================
// GÉNÉRATION MODULE 4 COMPLET
// ============================================================

export function generateModule4(
  ctx: DocumentContext,
  config: any = {},
  activeRoleCodes: string[] | RoleCoverage = [],
  customProcedureIds: string[] = [],
  allProceduresFromDB?: any[], // Si fourni, utilise la DB au lieu des fichiers TS
): any {

  let allProcedures: any[];

  if (allProceduresFromDB && allProceduresFromDB.length > 0) {
    // Mode DB : procédures déjà filtrées et fournies par le service
    allProcedures = allProceduresFromDB;
  } else {
    // Mode fallback : fichiers TypeScript (compatibilité ascendante)
    const autoProcedures = getActiveProcedures(
      config,
      ctx.documentType,
      activeRoleCodes,
    );

    const manualProcedures = customProcedureIds
      .map(id => getProcedureById(id))
      .filter(Boolean)
      .filter(p => !autoProcedures.find(a => a!.id === p!.id))
      .map(p => applyRoleCoverage(p!, activeRoleCodes));

    allProcedures = [...autoProcedures, ...manualProcedures];
  }

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
    // Rôles actifs utilisés pour ce module (repère pour savoir s'il est à jour).
    activeRoleCodes: toRoleCoverage(activeRoleCodes).activeCodes,
  };
}

// ============================================================
// EXPORT — Liste complète pour l'UI bibliothèque
// ============================================================

export { PROCEDURES_REGISTRY };
