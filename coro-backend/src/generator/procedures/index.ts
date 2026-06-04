// ============================================================
// CORO — Registre central de la bibliothèque de procédures
// Pour ajouter une procédure : importer + ajouter au registre
// ============================================================

import { ProcedureTemplate } from './types';
import { P001_DIRECTIVES_GENERALES } from './p001_directives_generales';
import { P002_DECOUVERTE_FUMEE } from './p002_decouverte_fumee';
import { P003_ALERTE_INCENDIE } from './p003_alerte_incendie';
import { P004_ALARME_INCENDIE } from './p004_alarme_incendie';
import { P005_FUITE_GAZ } from './p005_fuite_gaz';
import { P011_MENACE_ACTIVE } from './p011_menace_active';
import { P012_ASCENSEUR } from './p012_ascenseur';
import { P013_URGENCE_MEDICALE } from './p013_urgence_medicale';
import { P014_GAZ_TOXIQUE } from './p014_gaz_toxique';
import { P015_COLIS_SUSPECT } from './p015_colis_suspect';
import { P016_COUPURE_COURANT } from './p016_coupure_courant';
import { P017_BRIS_GICLEURS } from './p017_bris_gicleurs';
import { P018_MATIERES_DANGEREUSES } from './p018_matieres_dangereuses';
import { P019_ALERTE_BOMBE } from './p019_alerte_bombe';
import { P020_MANIFESTATION } from './p020_manifestation';
import { P021_VE_INCENDIE } from './p021_ve_incendie';
import { P022_VENTS_VIOLENTS } from './p022_vents_violents';
import { P023_VAGUES_CHALEUR } from './p023_vagues_chaleur';
import { P026_BATTERIE_LITHIUM } from './p026_batterie_lithium';
import { P028_INCENDIE_CUISINE } from './p028_incendie_cuisine';

// ============================================================
// REGISTRE OFFICIEL
// Ordre = ordre d'affichage par défaut dans le document
// ============================================================

export const PROCEDURES_REGISTRY: ProcedureTemplate[] = [
  P001_DIRECTIVES_GENERALES,
  P002_DECOUVERTE_FUMEE,
  P003_ALERTE_INCENDIE,
  P004_ALARME_INCENDIE,
  P005_FUITE_GAZ,
  P011_MENACE_ACTIVE,
  P012_ASCENSEUR,
  P013_URGENCE_MEDICALE,
  P014_GAZ_TOXIQUE,
  P015_COLIS_SUSPECT,
  P016_COUPURE_COURANT,
  P017_BRIS_GICLEURS,
  P018_MATIERES_DANGEREUSES,
  P019_ALERTE_BOMBE,
  P020_MANIFESTATION,
  P021_VE_INCENDIE,
  P022_VENTS_VIOLENTS,
  P023_VAGUES_CHALEUR,
  P026_BATTERIE_LITHIUM,
  P028_INCENDIE_CUISINE,
  // P006_FUITE_AMMONIAC,     ← à venir
  // P007_URGENCE_MEDICALE,   ← à venir
];

// ============================================================
// RÈGLES D'ACTIVATION AUTOMATIQUE
// ============================================================

export const ACTIVATION_RULES: Record<string, (config: any) => boolean> = {
  always:          ()      => true,
  double_signal:   (c)     => c?.panneauType === 'DOUBLE',
  simple_signal:   (c)     => c?.panneauType === 'SIMPLE',
  has_gas:         (c)     => !!c?.gazNaturel,
  has_ammonia:     (c)     => !!c?.ammoniac,
  has_sprinklers:  (c)     => !!c?.gicleurs,
  has_elevators:   (c)     => !!c?.ascenseurs,
  has_hazmat:      (c)     => !!c?.matieresDangereuses,
  has_lithium:     (c)     => !!c?.batteriesLithium,
  boma_certified:  (c)     => !!c?.certBOMA,
  has_pool:        (c)     => !!c?.piscine,
  has_kitchen:     (c)     => !!c?.cuisineCommerciale,
  manual:          ()      => false, // Jamais auto — seulement via bibliothèque
};

// ============================================================
// FONCTION PRINCIPALE
// Retourne les procédures actives selon config + rôles actifs
// ============================================================

export function getActiveProcedures(
  config: any,
  documentType: string,
  activeRoleCodes: string[],
): ProcedureTemplate[] {
  return PROCEDURES_REGISTRY
    .filter(p => {
      // 1. Filtre par type de document
      if (!p.documentTypes.includes(documentType)) return false;

      // 2. Filtre par règle d'activation
      const rule = ACTIVATION_RULES[p.activationRule];
      if (!rule) return true;
      return rule(config);
    })
    .map(p => ({
      ...p,
      // 3. Filtre les sections de rôles selon les rôles actifs dans Module 3
      roleSections: p.roleSections.filter(rs =>
        rs.roleCode === 'TOUS' ||
        activeRoleCodes.includes(rs.roleCode)
      ),
    }));
}

// ============================================================
// FONCTION — Retourne toute la bibliothèque (pour l'UI)
// ============================================================

export function getAllProcedures(): ProcedureTemplate[] {
  return PROCEDURES_REGISTRY;
}

// ============================================================
// FONCTION — Trouve une procédure par ID
// ============================================================

export function getProcedureById(id: string): ProcedureTemplate | undefined {
  return PROCEDURES_REGISTRY.find(p => p.id === id);
}

// ============================================================
// RE-EXPORTS pour usage externe
// ============================================================

export type { ProcedureTemplate, ProcedureStep, RoleSection } from './types';