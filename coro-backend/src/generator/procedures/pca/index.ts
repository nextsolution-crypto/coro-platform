// ============================================================
// CORO — Registre central de la bibliothèque de procédures PCA
// Pour ajouter une procédure : importer + ajouter au registre
// ============================================================
import { ProcedureTemplate } from '../types';
import { PC001_ACTIVATION_PCA } from './pc001_activation_pca';
import { PC002_CELLULE_GESTION_INCIDENT } from './pc002_cellule_gestion_incident';
import { PC003_JOURNAL_DE_BORD } from './pc003_journal_de_bord';
import { PC004_RAPPORT_SITUATION } from './pc004_rapport_situation';
import { PC005_RAPPORT_POST_INCIDENT } from './pc005_rapport_post_incident';
import { PC011_SINISTRE_BATIMENT } from './pc011_sinistre_batiment';
import { PC012_CYBERINCIDENT } from './pc012_cyberincident';
import { PC013_PANDEMIE } from './pc013_pandemie';
import { PC014_PANNE_ELECTRIQUE } from './pc014_panne_electrique';
import { PC015_PERTE_FOURNISSEUR } from './pc015_perte_fournisseur';
import { PC016_PERTE_EMPLOYE_CLE } from './pc016_perte_employe_cle';
import { PC021_RETOUR_NORMAL } from './pc021_retour_normal';
import { PC022_VERIFICATION_TI } from './pc022_verification_ti';
import { PC023_COMMUNICATION_POST_INCIDENT } from './pc023_communication_post_incident';

// ── Registre complet des procédures PCA ──
export const PCA_PROCEDURES_REGISTRY: ProcedureTemplate[] = [
  PC001_ACTIVATION_PCA,
  PC002_CELLULE_GESTION_INCIDENT,
  PC003_JOURNAL_DE_BORD,
  PC004_RAPPORT_SITUATION,
  PC005_RAPPORT_POST_INCIDENT,
  PC011_SINISTRE_BATIMENT,
  PC012_CYBERINCIDENT,
  PC013_PANDEMIE,
  PC014_PANNE_ELECTRIQUE,
  PC015_PERTE_FOURNISSEUR,
  PC016_PERTE_EMPLOYE_CLE,
  PC021_RETOUR_NORMAL,
  PC022_VERIFICATION_TI,
  PC023_COMMUNICATION_POST_INCIDENT,
];

// ── Helpers ──
export function getAllPcaProcedures(): ProcedureTemplate[] {
  return PCA_PROCEDURES_REGISTRY;
}

export function getActivePcaProcedures(riskScenarios: any[]): ProcedureTemplate[] {
  const scenarioIds = (riskScenarios || []).map((r: any) => r.id);

  return PCA_PROCEDURES_REGISTRY.filter(p => {
    // Toujours actives
    if (p.activationRule === 'always') return true;
    // Selon les scénarios de risque identifiés
    if (p.activationRule === 'has_sinistre' && scenarioIds.includes('sinistre')) return true;
    if (p.activationRule === 'has_cyber' && scenarioIds.includes('cyber')) return true;
    if (p.activationRule === 'has_pandemie' && scenarioIds.includes('pandemie')) return true;
    if (p.activationRule === 'has_electrique' && scenarioIds.includes('electrique')) return true;
    if (p.activationRule === 'has_fournisseur' && scenarioIds.includes('fournisseur')) return true;
    if (p.activationRule === 'has_personnel' && scenarioIds.includes('personnel')) return true;
    return false;
  });
}