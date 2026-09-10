import { Injectable } from '@nestjs/common';

export interface BuildingConfig {
  // ========== DESCRIPTION GÉNÉRALE ==========
  buildingType: string;
  usagePrincipal: string;
  usageSecondaire?: string;
  floors: number;
  basements: number;
  superficie?: number;
  anneeConstruction?: number | string; // Select retourne une string côté frontend
  derniereRenovation?: string;         // 'Aucune' ou ex: '2015'
  typeConstruction?: string;
  hauteurBatiment?: 'STANDARD' | 'GRANDE_HAUTEUR';

  // ========== CNPI 2020 — APPLICABILITÉ PSI (T1 + T3) ==========
  province?: string;
  capaciteMaxReglementaire?: number;
  traitementsMedicauxSurPlace?: boolean;

  // ========== CNPI 2020 — T5 Systèmes intégrés S1001 ==========
  s1001Interconnexions?: string[];
  s1001DernierEssai?: string;
  s1001RapportDisponible?: boolean;
  s1001Coordonnateur?: string;

  // ========== CNPI 2020 — T9 PPNAE enrichi ==========
  ppnaeTypesLimitations?: string[];
  ppnaeMesures?: string[];
  ppnaeRegistreAJour?: boolean;

  // ========== CNPI 2020 — T10 Matières dangereuses ==========
  psiEntreePrincipale?: boolean;

  // ========== CNPI 2020 — T2 Checklist PSI ==========
  programmeInspectionEntretien?: boolean;

  // ========== CNPI 2020 — T6 Travaux par points chauds ==========
  travauxPointsChauds?: string;
  permisTravauxChauds?: boolean;
  surveillanceIncendieTPC?: boolean;
  inspectionFinaleDocumentee?: boolean;
  methodeInspectionTPC?: string;
  travauxToiture?: boolean;

  // ========== CNPI 2020 — T7 Laboratoires ==========
  laboratoirePresent?: boolean;
  typeLaboratoire?: string[];
  gazComprimesPresents?: boolean;
  armireCabinetVentile?: boolean;
  gazToxiquesPresents?: boolean;
  detectionGazLabo?: boolean;
  panneauxTMDLabo?: boolean;

  // ========== CNPI 2020 — T11 Registres coupe-feu ==========
  registresCoupeFeu?: boolean;
  registresCoupeFeuNombre?: number;
  registresCoupeFeuDerniereInspection?: string;
  registresCoupeFeuRapport?: boolean;

  // ========== CNPI 2020 — T12 Signalisation d'issue ==========
  signalisationIssue?: boolean;
  signalisationIssueType?: string;
  signalisationIssueDerniereInspection?: string;

  // ========== CNPI 2020 — T13 Obstruction portes d'issue ==========
  portesIssueExposees?: boolean;
  portesIssueMesure?: string;

  // Occupation
  multiLocataires: boolean;
  nbLocataires?: number;
  occupationJour: boolean;
  occupationSoir: boolean;
  occupationNuit: boolean;
  personnelHandicap: boolean;
  lieuSommeil: boolean;

  // Sécurité
  securite24h: boolean;
  agentSecurite: boolean;
  posteSurveillance: boolean;

  // Emplacements stratégiques
  posteCommandement?: string;
  pointRassemblement?: string;
  lieuAccueilTemporaire?: string;
  salleGicleurs?: string;
  salleElectrique?: string;

  // ========== ALARME INCENDIE ==========
  panneauAlarme: boolean;
  panneauType: 'SIMPLE' | 'DOUBLE' | 'AUCUN';
  panneauMarque?: string;
  panneauModele?: string;
  panneauAnnonciateurDistance: boolean;
  teleSurveillance: boolean;
  centraleSurveillance?: string;
  telephonePompier: boolean;
  stationManuelle: boolean;

  // Détecteurs
  detecteurFumee: boolean;
  detecteurChaleur: boolean;
  detecteurDebitGicleurs: boolean;

  // Relais auxiliaires
  rappelAscenseurs: boolean;
  arretVentilation: boolean;
  desenfumageAutomatique: boolean;
  deverrouillagePorces: boolean;
  fermeturePortesCoupeFeu: boolean;

  // Communication
  systemePhonicAutomatise: boolean;
  systemePhonic: boolean;
  messagesAutomatises: boolean;
  radiosCommunication: boolean;
  intercomUrgence: boolean;

  // ========== GICLEURS & PROTECTION EAU ==========
  gicleurs: boolean;
  gicleursComplet: boolean;
  gicleursPartiel: boolean;
  typeGicleurs?: string;
  salleGicleursLocalisation?: string;
  pompeIncendie: boolean;
  gapmUsgpm: boolean;
  boyauIncendie: boolean;
  priseRefoulement: boolean;
  raccordPompier: boolean;
  bornesFontaine: boolean;
  vannesIsolement: boolean;

  // ========== EXTINCTEURS ==========
  extincteurPortatif: boolean;
  typesExtincteurs?: string[];
  systemeExctinctionSpecial?: boolean;
  systemeExctinctionType?: string;
  systemeHotte: boolean;
  systemeHalogen: boolean;
  systemeCO2: boolean;

  // ========== MÉCANIQUE ==========
  ascenseurs: boolean;
  nbAscenseurs?: number;
  ascenseurPompier: boolean;
  typeAscenseur?: string;
  salleAscenseur?: string;
  escaliersPressurises: boolean;
  nbEscaliers?: number;

  // CVAC
  cvac: boolean;
  typeChautfage?: string;
  typeRefroidissement?: string;
  desenfumage: boolean;
  extractionFumee: boolean;

  // Électrique
  generatrice: boolean;
  typeGeneratrice?: string;
  autonomieGeneratrice?: number;
  capaciteReservoir?: number;
  equipementsSecours?: string[];
  salleElectriqueLocalisation?: string;

  // Gaz
  gazNaturel: boolean;
  localisationEntreeGaz?: string;
  propane: boolean;

  // ========== DÉTECTEURS DE GAZ ==========
  detecteurCO: boolean;
  detecteurCOSeuil1?: number;
  detecteurCOSeuil2?: number;
  detecteurGazNaturel: boolean;
  detecteurPropane: boolean;
  detecteurAmmoniac: boolean;
  detecteurFreon: boolean;
  detecteurO2: boolean;
  detecteurFM200: boolean;
  detecteurCO2: boolean;

  // ========== MATIÈRES DANGEREUSES ==========
  matieresDangereuses: boolean;
  diesel: boolean;
  ammoniac: boolean;
  batteriesLithium: boolean;
  fm200: boolean;
  autresMatieres?: string[];
  trousseDeversement: boolean;

