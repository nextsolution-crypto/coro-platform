// ============================================================
// CORO — Registre central de la bibliothèque de procédures
// Pour ajouter une procédure : importer + ajouter au registre
// ============================================================

import type { ActivationRule, ProcedureTemplate } from './types';

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
import { P024_INONDATIONS } from './p024_inondations';
import { P025_VERGLAS } from './p025_verglas';
import { P026_BATTERIE_LITHIUM } from './p026_batterie_lithium';
import { P027_NOYADE } from './p027_noyade';
import { P028_INCENDIE_CUISINE } from './p028_incendie_cuisine';

import { P101_ALERTE_INCENDIE_IND } from './p101_alerte_incendie_ind';
import { P102_ALARME_INCENDIE_IND } from './p102_alarme_incendie_ind';
import { P103_FUITE_GAZ_IND } from './p103_fuite_gaz_ind';
import { P104_FUITE_AMMONIAC_IND } from './p104_fuite_ammoniac_ind';
import { P105_EXPOSITION_AMMONIAC_IND } from './p105_exposition_ammoniac_ind';
import { P106_URGENCE_MEDICALE_IND } from './p106_urgence_medicale_ind';
import { P107_DEVERSEMENT_MATDANG_IND } from './p107_deversement_matdang_ind';
import { P108_BRIS_GICLEUR_IND } from './p108_bris_gicleur_ind';

import { P111_DECOUVERTE_FUMEE_OCC } from './p111_decouverte_fumee_occ';
import { P112_ALERTE_INCENDIE_OCC } from './p112_alerte_incendie_occ';
import { P113_ALARME_INCENDIE_OCC } from './p113_alarme_incendie_occ';
import { P114_BATTERIE_LITHIUM_OCC } from './p114_batterie_lithium_occ';
import { P115_FUITE_AMMONIAC_OCC } from './p115_fuite_ammoniac_occ';
import { P116_EXPOSITION_AMMONIAC_OCC } from './p116_exposition_ammoniac_occ';
import { P117_ALARME_OXYGENE_OCC } from './p117_alarme_oxygene_occ';
import { P118_ALARME_CO2_OCC } from './p118_alarme_co2_occ';
import { P119_URGENCE_MEDICALE_OCC } from './p119_urgence_medicale_occ';
import { P120_PANNE_COURANT_OCC } from './p120_panne_courant_occ';
import { P121_ASCENSEUR_OCC } from './p121_ascenseur_occ';
import { P122_DEVERSEMENT_MATDANG_OCC } from './p122_deversement_matdang_occ';

// ============================================================
// REGISTRE OFFICIEL
// Ordre = ordre d'affichage par défaut dans le document
// ============================================================

export const PROCEDURES_REGISTRY: ProcedureTemplate[] = [
  // ── Procédures générales ──────────────────────────────────
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
  P024_INONDATIONS,
  P025_VERGLAS,
  P026_BATTERIE_LITHIUM,
  P027_NOYADE,
  P028_INCENDIE_CUISINE,

  // ── Procédures industrielles ──────────────────────────────
  P101_ALERTE_INCENDIE_IND,
  P102_ALARME_INCENDIE_IND,
  P103_FUITE_GAZ_IND,
  P104_FUITE_AMMONIAC_IND,
  P105_EXPOSITION_AMMONIAC_IND,
  P106_URGENCE_MEDICALE_IND,
  P107_DEVERSEMENT_MATDANG_IND,
  P108_BRIS_GICLEUR_IND,

  // ── Procédures industrielles — occupants ──────────────────
  P111_DECOUVERTE_FUMEE_OCC,
  P112_ALERTE_INCENDIE_OCC,
  P113_ALARME_INCENDIE_OCC,
  P114_BATTERIE_LITHIUM_OCC,
  P115_FUITE_AMMONIAC_OCC,
  P116_EXPOSITION_AMMONIAC_OCC,
  P117_ALARME_OXYGENE_OCC,
  P118_ALARME_CO2_OCC,
  P119_URGENCE_MEDICALE_OCC,
  P120_PANNE_COURANT_OCC,
  P121_ASCENSEUR_OCC,
  P122_DEVERSEMENT_MATDANG_OCC,
];

// ============================================================
// HELPERS D'ACTIVATION
// ============================================================