  // ========== ÉQUIPEMENTS PREMIERS SOINS ==========
  trousseSecoursPresente: boolean;
  defibrillateur: boolean;
  doucheOculaire: boolean;

  // ========== SPÉCIFIQUE INDUSTRIEL ==========
  espaceClos: boolean;
  chariotsElevateurs: boolean;
  palettiers: boolean;
  mezzanine: boolean;
  travailChaud: boolean;
  procesDangereux: boolean;
  systemeCadenassage: boolean;

  // ========== CERTIFICATIONS ==========
  certBOMA: boolean;
  certLEED: boolean;
  certISO22301: boolean;
  certISO31000: boolean;
  certEnergyStar: boolean;
  autresCertifications?: string[];
}

// ── Profil réglementaire CNPI 2020 (T3 + T1 + T8) ──────────────────────────

export interface ProfilReglementaire {
  referentielCNB: string;            // T3 — référentiel de construction
  referentielAnnee: string;          // T3 — période couverte
  codeSurveillance: string;          // T3 — code de sécurité applicable
  periodeTransitoire: string;        // T3 — période transitoire en vigueur
  exceptionS1001: string;            // T3 — exception art. 2.1.3.7
  psiRequis: 'OUI' | 'EXEMPTE' | 'VERIFICATION_REQUISE';  // T1
  psiRaisonCode: string;             // T1 — code de la règle déclenchée
  psiRaisonMessage: string;          // T1 — message affiché
  frequenceExercices: string;        // T8 — fréquence calculée
  frequenceExercicesBase: string;    // T8 — base réglementaire
}

export interface ValidationResult {
  type: 'INFO' | 'RECOMMANDATION' | 'AVERTISSEMENT' | 'ERREUR' | 'CRITIQUE';
  code: string;
  message: string;
  reference?: string;
}

export interface ConfiguratorResult {
  rolesActives: string[];
  rolesRecommandes: string[];
  proceduresActives: string[];
  sectionsDocument: string[];
  validations: ValidationResult[];
  score: number;
  profilReglementaire?: ProfilReglementaire;  // ← NOUVEAU
}

@Injectable()
export class RulesEngineService {