function asBool(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }

  if (
    value === false ||
    value === 0 ||
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return false;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (
      ['true', 'oui', 'yes', '1', 'on', 'o', 'y'].includes(normalized)
    ) {
      return true;
    }

    if (
      ['false', 'non', 'no', '0', 'off', 'n'].includes(normalized)
    ) {
      return false;
    }
  }

  return Boolean(value);
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

// ============================================================
// CONTEXTE DU BÂTIMENT
// ============================================================

function isIndustrialBuilding(config: any): boolean {
  const value = normalize(config?.buildingType);

  return [
    'industriel',
    'industrial',
    'industrie',
  ].includes(value);
}

// ============================================================
// RISQUES / SYSTÈMES
// ============================================================

function hasLithiumRisk(config: any): boolean {
  return (
    asBool(config?.batteriesLithium) ||
    asBool(config?.batteriesLithiumPresent)
  );
}

function hasHazmat(config: any): boolean {
  return (
    asBool(config?.matieresDangereuses) ||
    hasNonEmptyArray(config?.matieresList)
  );
}

function hasAmmonia(config: any): boolean {
  return (
    asBool(config?.ammoniac) ||
    asBool(config?.detecteurAmmoniac)
  );
}

function hasGas(config: any): boolean {
  return (
    asBool(config?.gazNaturel) ||
    asBool(config?.detecteurGazNaturel)
  );
}

function hasSprinklers(config: any): boolean {
  return (
    asBool(config?.gicleurs) ||
    hasNonEmptyArray(config?.gicleursSystemes)
  );
}

function hasElevators(config: any): boolean {
  return (
    asBool(config?.ascenseurs) ||
    Number(config?.nbAscenseurs ?? 0) > 0
  );
}

function hasOxygenDetection(config: any): boolean {
  return asBool(config?.detecteurO2);
}

function hasCO2Detection(config: any): boolean {
  return asBool(config?.detecteurCO2);
}

// ============================================================
// RÈGLES D'ACTIVATION AUTOMATIQUE
// ============================================================

type ActivationPredicate = (config: any) => boolean;

export const ACTIVATION_RULES: Record<
  ActivationRule,
  ActivationPredicate