  analyzeConfiguration(config: BuildingConfig): ConfiguratorResult {
    const result: ConfiguratorResult = {
      rolesActives: [],
      rolesRecommandes: [],
      proceduresActives: [],
      sectionsDocument: [],
      validations: [],
      score: 0,
    };

    // ── CNPI 2020 — doit être exécuté en premier (génère profilReglementaire) ──
    this.applyReglementaireRules(config, result);
    this.applyS1001Rules(config, result);                    // T5
    this.applyMatieresDangereusesRules(config, result);      // T10
    this.applyPsiChecklistRules(config, result);             // T2 — après T1
    this.applyPointsChaudsRules(config, result);             // T6
    this.applyLaboratoireRules(config, result);              // T7
    this.applyRegistresCoupeFeuRules(config, result);        // T11
    this.applySignalisationIssueRules(config, result);       // T12
    this.applyPortesIssueRules(config, result);              // T13

    this.applyBaseRules(config, result);
    this.applyAlarmRules(config, result);
    this.applyGicleurRules(config, result);
    this.applyExtincteurRules(config, result);
    this.applyMechanicalRules(config, result);
    this.applyHazardRules(config, result);
    this.applyIndustrialRules(config, result);
    this.applyOccupancyRules(config, result);
    this.applyCommunicationRules(config, result);
    this.applyCertificationRules(config, result);
    this.applySectionRules(config, result);
    this.applyValidations(config, result);
    this.calculateScore(config, result);

    result.rolesActives = [...new Set(result.rolesActives)];
    result.rolesRecommandes = [...new Set(
      result.rolesRecommandes.filter(r => !result.rolesActives.includes(r))
    )];
    result.proceduresActives = [...new Set(result.proceduresActives)];
    result.sectionsDocument = [...new Set(result.sectionsDocument)];

    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CNPI 2020 — Règles réglementaires (T3 Profil · T1 PSI · T8 Exercices)
  // ══════════════════════════════════════════════════════════════════════════

  private applyReglementaireRules(config: BuildingConfig, result: ConfiguratorResult): void {
    const annee = this.parseAnneeConstruction(config.anneeConstruction);
    const profil = this.computeProfilReglementaire(config, annee);
    result.profilReglementaire = profil;

    // T1 — Validation PSI dans le panneau
    this.addPsiValidation(profil, result);

    // T8 — Information fréquence exercices dans le panneau
    result.validations.push({
      type: 'INFO',
      code: 'CNPI2020-T8-EXERCICES',
      message: `Exercices d'incendie : ${profil.frequenceExercices} — ${profil.frequenceExercicesBase}`,
      reference: 'CNPI 2020 art. 2.8.3.2',
    });
  }

  private parseAnneeConstruction(raw?: number | string): number {
    if (!raw) return 0;
    const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    return isNaN(n) ? 0 : n;
  }

  private computeProfilReglementaire(config: BuildingConfig, annee: number): ProfilReglementaire {
    // ── T3 — Référentiel CNB (art. 344, tableau mis à jour) ─────────────────
    const { referentielCNB, referentielAnnee } = this.getReferentielCNB(annee);

    // ── T1 — Applicabilité PSI ──────────────────────────────────────────────
    const psiResult = this.computePsiRequis(config);

    // ── T8 — Fréquence exercices ────────────────────────────────────────────
    const { frequence, base } = this.computeFrequenceExercices(config);

    return {
      referentielCNB,
      referentielAnnee,
      codeSurveillance: 'CNPI 2020 modifié Québec (Chap. VIII, Code de sécurité)',
      periodeTransitoire: 'Ancienne version applicable jusqu\'au ~17 oct. 2027 (décret 1353-2026, effectif 10 sept. 2026)',
      exceptionS1001: 'Essais intégrés S1001 requis à compter du 17 avril 2028 pour bâtiments existants (art. 2.1.3.7)',
      psiRequis: psiResult.statut,
      psiRaisonCode: psiResult.code,
      psiRaisonMessage: psiResult.message,
      frequenceExercices: frequence,
      frequenceExercicesBase: base,
    };
  }

  private getReferentielCNB(annee: number): { referentielCNB: string; referentielAnnee: string } {
    // Source : art. 344, Code de sécurité du Québec (décret 438-2025)
    // Les bornes sont par année entière — pour les années-charnières,
    // la date exacte de construction peut modifier le référentiel applicable.
    if (annee === 0) {
      return {
        referentielCNB: 'Non déterminé',
        referentielAnnee: 'Renseigner l\'année de construction',
      };
    }
    if (annee < 1976) {
      return {
        referentielCNB: 'Règlement sur la sécurité dans les édifices publics',
        referentielAnnee: 'Avant le 1er décembre 1976',
      };
    }
    if (annee <= 1983) {
      return {
        referentielCNB: 'Code du bâtiment (R.R.Q., 1981, c. S-3, r. 2)',
        referentielAnnee: '1976–1984',
      };
    }
    if (annee <= 1985) {
      return {
        referentielCNB: 'CNB 1980',
        referentielAnnee: '1984–1986 ⚠ vérifier la date exacte',
      };
    }
    if (annee <= 1993) {
      return {
        referentielCNB: 'CNB 1985 modifié Québec',
        referentielAnnee: '1986–1993',
      };
    }
    if (annee <= 2000) {
      return {
        referentielCNB: 'CNB 1990 modifié Québec',
        referentielAnnee: '1993–2000',
      };
    }
    if (annee <= 2008) {
      return {
        referentielCNB: 'CNB 1995 modifié Québec',
        referentielAnnee: '2000–2008',
      };
    }
    if (annee <= 2015) {
      return {
        referentielCNB: 'CNB 2005 modifié Québec',
        referentielAnnee: '2008–2015',
      };
    }
    if (annee <= 2021) {
      return {
        referentielCNB: 'CNB 2010 modifié Québec',
        referentielAnnee: '2015–2022',
      };
    }
    if (annee <= 2024) {
      return {
        referentielCNB: 'CNB 2015 modifié Québec',
        referentielAnnee: '2022–2025 ⚠ vérifier la date exacte (pivot : 17 avr. 2025)',
      };
    }
    return {
      referentielCNB: 'CNB 2020 modifié Québec',
      referentielAnnee: 'Depuis le 17 avril 2025',
    };
  }

  private computePsiRequis(config: BuildingConfig): {
    statut: 'OUI' | 'EXEMPTE' | 'VERIFICATION_REQUISE';
    code: string;
    message: string;
  } {
    const usage = (config.usagePrincipal || '').trim();
    const capacite = config.capaciteMaxReglementaire || 0;
    const traitements = config.traitementsMedicauxSurPlace || false;

    if (!usage) {
      return {
        statut: 'VERIFICATION_REQUISE',
        code: 'PSI-USAGE-MANQUANT',
        message: 'Usage principal non renseigné — impossible de déterminer l\'applicabilité du PSI',
      };
    }

    // Groupe B — toujours requis (détention, traitement, soins)
    if (usage.startsWith('B')) {
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-B',
        message: 'PSI requis — usage du groupe B (détention, traitement ou soins)',
      };
    }

    // Usage D (affaires) avec traitements médicaux → requis
    if (usage.startsWith('D') && traitements) {
      return {
        statut: 'OUI',
        code: 'PSI-D-TRAITEMENTS',
        message: 'PSI requis — usage D avec traitements médicaux pouvant empêcher l\'évacuation autonome (CNPI 2020 art. 2.8.1.1)',
      };
    }

    // Usage D sans traitements → à vérifier
    if (usage.startsWith('D')) {
      return {
        statut: 'VERIFICATION_REQUISE',
        code: 'PSI-D-STANDARD',
        message: 'Usage D — confirmer si des traitements médicaux sont offerts sur place; sinon vérifier autres conditions d\'applicabilité',
      };
    }

    // Groupe A — seuil 30 personnes avec exceptions
    if (usage.startsWith('A')) {
      // A1 (spectacle) et A3 (aréna) — jamais exemptés
      if (usage.startsWith('A1') || usage.startsWith('A3') || usage.startsWith('A4')) {
        return {
          statut: 'OUI',
          code: 'PSI-GROUPE-A-TOUJOURS',
          message: 'PSI requis — établissement de réunion non admissible à l\'exemption (spectacle, aréna, plein air)',
        };
      }
      // A2 peut contenir école, garderie, débit de boisson, restaurant → jamais exemptés
      if (usage.startsWith('A2')) {
        return {
          statut: 'OUI',
          code: 'PSI-GROUPE-A2',
          message: 'PSI requis — usage A2 (éducation, culte, divertissement, restauration)',
        };
      }
      // Groupe A générique — vérifier capacité
      if (capacite === 0) {
        return {
          statut: 'VERIFICATION_REQUISE',
          code: 'PSI-GROUPE-A-CAPACITE-MANQUANTE',
          message: 'Usage A — renseigner la capacité maximale réglementaire pour vérifier l\'exemption ≤30 personnes (art. 2.8.1.1)',
        };
      }
      if (capacite <= 30) {
        return {
          statut: 'EXEMPTE',
          code: 'PSI-GROUPE-A-EXEMPT',
          message: `PSI non requis — établissement de réunion de ${capacite} personne${capacite > 1 ? 's' : ''} (exemption ≤30 personnes, art. 2.8.1.1)`,
        };
      }
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-A-CAPACITE',
        message: `PSI requis — établissement de réunion de plus de 30 personnes (capacité déclarée : ${capacite})`,
      };
    }