> = {
  // ==========================================================
  // RÈGLES GÉNÉRALES
  // ==========================================================

  always: () => true,

  double_signal: (c) =>
    normalize(c?.panneauType) === 'double',

  simple_signal: (c) =>
    normalize(c?.panneauType) === 'simple',

  // ==========================================================
  // RISQUES / SYSTÈMES PRÉSENTS
  // ==========================================================

  has_gas: (c) =>
    hasGas(c),

  has_ammonia: (c) =>
    hasAmmonia(c),

  has_sprinklers: (c) =>
    hasSprinklers(c),

  has_elevators: (c) =>
    hasElevators(c),

  has_hazmat: (c) =>
    hasHazmat(c),

  has_lithium: (c) =>
    hasLithiumRisk(c),

  has_oxygen_detection: (c) =>
    hasOxygenDetection(c),

  has_co2_detection: (c) =>
    hasCO2Detection(c),

  // ==========================================================
  // CERTIFICATIONS / CARACTÉRISTIQUES
  // ==========================================================

  boma_certified: (c) =>
    asBool(c?.certBOMA),

  // Compatibilité avec les projets utilisant ces champs.
  // Ces données ne font pas actuellement partie de toutes les
  // configurations CORO.
  has_pool: (c) =>
    asBool(c?.piscine),

  has_kitchen: (c) =>
    asBool(c?.cuisineCommerciale),

  // ==========================================================
  // ACTIVATION MANUELLE
  // ==========================================================

  // Jamais activée automatiquement.
  // Disponible uniquement via sélection manuelle.
  manual: () => false,

  // ==========================================================
  // CONTEXTE INDUSTRIEL
  // ==========================================================

  is_industrial: (c) =>
    isIndustrialBuilding(c),

  // ==========================================================
  // RÈGLES INDUSTRIELLES COMPOSÉES
  // ==========================================================

  // Industriel + système d'alarme à double signal.
  industrial_with_double_signal: (c) =>
    isIndustrialBuilding(c) &&
    normalize(c?.panneauType) === 'double',

  // Industriel + gaz naturel / détection gaz naturel.
  industrial_with_gas: (c) =>
    isIndustrialBuilding(c) &&
    hasGas(c),

  // Industriel + ammoniac / détection ammoniac.
  industrial_with_ammonia: (c) =>
    isIndustrialBuilding(c) &&
    hasAmmonia(c),

  // Industriel + matières dangereuses.
  industrial_with_hazmat: (c) =>
    isIndustrialBuilding(c) &&
    hasHazmat(c),

  // Industriel + système de gicleurs.
  industrial_with_sprinklers: (c) =>
    isIndustrialBuilding(c) &&
    hasSprinklers(c),

  // Industriel + risque lithium.
  industrial_with_lithium: (c) =>
    isIndustrialBuilding(c) &&
    hasLithiumRisk(c),

  // Industriel + détection d'oxygène.
  industrial_with_oxygen_detection: (c) =>
    isIndustrialBuilding(c) &&
    hasOxygenDetection(c),

  // Industriel + détection de CO2.
  industrial_with_co2_detection: (c) =>
    isIndustrialBuilding(c) &&
    hasCO2Detection(c),

  // Industriel + ascenseurs.
  industrial_with_elevators: (c) =>
    isIndustrialBuilding(c) &&
    hasElevators(c),
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
  const safeActiveRoleCodes = Array.isArray(activeRoleCodes)
    ? activeRoleCodes
    : [];

  return PROCEDURES_REGISTRY

    // ========================================================
    // 1. TYPE DE DOCUMENT + RÈGLE D'ACTIVATION
    // ========================================================

    .filter((procedure) => {
      // Vérifie que la procédure appartient au type de document.
      if (
        !Array.isArray(procedure.documentTypes) ||
        !procedure.documentTypes.includes(documentType)
      ) {
        return false;
      }

      // activationRule est typé par ActivationRule.
      const rule = ACTIVATION_RULES[procedure.activationRule];

      // Protection runtime pour :
      // - anciennes données;
      // - DB;
      // - migrations;
      // - objets construits dynamiquement.
      if (!rule) {
        console.warn(
          `[CORO][Procedures] Règle d'activation inconnue "${String(
            procedure.activationRule,
          )}" pour ${procedure.code} (${procedure.id}).`,
        );

        return false;
      }

      return rule(config);
    })

    // ========================================================
    // 2. FILTRAGE DES SECTIONS PAR RÔLES
    // ========================================================

    .map((procedure) => ({
      ...procedure,

      roleSections: Array.isArray(procedure.roleSections)
        ? procedure.roleSections.filter(
            (roleSection) =>
              // Section applicable à tous.
              roleSection.roleCode === 'TOUS' ||

              // ROLE-OCC est un rôle générique Occupant /
              // Travailleur et demeure disponible même s'il
              // n'est pas explicitement configuré au Module 3.
              roleSection.roleCode === 'ROLE-OCC' ||

              // Rôle réellement actif dans l'organisation
              // d'urgence du projet.
              safeActiveRoleCodes.includes(roleSection.roleCode),
          )
        : [],
    }))

    // ========================================================
    // 3. ÉLIMINATION DES PROCÉDURES SANS CONTENU APPLICABLE
    // ========================================================

    .filter((procedure) => {
      // Certaines procédures peuvent contenir du contenu global
      // indépendant des rôles.
      // Exemple : P001 — Directives générales.
      const hasGeneralDirectives =
        Array.isArray(procedure.directivesGenerales) &&
        procedure.directivesGenerales.length > 0;

      const hasApplicableRoleSections =
        Array.isArray(procedure.roleSections) &&
        procedure.roleSections.length > 0;

      return (
        hasGeneralDirectives ||
        hasApplicableRoleSections
      );
    });
}

// ============================================================
// FONCTION — Retourne toute la bibliothèque
// Utilisée notamment par l'interface de sélection manuelle
// ============================================================

export function getAllProcedures(): ProcedureTemplate[] {
  return PROCEDURES_REGISTRY;
}

// ============================================================
// FONCTION — Trouve une procédure par ID
// ============================================================

export function getProcedureById(
  id: string,
): ProcedureTemplate | undefined {
  return PROCEDURES_REGISTRY.find(
    (procedure) => procedure.id === id,
  );
}

// ============================================================
// RE-EXPORTS POUR USAGE EXTERNE
// ============================================================

export type {
  ActivationRule,
  ProcedureTemplate,
  ProcedureStep,
  RoleSection,
} from './types';