    // C (habitation)
    if (usage.startsWith('C')) {
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-C',
        message: 'PSI requis — établissement d\'habitation (usage C)',
      };
    }

    // E (commercial)
    if (usage.startsWith('E')) {
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-E',
        message: 'PSI requis — établissement commercial (usage E)',
      };
    }

    // F (industriel)
    if (usage.startsWith('F')) {
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-F',
        message: 'PSI requis — établissement industriel (usage F)',
      };
    }

    return {
      statut: 'VERIFICATION_REQUISE',
      code: 'PSI-INCONNU',
      message: 'Applicabilité du PSI à vérifier selon l\'usage déclaré',
    };
  }

  private computeFrequenceExercices(config: BuildingConfig): { frequence: string; base: string } {
    const usage = (config.usagePrincipal || '').trim();

    // Groupe B ou lieu de sommeil → 6 mois
    if (usage.startsWith('B') || config.lieuSommeil) {
      return {
        frequence: 'Tous les 6 mois',
        base: 'Usage B ou lieu de sommeil (art. 2.8.3.2 a)',
      };
    }

    // Grande hauteur (sauf C) → 6 mois
    if (config.hauteurBatiment === 'GRANDE_HAUTEUR' && !usage.startsWith('C')) {
      return {
        frequence: 'Tous les 6 mois',
        base: 'Bâtiment grande hauteur, usage non résidentiel (art. 2.8.3.2 c)',
      };
    }

    // A1 (spectacle/assemblée) → 3 mois
    if (usage.startsWith('A1')) {
      return {
        frequence: 'Tous les 3 mois',
        base: 'Usage A, division 1 — établissement de spectacle (art. 2.8.3.2 d)',
      };
    }

    // A2 → école/garderie → 2×/an (automne + printemps)
    if (usage.startsWith('A2')) {
      return {
        frequence: '2 fois par an (automne et printemps)',
        base: 'Usage A2 — école ou garderie inclus (art. 2.8.3.2 b)',
      };
    }

    // Laboratoire hors école → 3 mois (sera enrichi en T7, Sprint 2)
    // Default → 12 mois
    return {
      frequence: 'Tous les 12 mois',
      base: 'Fréquence standard (art. 2.8.3.2)',
    };
  }

  private addPsiValidation(profil: ProfilReglementaire, result: ConfiguratorResult): void {
    const typeMap: Record<string, ValidationResult['type']> = {
      OUI:                  'INFO',
      EXEMPTE:              'INFO',
      VERIFICATION_REQUISE: 'AVERTISSEMENT',
    };
    result.validations.push({
      type: typeMap[profil.psiRequis] || 'AVERTISSEMENT',
      code: profil.psiRaisonCode,
      message: profil.psiRaisonMessage,
      reference: 'CNPI 2020 art. 2.8.1.1',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Règles existantes (inchangées sauf mise à jour des références CNPI 2020)
  // ══════════════════════════════════════════════════════════════════════════

  private applyBaseRules(config: BuildingConfig, result: ConfiguratorResult) {
    result.rolesActives.push('ROLE-CU');
    result.rolesActives.push('ROLE-RPR');
    result.rolesActives.push('ROLE-RM');
    result.proceduresActives.push('PROC-DECOUVERTE-FEU');
    result.proceduresActives.push('PROC-EVACUATION-GENERALE');
    result.proceduresActives.push('PROC-URGENCE-MEDICALE');

    if (config.agentSecurite || config.securite24h) {
      result.rolesActives.push('ROLE-AS');
      result.proceduresActives.push('PROC-AGENT-SECURITE-ALERTE');
      result.proceduresActives.push('PROC-AGENT-SECURITE-ALARME');
    }

    if (config.personnelHandicap) {
      result.rolesActives.push('ROLE-ACC');
      result.validations.push({
        type: 'INFO',
        code: 'HANDICAP-001',
        message: 'Personnes nécessitant assistance déclarées : registre PPNAE requis et accompagnateur activé.',
        reference: 'CNPI 2020 art. 2.8.2.1',
      });
      // T9 — Mesures et registre PPNAE
      if (!config.ppnaeMesures || config.ppnaeMesures.length === 0) {
        result.validations.push({
          type: 'AVERTISSEMENT',
          code: 'T9-PPNAE-MESURES',
          message: 'Personnes PPNAE déclarées sans mesures d\'évacuation documentées — mesures spécifiques requises.',
          reference: 'CNPI 2020 art. 2.8.2.1',
        });
      }
      if (config.ppnaeRegistreAJour === false) {
        result.validations.push({
          type: 'AVERTISSEMENT',
          code: 'T9-PPNAE-REGISTRE',
          message: 'Registre PPNAE non maintenu à jour — requis pour la coordination avec les services d\'urgence.',
          reference: 'CNPI 2020 art. 2.8.2.1',
        });
      }
    }
  }

  private applyAlarmRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (!config.panneauAlarme) {
      result.validations.push({
        type: 'CRITIQUE',
        code: 'ALARME-001',
        message: 'Aucun panneau alarme incendie déclaré. Requis par le CNPI 2020 art. 2.8.',
        reference: 'CNPI 2020',
      });
      return;
    }

    if (config.panneauType === 'DOUBLE') {
      result.rolesActives.push('ROLE-EPI');
      result.proceduresActives.push('PROC-ALERTE-INCENDIE');
      result.proceduresActives.push('PROC-ALARME-INCENDIE');
      result.proceduresActives.push('PROC-CONTOURNEMENT-PANNEAU');
      result.validations.push({
        type: 'INFO',
        code: 'ALARME-002',
        message: 'Panneau double signal : procédures ALERTE et ALARME activées. Équipe EPI obligatoire.',
        reference: 'CNPI 2020 art. 2.8',
      });
    } else if (config.panneauType === 'SIMPLE') {
      result.proceduresActives.push('PROC-ALARME-INCENDIE');
      result.proceduresActives.push('PROC-CONTOURNEMENT-PANNEAU');
    }

    if (!config.teleSurveillance) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'ALARME-003',
        message: 'Aucune centrale de télésurveillance déclarée. Recommandé pour conformité ULC-S536.',
        reference: 'ULC-S536',
      });
    }

    if (!config.stationManuelle) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'ALARME-004',
        message: 'Aucune station manuelle d\'alarme déclarée. Vérifier la conformité.',
        reference: 'CNPI 2020',
      });
    }

    if (!config.telephonePompier) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'ALARME-005',
        message: 'Téléphone pompier non déclaré. Requis dans les bâtiments de grande hauteur.',
      });
    }
  }

  private applyGicleurRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (config.gicleurs) {
      result.proceduresActives.push('PROC-BRIS-GICLEURS');
      if (!config.pompeIncendie) {
        result.validations.push({
          type: 'RECOMMANDATION',
          code: 'GICLEUR-001',
          message: 'Gicleurs sans pompe incendie déclarée. Vérifier la configuration du réseau.',
          reference: 'NFPA 25',
        });
      }
      if (!config.vannesIsolement) {
        result.validations.push({
          type: 'RECOMMANDATION',
          code: 'GICLEUR-002',
          message: 'Vannes d\'isolement de zones non déclarées. Documenter les emplacements.',
        });
      }
    } else if (config.floors > 2) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'GICLEUR-003',
        message: 'Bâtiment de plus de 2 étages sans gicleurs déclarés. Vérifier la conformité au CNPI.',
        reference: 'CNPI 2020',
      });
    }

    if (config.boyauIncendie) {
      result.validations.push({
        type: 'INFO',
        code: 'GICLEUR-004',
        message: 'Boyaux incendie présents : inspections selon NFPA 1962 requises annuellement.',
        reference: 'NFPA 1962',
      });
    }
  }

  private applyExtincteurRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (!config.extincteurPortatif) {
      result.validations.push({
        type: 'CRITIQUE',
        code: 'EXTINCTEUR-001',
        message: 'Aucun extincteur portatif déclaré. Requis par le CNPI. Inspection annuelle NFPA 10.',
        reference: 'NFPA 10',
      });
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'EXTINCTEUR-002',
        message: 'Extincteurs portatifs présents : inspection annuelle selon NFPA 10 requise.',
        reference: 'NFPA 10',
      });
    }

    if (config.systemeHotte) {
      result.proceduresActives.push('PROC-INCENDIE-SERVICE-ALIMENTAIRE');
      result.validations.push({
        type: 'INFO',
        code: 'EXTINCTEUR-003',
        message: 'Système extinction hotte détecté : procédure incendie service alimentaire activée.',
        reference: 'NFPA 17A',
      });
    }
  }

  private applyMechanicalRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (config.ascenseurs) {
      result.proceduresActives.push('PROC-PERSONNE-COINCEE-ASCENSEUR');
      if (!config.ascenseurPompier) {
        result.validations.push({
          type: 'AVERTISSEMENT',
          code: 'ASCENSEUR-001',
          message: 'Ascenseurs sans ascenseur pompier déclaré. Requis selon le code du bâtiment.',
        });
      }
    }

    if (config.generatrice) {
      result.proceduresActives.push('PROC-PANNE-COURANT');
      const equipSecours = (config as any).equipementsSecours || (config as any).equipementsSoins || [];
      if (!equipSecours || equipSecours.length === 0) {
        result.validations.push({
          type: 'RECOMMANDATION',
          code: 'GENERATRICE-001',
          message: 'Génératrice présente : documenter les équipements fonctionnant sur alimentation de secours.',
        });
      }
    } else {
      result.proceduresActives.push('PROC-PANNE-COURANT');
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'GENERATRICE-002',
        message: 'Aucune génératrice : documenter les équipements critiques sans alimentation de secours.',
      });
    }

    if (config.gazNaturel) {
      result.proceduresActives.push('PROC-FUITE-GAZ-NATUREL');
    }

    if (config.desenfumage) {
      result.validations.push({
        type: 'INFO',
        code: 'MECANIQUE-001',
        message: 'Système désenfumage présent : documenter activation et procédure contournement.',
      });
    }
  }

  private applyHazardRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (config.matieresDangereuses) {
      result.proceduresActives.push('PROC-DEVERSEMENT-MD');
      if (!config.trousseDeversement) {
        result.validations.push({
          type: 'AVERTISSEMENT',
          code: 'MD-001',
          message: 'Matières dangereuses sans trousse de déversement déclarée. Requis SIMDUT/TMD.',
          reference: 'SIMDUT 2015',
        });
      }
    }

    if (config.batteriesLithium) {
      result.proceduresActives.push('PROC-FEU-BATTERIE-LITHIUM');
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'MD-002',
        message: 'Batteries lithium-ion : procédure spécifique activée. Extincteur eau recommandé.',
      });
    }

    if (config.ammoniac) {
      result.proceduresActives.push('PROC-FUITE-AMMONIAC');
      result.proceduresActives.push('PROC-EXPOSITION-AMMONIAC');
      if (!config.detecteurAmmoniac) {
        result.validations.push({
          type: 'CRITIQUE',
          code: 'MD-003',
          message: 'Ammoniac présent sans détecteur NH3 déclaré. CRITIQUE — risque vie humaine.',
        });
      }
    }

    if (config.detecteurCO) {
      const seuilsRemplis = config.detecteurCOSeuil1 && config.detecteurCOSeuil2;
      if (!seuilsRemplis) {
        result.validations.push({
          type: 'INFO',
          code: 'DETECTEUR-001',
          message: 'Détecteur CO : documenter seuils activation (25 ppm alarme, 150 ppm max).',
        });
      }
    }
  }

  private applyIndustrialRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (config.espaceClos) {
      result.proceduresActives.push('PROC-ESPACE-CLOS');
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'IND-001',
        message: 'Espaces clos : procédure cadenassage et programme entrée espace clos OBLIGATOIRES.',
        reference: 'LSST Québec',
      });
    }

    if (config.travailChaud) {
      result.proceduresActives.push('PROC-TRAVAIL-CHAUD');
      result.validations.push({
        type: 'INFO',
        code: 'IND-002',
        message: 'Travaux à chaud : permis travail chaud requis. Procédure et registre activés.',
        reference: 'CNPI 2020 art. 5.2',
      });
    }

    if (config.chariotsElevateurs) {
      result.validations.push({
        type: 'INFO',
        code: 'IND-003',
        message: 'Chariots élévateurs : documenter zones opération et procédures recharge batteries.',
      });
    }

    if (config.procesDangereux) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'IND-004',
        message: 'Procédés dangereux déclarés : section spécifique requise dans le document.',
      });
    }
  }

  private applyOccupancyRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (config.multiLocataires) {
      result.rolesActives.push('ROLE-RS');
      result.rolesActives.push('ROLE-BRI');
      result.rolesRecommandes.push('ROLE-CHE');
      result.sectionsDocument.push('GUIDE_LOCATAIRE');
    }

    if (config.floors > 3) {
      result.rolesActives.push('ROLE-SS');
      result.rolesRecommandes.push('ROLE-RS');
      result.rolesRecommandes.push('ROLE-CHE');
    }

    if (config.floors > 10 || config.hauteurBatiment === 'GRANDE_HAUTEUR') {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'OCCUP-001',
        message: 'Bâtiment grande hauteur : secteurs évacuation par étage recommandés. Téléphone pompier requis.',
      });
    }

    if (config.lieuSommeil) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'OCCUP-002',
        message: 'Lieu de sommeil : exigences renforcées CNPI 2020 Québec applicables.',
        reference: 'Code sécurité Québec',
      });
    }

    if (config.occupationNuit && !config.securite24h) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'OCCUP-003',
        message: 'Occupation de nuit sans sécurité 24h : évaluer la pertinence d\'une surveillance nocturne.',
      });
    }
  }

  private applyCommunicationRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (!config.systemePhonic && !config.systemePhonicAutomatise) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'COMM-001',
        message: 'Aucun système de communication phonique déclaré. Recommandé pour bâtiments multi-étages.',
      });
    }

    if (config.messagesAutomatises) {
      result.validations.push({
        type: 'INFO',
        code: 'COMM-002',
        message: 'Messages automatisés détectés : documenter les messages ALERTE et ALARME dans les annexes.',
      });
    }

    if (!config.radiosCommunication && config.floors > 5) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'COMM-003',
        message: 'Bâtiment de plus de 5 étages : radios de communication recommandées pour l\'équipe urgence.',
      });
    }
  }

  private applyCertificationRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (config.certBOMA) {
      result.sectionsDocument.push('CERTIFICATION_BOMA');
      result.validations.push({
        type: 'INFO',
        code: 'CERT-001',
        message: 'Certification BOMA BEST : exigences santé-sécurité et plan urgence intégrées à l\'évaluation.',
        reference: 'BOMA BEST',
      });
    }

    if (config.certLEED) {
      result.sectionsDocument.push('CERTIFICATION_LEED');
      result.validations.push({
        type: 'INFO',
        code: 'CERT-002',
        message: 'Certification LEED : documenter les systèmes durables impactant les procédures urgence.',
        reference: 'LEED Canada',
      });
    }

    if (config.certISO22301) {
      result.sectionsDocument.push('CERTIFICATION_ISO22301');
      result.validations.push({
        type: 'INFO',
        code: 'CERT-003',
        message: 'ISO 22301 active : sections continuité activités et plan reprise requises.',
        reference: 'ISO 22301',
      });
    }
  }

  private applySectionRules(config: BuildingConfig, result: ConfiguratorResult) {
    result.sectionsDocument.push(
      'PAGE_COUVERTURE',
      'TABLE_MATIERES',
      'INTRODUCTION',
      'OBJET_PORTEE',
      'RESPONSABILITE_CONTENU',
      'FORMATION_FREQUENCE',
      'EXERCICE_EVACUATION',
      'HISTORIQUE_MISES_JOUR',
      'DEFINITIONS_TERMES',
      'LISTE_TELEPHONIQUE',
      'NUMEROS_URGENCE',
      'RESSOURCES_INTERNES',
      'RESSOURCES_EXTERNES',
      'ROLES_RESPONSABILITES',
      'ORGANIGRAMME_URGENCE',
      'PROCEDURES_EQUIPE_URGENCE',
      'DECOUVERTE_FEU',
      'PLANS_TECHNIQUES',
      'DESCRIPTION_GENERALE',
      'MECANIQUE_BATIMENT',
      'ALARME_INCENDIE',
      'EXTINCTEUR_PORTATIF',
      'EQUIPEMENTS_PREMIERS_SOINS',
      'PHOTOS_EQUIPEMENTS',
      'REGISTRE_EVACUATION_SECTEURS',
      'REGISTRE_FORMATION',
      'RAPPORT_EVACUATION',
      'INSPECTION_EQUIPEMENTS',
    );

    if (config.gicleurs) result.sectionsDocument.push('SYSTEME_GICLEURS');
    if (config.matieresDangereuses) result.sectionsDocument.push('MATIERES_DANGEREUSES');
    if (config.detecteurCO || config.detecteurGazNaturel || config.detecteurAmmoniac)
      result.sectionsDocument.push('DETECTEURS_GAZ');
    if (config.ammoniac) result.sectionsDocument.push('PROCEDURES_AMMONIAC');
    if (config.espaceClos) result.sectionsDocument.push('ESPACE_CLOS_CADENASSAGE');
    if (config.travailChaud) result.sectionsDocument.push('PERMIS_TRAVAIL_CHAUD');
    if (config.chariotsElevateurs || config.palettiers) result.sectionsDocument.push('ENTREPOSAGE_MANUTENTION');
    if (config.procesDangereux) result.sectionsDocument.push('PROCEDES_DANGEREUX');
    if (config.messagesAutomatises || config.systemePhonic) result.sectionsDocument.push('MESSAGES_PHONIQUES');
    if (config.batteriesLithium) result.sectionsDocument.push('FEU_BATTERIE_LITHIUM');
  }

  private applyValidations(config: BuildingConfig, result: ConfiguratorResult) {
    if (!config.pointRassemblement) {
      result.validations.push({
        type: 'ERREUR',
        code: 'EMPL-001',
        message: 'Point de rassemblement non défini. Obligatoire selon CNPI 2020.',
        reference: 'CNPI 2020 art. 2.8',
      });
    }

    if (!config.posteCommandement) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'EMPL-002',
        message: 'Poste de commandement non défini. Recommandé pour coordination urgence.',
      });
    }

    const salleGicleurs = config.salleGicleurs || (config as any).salleGicleursLocalisation;
    if (!salleGicleurs && config.gicleurs) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'EMPL-003',
        message: 'Localisation salle gicleurs non documentée. À compléter.',
      });
    }

    const equipSoins = (config as any).equipementsSoins || [];
    const hasTrausse = config.trousseSecoursPresente ||
      equipSoins.some((e: any) => e.type && e.type.toLowerCase().includes('premiers soins'));
    const hasDEA = config.defibrillateur ||
      equipSoins.some((e: any) => e.type && e.type.toLowerCase().includes('dea'));

    if (!hasTrausse) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'SOINS-001',
        message: 'Trousse de premiers soins non déclarée. Obligatoire selon le Code du travail.',
      });
    }
    if (!hasDEA && config.floors > 3) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'SOINS-002',
        message: 'DEA non déclaré. Fortement recommandé pour bâtiments multi-étages.',
      });
    }
  }

  // ── T5 — Systèmes intégrés CAN/ULC-S1001 ──────────────────────────────────

  private applyS1001Rules(config: BuildingConfig, result: ConfiguratorResult): void {
    const interconnexions = config.s1001Interconnexions || [];
    if (interconnexions.length === 0) return;

    if (interconnexions.length >= 2) {
      if (!config.s1001DernierEssai) {
        result.validations.push({
          type: 'AVERTISSEMENT',
          code: 'T5-S1001-ESSAI-ABSENT',
          message: `${interconnexions.length} interconnexion(s) déclarée(s) — essai intégré CAN/ULC-S1001 non documenté. Requis pour bâtiments existants à compter du 17 avril 2028.`,
          reference: 'CNPI 2020 art. 6.8.1.1 + 2.1.3.7',
        });
      } else if (config.s1001RapportDisponible === false) {
        result.validations.push({
          type: 'RECOMMANDATION',
          code: 'T5-S1001-RAPPORT-ABSENT',
          message: 'Essai S1001 documenté mais rapport non disponible. Conserver le rapport pour les inspections.',
          reference: 'CAN/ULC-S1001',
        });
      } else if (config.s1001RapportDisponible === true) {
        result.validations.push({
          type: 'INFO',
          code: 'T5-S1001-CONFORME',
          message: `Systèmes intégrés documentés (${interconnexions.length} interconnexion(s)) — essai S1001 et rapport en règle ✓`,
          reference: 'CAN/ULC-S1001',
        });
      }
      // undefined = non encore répondu → pas de validation, pas d'erreur
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'T5-S1001-VERIFICATION',
        message: '1 interconnexion déclarée — confirmer si d\'autres systèmes sont interconnectés pour évaluer l\'applicabilité de S1001.',
        reference: 'CNPI 2020 art. 6.8.1.1',
      });
    }
  }

  // ── T10 — Matières dangereuses enrichies (PSI entrée + signalisation TMD) ──

  private applyMatieresDangereusesRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!config.matieresDangereuses) return;

    // PSI accessible à l'entrée principale (art. 2.8.2.12)
    if (config.psiEntreePrincipale === true) {
      result.validations.push({
        type: 'INFO',
        code: 'T10-PSI-ENTREE-OK',
        message: 'PSI conservé et accessible à l\'entrée principale ✓',
        reference: 'CNPI 2020 art. 2.8.2.12',
      });
    } else {
      // false OU undefined = non encore confirmé ou non conforme
      // On utilise AVERTISSEMENT dans les deux cas : on ne peut pas distinguer
      // "explicitement répondu Non" de "champ non encore rempli sur un projet existant"
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T10-PSI-ENTREE-NR',
        message: 'Matières dangereuses déclarées — confirmer que le PSI est accessible à l\'entrée principale du bâtiment (intervenants d\'urgence).',
        reference: 'CNPI 2020 art. 2.8.2.12',
      });
    }

    // Signalisation TMD par substance (art. 3.2.7.14)
    const matieresList: any[] = (config as any).matieresList || [];
    const substancesTMDSansSignalisation = matieresList.filter(
      (m: any) => m.tmd === true && m.signalisationTMD === false,
    );
    if (substancesTMDSansSignalisation.length > 0) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T10-TMD-SIGNALISATION',
        message: `${substancesTMDSansSignalisation.length} substance(s) TMD sans signalisation déclarée à l'entrée de l'aire de stockage.`,
        reference: 'CNPI 2020 art. 3.2.7.14',
      });
    }

    // Emplacements manquants
    const substancesSansEmplacement = matieresList.filter(
      (m: any) => m.nom && (!m.emplacementPrecis || m.emplacementPrecis.trim() === ''),
    );
    if (substancesSansEmplacement.length > 0) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'T10-EMPLACEMENT-MANQUANT',
        message: `${substancesSansEmplacement.length} substance(s) sans emplacement précis documenté — requis pour l'annexe PSI destinée aux intervenants.`,
        reference: 'CNPI 2020 art. 2.8.2.12',
      });
    }
  }

  // ── T2 — Checklist 12 éléments PSI ──────────────────────────────────────

  private applyPsiChecklistRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!result.profilReglementaire || result.profilReglementaire.psiRequis !== 'OUI') return;

    const elements: { label: string; ok: boolean }[] = [
      { label: 'Alarme incendie',                ok: config.panneauAlarme === true },
      { label: 'Appel service incendie',         ok: config.teleSurveillance === true || !!((config as any).centraleSurveillance) },
      { label: 'Instructions aux occupants',     ok: config.panneauAlarme === true },
      { label: 'Évacuation',                     ok: !!(config as any).pointRassemblement },
      { label: 'Mesures PPNAE',                  ok: !config.personnelHandicap || ((config.ppnaeMesures || []).length > 0) },
      { label: 'Maîtrise initiale de l\'incendie', ok: config.extincteurPortatif === true },
      { label: 'Personnel de surveillance',      ok: config.agentSecurite === true || config.securite24h === true || config.posteSurveillance === true },
      { label: 'Formation du personnel',         ok: true },
      { label: 'Installations sécurité incendie', ok: config.panneauAlarme === true && !!((config as any).panneauLocalisation) },
      { label: 'Exercices d\'incendie',          ok: !!(result.profilReglementaire?.frequenceExercices) },
      { label: 'Surveillance des risques',       ok: !config.matieresDangereuses || ((config as any).matieresList || []).length > 0 },
      { label: 'Inspection et entretien',        ok: config.programmeInspectionEntretien === true },
    ];

    const documentes = elements.filter(e => e.ok).length;
    const manquants  = elements.filter(e => !e.ok);

    if (manquants.length === 0) {
      result.validations.push({
        type: 'INFO',
        code: 'T2-PSI-COMPLET',
        message: `PSI — ${documentes}/12 éléments obligatoires documentés ✓`,
        reference: 'CNPI 2020 art. 2.8.2.1',
      });
    } else {
      result.validations.push({
        type: manquants.length >= 4 ? 'ERREUR' : 'AVERTISSEMENT',
        code: 'T2-PSI-INCOMPLET',
        message: `PSI — ${documentes}/12 éléments documentés. Manquants : ${manquants.map(e => e.label).join(', ')}.`,
        reference: 'CNPI 2020 art. 2.8.2.1',
      });
    }
  }

  // ── T6 — Travaux par points chauds ──────────────────────────────────────

  private applyPointsChaudsRules(config: BuildingConfig, result: ConfiguratorResult): void {
    const tpc = config.travauxPointsChauds;
    if (!tpc || tpc === 'Jamais') return;

    result.proceduresActives.push('PROC-TRAVAIL-CHAUD');

    if (!config.permisTravauxChauds) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T6-PERMIS-ABSENT',
        message: 'Travaux par points chauds déclarés sans permis formalisé — permis obligatoire avant chaque intervention.',
        reference: 'CNPI 2020 art. 5.2',
      });
    }
    if (!config.surveillanceIncendieTPC) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T6-SURVEILLANCE-ABSENTE',
        message: 'Surveillance incendie continue non déclarée — requise pendant tous travaux par points chauds.',
        reference: 'CNPI 2020 art. 5.2.2.1',
      });
    }
    if (!config.inspectionFinaleDocumentee) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T6-INSPECTION-ABSENTE',
        message: 'Inspection finale après travaux non documentée — requise 4h après l\'achèvement ou après surveillance exhaustive.',
        reference: 'CNPI 2020 art. 5.2.3.3',
      });
    }
    if (config.travauxToiture) {
      result.validations.push({
        type: config.inspectionFinaleDocumentee ? 'INFO' : 'ERREUR',
        code: 'T6-TOITURE',
        message: config.inspectionFinaleDocumentee
          ? 'Travaux sur toiture : inspection des espaces cachés documentée ✓'
          : 'Travaux sur toiture déclarés : inspection obligatoire des vides de construction après chaque intervention.',
        reference: 'CNPI 2020 art. 5.2.3.2',
      });
    }
  }

  // ── T7 — Laboratoires ────────────────────────────────────────────────────

  private applyLaboratoireRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!config.laboratoirePresent) return;

    // Exercices portés à 3 mois (hors école)
    const usage = (config.usagePrincipal || '').trim();
    if (!usage.startsWith('A2') && result.profilReglementaire) {
      result.profilReglementaire.frequenceExercices     = 'Tous les 3 mois';
      result.profilReglementaire.frequenceExercicesBase = 'Laboratoire présent hors établissement scolaire (CNPI 2020 art. 2.8.3.2 d)';
    }

    result.validations.push({
      type: 'INFO',
      code: 'T7-LABO-DETECTE',
      message: 'Laboratoire détecté — fréquence des exercices d\'incendie portée à 3 mois (hors écoles).',
      reference: 'CNPI 2020 art. 2.8.3.2',
    });

    if (config.gazComprimesPresents && !config.armireCabinetVentile) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T7-GAZ-ARMOIRE',
        message: 'Gaz comprimés en laboratoire : bonbonnes non branchées doivent être stockées dans une armoire ou cabinet ventilé.',
        reference: 'CNPI 2020 art. 5.5.5.3',
      });
    }
    if (config.gazToxiquesPresents && !config.detectionGazLabo) {
      result.validations.push({
        type: 'ERREUR',
        code: 'T7-GAZ-TOXIQUES-DETECTION',
        message: 'Gaz toxiques en laboratoire sans système de détection — détection avec signal audible et visible obligatoire.',
        reference: 'CNPI 2020 art. 5.5.5.3',
      });
    }
    if (!config.panneauxTMDLabo) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T7-PANNEAUX-TMD',
        message: 'Panneaux TMD conformes requis à l\'entrée du laboratoire pour identifier les matières dangereuses.',
        reference: 'CNPI 2020 art. 3.2.7.14',
      });
    }
  }

  // ── T11 — Registres coupe-feu ────────────────────────────────────────────

  private applyRegistresCoupeFeuRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!config.registresCoupeFeu) {
      if (config.cvac || config.desenfumage) {
        result.validations.push({
          type: 'RECOMMANDATION',
          code: 'T11-SUGGESTION',
          message: 'Système CVAC / désenfumage détecté — confirmer la présence de registres coupe-feu (inspection annuelle requise).',
          reference: 'CNPI 2020 art. 2.2.2.4',
        });
      }
      return;
    }
    if (!config.registresCoupeFeuDerniereInspection) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T11-INSPECTION-ABSENTE',
        message: 'Registres coupe-feu présents sans date d\'inspection — inspection annuelle obligatoire.',
        reference: 'CNPI 2020 art. 2.2.2.4',
      });
      return;
    }
    const diff = Math.floor(
      (Date.now() - new Date(config.registresCoupeFeuDerniereInspection).getTime()) / 86400000,
    );
    if (diff > 365) {
      result.validations.push({
        type: 'ERREUR',
        code: 'T11-INSPECTION-ECHUE',
        message: `Inspection des registres coupe-feu échue depuis ${diff - 365} jour(s) — intervalle de 12 mois dépassé.`,
        reference: 'CNPI 2020 art. 2.2.2.4',
      });
    } else if (diff > 305) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T11-INSPECTION-PROCHE',
        message: `Inspection des registres coupe-feu à prévoir dans ${365 - diff} jour(s).`,
        reference: 'CNPI 2020 art. 2.2.2.4',
      });
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'T11-INSPECTION-OK',
        message: 'Registres coupe-feu — inspection annuelle en règle ✓',
        reference: 'CNPI 2020 art. 2.2.2.4',
      });
    }
  }

  // ── T12 — Signalisation d'issue ──────────────────────────────────────────

  private applySignalisationIssueRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!config.signalisationIssue) return;
    if (!config.signalisationIssueDerniereInspection) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T12-INSPECTION-ABSENTE',
        message: 'Signalisation d\'issue présente sans date d\'inspection — inspection annuelle obligatoire.',
        reference: 'CNPI 2020 art. 6.5.1.8',
      });
      return;
    }
    const diff = Math.floor(
      (Date.now() - new Date(config.signalisationIssueDerniereInspection).getTime()) / 86400000,
    );
    const isPiles = config.signalisationIssueType === 'Piles de secours intégrées';
    const max     = isPiles ? 30 : 365;
    const label   = isPiles ? '30 jours (piles)' : '12 mois';
    if (diff > max) {
      result.validations.push({
        type: 'ERREUR',
        code: 'T12-INSPECTION-ECHUE',
        message: `Inspection de la signalisation d'issue échue — intervalle maximal de ${label} dépassé.`,
        reference: 'CNPI 2020 art. 6.5.1.8',
      });
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'T12-INSPECTION-OK',
        message: `Signalisation d'issue — inspection en règle (intervalle : ${label}) ✓`,
        reference: 'CNPI 2020 art. 6.5.1.8',
      });
    }
  }

  // ── T13 — Obstruction portes d'issue ─────────────────────────────────────

  private applyPortesIssueRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!config.portesIssueExposees) return;
    if (!config.portesIssueMesure || config.portesIssueMesure === 'Aucune mesure') {
      result.validations.push({
        type: 'ERREUR',
        code: 'T13-PORTE-NON-PROTEGEE',
        message: 'Porte(s) d\'issue exposée(s) à un risque d\'obstruction sans protection — signalisation visible ou obstacle physique obligatoire côté extérieur.',
        reference: 'CNPI 2020 art. 2.7.1.8',
      });
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'T13-PORTE-PROTEGEE',
        message: `Portes d'issue exposées — mesure en place : ${config.portesIssueMesure} ✓`,
        reference: 'CNPI 2020 art. 2.7.1.8',
      });
    }
  }

  private calculateScore(config: BuildingConfig, result: ConfiguratorResult): void {
    const critiques      = result.validations.filter(v => v.type === 'CRITIQUE').length;
    const erreurs        = result.validations.filter(v => v.type === 'ERREUR').length;
    const avertissements = result.validations.filter(v => v.type === 'AVERTISSEMENT').length;

    const score = 100 - (critiques * 25) - (erreurs * 15) - (avertissements * 5);
    result.score = Math.max(0, Math.min(100, score));
  }
}