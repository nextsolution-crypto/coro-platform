import { Injectable } from '@nestjs/common';

export interface BuildingConfig {
  // ========== IDENTITÉ / DOCUMENT ==========
  province?: string;
  responsableNom?: string;
  responsableTitre?: string;
  dateReleve?: string;
  // Champs legacy conservés uniquement pour la lecture des anciens configData / snapshots.
  // Sources canoniques actuelles : Building.city et Project.year.
  ville?: string;
  reglementMunicipal?: string;
  typeDocument?: string;
  anneDocument?: string | number; // clé historique conservée
  versionDocument?: string;

  // ========== DESCRIPTION GÉNÉRALE ==========
  buildingType: string;
  usagePrincipal: string;
  usageSecondaire?: string;
  capaciteMaxReglementaire?: number;
  traitementsMedicauxSurPlace?: boolean;
  floors: number;
  basements: number;
  superficie?: number;
  anneeConstruction?: number | string;
  derniereRenovation?: string;
  typeConstructionEtages?: string;
  typeConstructionToit?: string;
  accesSousSol?: string[];
  accesSousSolDetails?: string;
  accesEtages?: string[];
  accesEtagesDetails?: string;
  treizeEtage?: boolean;
  infosBatiment?: string;
  hauteurBatiment?: boolean | 'STANDARD' | 'GRANDE_HAUTEUR';

  // ========== OCCUPATION ==========
  multiLocataires?: boolean;
  nbLocataires?: number;
  quartsOccupation?: Array<{
    nomQuart?: string;
    heureDebut?: string;
    heureFin?: string;
    occupantsSemaine?: number | string;
    occupantsSamedi?: number | string;
    occupantsDimanche?: number | string;
  }>;
  // Compatibilité anciens projets
  occupationJour?: boolean;
  occupationSoir?: boolean;
  occupationNuit?: boolean;
  lieuSommeil?: boolean;
  securite24h?: boolean;
  agentSecurite?: boolean;
  posteSurveillance?: boolean | string;
  personnelHandicap?: boolean;
  ppnaeTypesLimitations?: string[];
  ppnaeMesures?: string[];
  ppnaeRegistreAJour?: boolean;
  controleAcces?: boolean;
  cameras?: boolean;

  // ========== EMPLACEMENTS ==========
  posteCommandement?: string;
  pointRassemblement?: string;
  pointRassemblement2?: string;
  lieuAccueilTemporaire?: string;
  zoneConfinement?: string;
  zoneRafraichissement?: string;
  boiteClePompier?: string;
  trousseClePompier?: boolean; // compatibilité potentielle
  trousseClesPompier?: boolean; // clé historique actuellement rendue
  trousseClesPompierLieu?: string;
  lieuDocument?: string;
  psiDerniereRevision?: string;
  programmeInspectionEntretien?: boolean;
  portesIssueExposees?: boolean;
  portesIssueMesure?: string;
  signalisationIssue?: boolean;
  signalisationIssueType?: string;
  signalisationIssueDerniereInspection?: string;

  // ========== ALARME INCENDIE ==========
  panneauAlarme?: boolean;
  panneauType?: 'SIMPLE' | 'DOUBLE' | 'AUCUN' | string;
  panneauTechno?: string;
  heuresFonctionnement?: string;
  panneauMarque?: string;
  panneauModele?: string;
  panneauLocalisation?: string;
  panneauAnnonciateurDistance?: boolean;
  panneauAnnonciateurLieu?: string;
  teleSurveillance?: boolean;
  centraleSurveillance?: string;
  centraleTelephone?: string;
  centraleCodeClient?: string;
  telephonePompier?: boolean;
  stationManuelle?: boolean;
  detecteurFumee?: boolean;
  detecteurChaleur?: boolean;
  detecteurDebitGicleurs?: boolean;
  rappelAscenseurs?: boolean;
  arretVentilation?: boolean;
  desenfumageAutomatique?: boolean;
  deverrouillagePorces?: boolean;
  fermeturePortesCoupeFeu?: boolean;

  // ========== COMMUNICATION ==========
  systemePhonic?: boolean;
  systemePhonicType?: string;
  systemePhonicAutomatise?: boolean; // compatibilité anciens projets
  messagesAutomatises?: boolean;
  radiosCommunication?: boolean;
  nbRadios?: number;
  intercomUrgence?: boolean;

  // ========== GICLEURS & PROTECTION EAU ==========
  gicleurs?: boolean;
  gicleursSystemes?: Array<{
    type?: string;
    lieu?: string;
    complet?: boolean;
  }>;
  salleGicleurs?: string;
  salleGicleursLocalisation?: string; // compatibilité anciens projets
  pompeIncendie?: boolean;
  pompeIncendieLieu?: string;
  gapmUsgpm?: number | string | boolean;
  boyauIncendie?: boolean;
  boyauCabinet?: boolean;
  priseRefoulement?: boolean;
  raccordPompier?: boolean;
  raccordPompierLieu?: string;
  bornesFontaine?: boolean;
  bornesFontaineLieu?: string;
  vannesIsolement?: boolean;
  vannesIsolementLieu?: string;
  valve2_5?: boolean;
  valve2_5Lieu?: string;
  valve1_5?: boolean;
  valve1_5Lieu?: string;

  // ========== SYSTÈMES INTÉGRÉS ==========
  s1001Interconnexions?: string[];
  s1001DernierEssai?: string;
  s1001RapportDisponible?: boolean;
  s1001Coordonnateur?: string;

  // ========== EXTINCTEURS / EXTINCTION FIXE ==========
  extincteurPortatif?: boolean;
  extincteursList?: Array<{ type?: string; lieu?: string }>;
  systemeExtinctionFixe?: boolean;
  systemeExtinctionFixeLieu?: string;
  systemePreAction?: boolean;
  systemePreActionLieu?: string;
  systemeHalogen?: boolean;
  systemeHalogenLieu?: string;
  systemeCO2?: boolean;
  systemeCO2Lieu?: string;
  systemeHotte?: boolean; // compatibilité anciens projets / futur mapping explicite

  // ========== MÉCANIQUE ==========
  ascenseurs?: boolean;
  nbAscenseurs?: number;
  typeAscenseur?: string;
  salleAscenseur?: string;
  ascenseurPompier?: boolean;
  ascenseurPompierLequel?: string;
  rappelAscenseursLieu?: string;
  telephoneAscenseurs?: boolean;
  fonctionneSecours?: boolean;
  escaliersPressurises?: boolean;
  nbEscaliers?: number;
  toitVerrouille?: boolean;
  accesToit?: string;
  separationCoupeFeu?: boolean;
  separationCoupeFeuLieu?: string;
  emplacementBac?: string;
  compacteur?: boolean;
  compacteurGicleurs?: boolean;
  compacteurGicleursType?: string;
  compacteurVanneIsolement?: string;
  chuteADechets?: boolean;
  cvac?: boolean;
  cvacType?: string;
  cvacLocalisation?: string;
  typeChautfage?: string;
  typeRefroidissement?: string;
  desenfumage?: boolean;
  desenfumageLieu?: string;
  registresCoupeFeu?: boolean;
  registresCoupeFeuNombre?: number;
  registresCoupeFeuDerniereInspection?: string;
  registresCoupeFeuRapport?: boolean;
  salleElectrique?: string;
  generatrice?: boolean;
  nbGeneratrices?: number;
  generatriceNom?: string;
  generatriceLieu?: string;
  generatriceCarburant?: string;
  autonomieGeneratrice?: number;
  capaciteReservoir?: number;
  reservoirsAuxiliaires?: boolean;
  reservoirsAuxiliairesLieu?: string;
  reservoirsAuxiliairesCapacite?: string | number;
  autonomieTotale?: number;
  generatriceEquipements?: string[];
  generatriceEquipementsPersonnalises?: Array<{ nom?: string }>;
  equipementsSecours?: string[]; // compatibilité anciens projets
  gazNaturel?: boolean;
  gazNaturelLieu?: string;
  propane?: boolean;
  propaneLieu?: string;
  vannesArretSalleGicleurs?: string;
  vannesArretGazNaturel?: string;
  vannesArretEauDomestique?: string;
  vannesArretSalleElectrique?: string;

  // ========== DÉTECTEURS DE GAZ ==========
  detecteurCO?: boolean;
  detecteurCOSeuil1?: number;
  detecteurCOSeuil2?: number;
  detecteurCOLieu?: string;
  detecteurGazNaturel?: boolean;
  detecteurGazNaturelLieu?: string;
  detecteurPropane?: boolean;
  detecteurAmmoniac?: boolean;
  detecteurAmmoniacSeuil1?: number;
  detecteurAmmoniacSeuil2?: number;
  detecteurFreon?: boolean;
  detecteurO2?: boolean;
  detecteurFM200?: boolean;
  detecteurCO2?: boolean;

  // ========== MATIÈRES DANGEREUSES ==========
  matieresDangereuses?: boolean;
  matieresList?: Array<{
    nom?: string;
    numeroUN?: string;
    utilisation?: string;
    emplacementPrecis?: string;
    quantiteMax?: string | number;
    tmd?: boolean;
    simdut?: boolean;
    signalisationTMD?: boolean;
  }>;
  psiEntreePrincipale?: boolean;
  ammoniac?: boolean;
  batteriesLithium?: boolean;
  trousseDeversement?: boolean;
  trousseDeversementListe?: Array<{ lieu?: string }>;

  // ========== TRAVAUX PAR POINTS CHAUDS ==========
  travauxPointsChauds?: string;
  permisTravauxChauds?: boolean;
  surveillanceIncendieTPC?: boolean;
  responsableTravauxChauds?: string;
  inspectionFinaleDocumentee?: boolean;
  methodeInspectionTPC?: string;
  travauxToiture?: boolean;

  // ========== LABORATOIRES ==========
  laboratoirePresent?: boolean;
  typeLaboratoire?: string[];
  gazComprimesPresents?: boolean;
  armireCabinetVentile?: boolean;
  gazToxiquesPresents?: boolean;
  detectionGazLabo?: boolean;
  panneauxTMDLabo?: boolean;

  // ========== PREMIERS SOINS ==========
  equipementsSoins?: Array<{
    type?: string;
    lieu?: string;
    quantite?: number | string;
  }>;
  trousseSecoursPresente?: boolean; // compatibilité anciens projets
  defibrillateur?: boolean;         // compatibilité anciens projets
  doucheOculaire?: boolean;         // compatibilité anciens projets

  // ========== SPÉCIFIQUE INDUSTRIEL ==========
  espaceClos?: boolean;
  espaceClosLieu?: string;

  palettierPresent?: boolean;
  palettierAgencement?: string;
  palettierGicleurs?: string | boolean;
  palettierAlles?: string;

  stockagePresent?: boolean;
  stockagePalettes?: string;
  stockagePalettesCombustible?: string | boolean;
  stockageEmplacement?: string;
  stockageHauteur?: string;
  stockageLargeurAllee?: string;
  stockageClassification?: string[] | string;

  mezzaninePresent?: boolean;
  mezzanineGicle?: string | boolean;
  mezzanineEncloisonnee?: string | boolean;
  mezzanineLieu?: string;

  chariotsPresent?: boolean;
  chariotsNombre?: string | number;
  chariotsType?: string;
  chariotsEmplacementRecharge?: string;

  batteriesLithiumPresent?: boolean;
  batteriesLithiumLocalEspace?: string | boolean;
  batteriesLithiumLocalEspaceCommentaire?: string;
  batteriesLithiumDetection?: string | boolean;
  batteriesLithiumDetectionCommentaire?: string;
  batteriesLithiumSignalisation?: string | boolean;
  batteriesLithiumSignalisationCommentaire?: string;

  procesDangereux?: boolean;
  procesDangereuxDetails?: Array<{
    procedure?: string;
    type?: string;
    risque?: string;
    mesures?: string;
  }>;

  systemeCadenassage?: boolean;

  // Compatibilité anciens champs industriels
  chariotsElevateurs?: boolean;
  palettiers?: boolean;
  mezzanine?: boolean;
  travailChaud?: boolean;

  // ========== CERTIFICATIONS ==========
  certBOMA?: boolean;
  certBOMANiveau?: string;
  certLEED?: boolean;
  certLEEDNiveau?: string;
  certISO22301?: boolean;
  certISO31000?: boolean;
  certEnergyStar?: boolean;
  autresCertifications?: string | string[];
}

export interface ProfilReglementaire {
  referentielCNB: string;
  referentielAnnee: string;
  codeSurveillance: string;
  periodeTransitoire: string;
  exceptionS1001: string;
  psiRequis: 'OUI' | 'EXEMPTE' | 'VERIFICATION_REQUISE';
  psiRaisonCode: string;
  psiRaisonMessage: string;
  frequenceExercices: string;
  frequenceExercicesBase: string;
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
  scoreCompletude: number;
  profilReglementaire?: ProfilReglementaire;
}

@Injectable()
export class RulesEngineService {
  private isHighRise(config: BuildingConfig): boolean {
    return config.hauteurBatiment === true || config.hauteurBatiment === 'GRANDE_HAUTEUR';
  }

  private hasNightOccupancy(config: BuildingConfig): boolean {
    if (config.occupationNuit === true) return true;

    return (config.quartsOccupation || []).some((quart) => {
      const nom = (quart?.nomQuart || '').toLowerCase();
      return nom.includes('nuit') || nom.includes('night');
    });
  }

  private hasLithiumRisk(config: BuildingConfig): boolean {
    return config.batteriesLithium === true || config.batteriesLithiumPresent === true;
  }

  private hasChariots(config: BuildingConfig): boolean {
    return config.chariotsPresent ?? config.chariotsElevateurs ?? false;
  }

  private hasPalettier(config: BuildingConfig): boolean {
    return config.palettierPresent ?? config.palettiers ?? false;
  }

  private hasMezzanine(config: BuildingConfig): boolean {
    return config.mezzaninePresent ?? config.mezzanine ?? false;
  }

  private hasTravauxPointsChauds(config: BuildingConfig): boolean {
    if (config.travauxPointsChauds !== undefined) {
      return config.travauxPointsChauds !== '' && config.travauxPointsChauds !== 'Jamais';
    }

    return config.travailChaud === true;
  }

  analyzeConfiguration(config: BuildingConfig): ConfiguratorResult {
    const result: ConfiguratorResult = {
      rolesActives: [],
      rolesRecommandes: [],
      proceduresActives: [],
      sectionsDocument: [],
      validations: [],
      score: 0,
      scoreCompletude: 0,
    };

    this.applyReglementaireRules(config, result);
    this.applyS1001Rules(config, result);
    this.applyMatieresDangereusesRules(config, result);
    this.applyPsiChecklistRules(config, result);
    this.applyPointsChaudsRules(config, result);
    this.applyLaboratoireRules(config, result);
    this.applyRegistresCoupeFeuRules(config, result);
    this.applySignalisationIssueRules(config, result);
    this.applyPortesIssueRules(config, result);

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
      result.rolesRecommandes.filter((r) => !result.rolesActives.includes(r)),
    )];
    result.proceduresActives = [...new Set(result.proceduresActives)];
    result.sectionsDocument = [...new Set(result.sectionsDocument)];

    return result;
  }

  private applyReglementaireRules(config: BuildingConfig, result: ConfiguratorResult): void {
    const annee = this.parseAnneeConstruction(config.anneeConstruction);
    const profil = this.computeProfilReglementaire(config, annee);
    result.profilReglementaire = profil;

    this.addPsiValidation(profil, result);
    this.applyPsiRevisionRules(config, result, profil);

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
    const { referentielCNB, referentielAnnee } = this.getReferentielCNB(annee);
    const psiResult = this.computePsiRequis(config);
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

    if (usage.startsWith('B')) {
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-B',
        message: 'PSI requis — usage du groupe B (détention, traitement ou soins)',
      };
    }

    if (usage.startsWith('D') && traitements) {
      return {
        statut: 'OUI',
        code: 'PSI-D-TRAITEMENTS',
        message: 'PSI requis — usage D avec traitements médicaux pouvant empêcher l\'évacuation autonome (CNPI 2020 art. 2.8.1.1)',
      };
    }

    if (usage.startsWith('D')) {
      return {
        statut: 'VERIFICATION_REQUISE',
        code: 'PSI-D-STANDARD',
        message: 'Usage D — confirmer si des traitements médicaux sont offerts sur place; sinon vérifier autres conditions d\'applicabilité',
      };
    }

    if (usage.startsWith('A')) {
      if (usage.startsWith('A1') || usage.startsWith('A3') || usage.startsWith('A4')) {
        return {
          statut: 'OUI',
          code: 'PSI-GROUPE-A-TOUJOURS',
          message: 'PSI requis — établissement de réunion non admissible à l\'exemption (spectacle, aréna, plein air)',
        };
      }
      if (usage.startsWith('A2')) {
        return {
          statut: 'OUI',
          code: 'PSI-GROUPE-A2',
          message: 'PSI requis — usage A2 (éducation, culte, divertissement, restauration)',
        };
      }
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

    if (usage.startsWith('C')) {
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-C',
        message: 'PSI requis — établissement d\'habitation (usage C)',
      };
    }

    if (usage.startsWith('E')) {
      return {
        statut: 'OUI',
        code: 'PSI-GROUPE-E',
        message: 'PSI requis — établissement commercial (usage E)',
      };
    }

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

    if (config.laboratoirePresent && !usage.startsWith('A2')) {
      return {
        frequence: 'Tous les 3 mois',
        base: 'Laboratoire présent hors établissement scolaire (CNPI 2020 art. 2.8.3.2 d)',
      };
    }

    if (usage.startsWith('B') || config.lieuSommeil) {
      return {
        frequence: 'Tous les 6 mois',
        base: 'Usage B ou lieu de sommeil (art. 2.8.3.2 a)',
      };
    }

    if (this.isHighRise(config) && !usage.startsWith('C')) {
      return {
        frequence: 'Tous les 6 mois',
        base: 'Bâtiment grande hauteur, usage non résidentiel (art. 2.8.3.2 c)',
      };
    }

    if (usage.startsWith('A1')) {
      return {
        frequence: 'Tous les 3 mois',
        base: 'Usage A, division 1 — établissement de spectacle (art. 2.8.3.2 d)',
      };
    }

    if (usage.startsWith('A2')) {
      return {
        frequence: '2 fois par an (automne et printemps)',
        base: 'Usage A2 — école ou garderie inclus (art. 2.8.3.2 b)',
      };
    }

    return {
      frequence: 'Tous les 12 mois',
      base: 'Fréquence standard (art. 2.8.3.2)',
    };
  }

  private addPsiValidation(profil: ProfilReglementaire, result: ConfiguratorResult): void {
    const typeMap: Record<string, ValidationResult['type']> = {
      OUI: 'INFO',
      EXEMPTE: 'INFO',
      VERIFICATION_REQUISE: 'AVERTISSEMENT',
    };
    result.validations.push({
      type: typeMap[profil.psiRequis] || 'AVERTISSEMENT',
      code: profil.psiRaisonCode,
      message: profil.psiRaisonMessage,
      reference: 'CNPI 2020 art. 2.8.1.1',
    });
  }

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
      const equipSecours = config.generatriceEquipements || config.equipementsSecours || [];
      const equipPerso = config.generatriceEquipementsPersonnalises || [];

      if (equipSecours.length === 0 && equipPerso.length === 0) {
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

    if (this.hasLithiumRisk(config)) {
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

    if (this.hasTravauxPointsChauds(config)) {
      result.proceduresActives.push('PROC-TRAVAIL-CHAUD');
    }

    if (this.hasChariots(config)) {
      result.validations.push({
        type: 'INFO',
        code: 'IND-003',
        message: 'Chariots élévateurs : documenter les zones d’opération et les procédures de recharge.',
      });
    }

    if (this.hasPalettier(config) && !config.palettierAgencement) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'IND-PALETTIER-001',
        message: 'Palettiers présents : documenter leur agencement et les conditions de protection incendie.',
      });
    }

    if (config.stockagePresent && !config.stockageEmplacement) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'IND-STOCKAGE-001',
        message: 'Stockage déclaré sans emplacement documenté.',
      });
    }

    if (this.hasLithiumRisk(config)) {
      const lithiumDetectionAbsente =
        config.batteriesLithiumDetection === false ||
        config.batteriesLithiumDetection === 'Non';

      if (config.batteriesLithiumPresent && lithiumDetectionAbsente) {
        result.validations.push({
          type: 'AVERTISSEMENT',
          code: 'IND-LITHIUM-DETECTION',
          message: 'Batteries lithium-ion déclarées sans détection dédiée. Évaluer les mesures de détection adaptées au risque.',
        });
      }
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

    if (config.floors > 10 || this.isHighRise(config)) {
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

    if (this.hasNightOccupancy(config) && !config.securite24h) {
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

    if (config.certISO31000) {
      result.validations.push({
        type: 'INFO',
        code: 'CERT-004',
        message: 'ISO 31000 déclarée : tenir compte du cadre de gestion des risques de l’organisation dans l’analyse.',
        reference: 'ISO 31000',
      });
    }

    if (config.certEnergyStar) {
      result.validations.push({
        type: 'INFO',
        code: 'CERT-005',
        message: 'Certification ENERGY STAR déclarée : information contextuelle conservée au dossier.',
        reference: 'ENERGY STAR',
      });
    }

    const autresCertifications = Array.isArray(config.autresCertifications)
      ? config.autresCertifications.filter(Boolean)
      : config.autresCertifications
        ? [config.autresCertifications]
        : [];

    if (autresCertifications.length > 0) {
      result.validations.push({
        type: 'INFO',
        code: 'CERT-006',
        message: `Autres certifications déclarées : ${autresCertifications.join(', ')}.`,
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
    if (
      config.detecteurCO ||
      config.detecteurGazNaturel ||
      config.detecteurPropane ||
      config.detecteurAmmoniac ||
      config.detecteurFreon ||
      config.detecteurO2 ||
      config.detecteurFM200 ||
      config.detecteurCO2
    ) {
      result.sectionsDocument.push('DETECTEURS_GAZ');
    }
    if (config.ammoniac) result.sectionsDocument.push('PROCEDURES_AMMONIAC');
    if (config.espaceClos) result.sectionsDocument.push('ESPACE_CLOS_CADENASSAGE');

    if (this.hasTravauxPointsChauds(config)) {
      result.sectionsDocument.push('PERMIS_TRAVAIL_CHAUD');
    }

    if (
      this.hasChariots(config) ||
      this.hasPalettier(config) ||
      config.stockagePresent === true ||
      this.hasMezzanine(config)
    ) {
      result.sectionsDocument.push('ENTREPOSAGE_MANUTENTION');
    }

    if (config.procesDangereux) result.sectionsDocument.push('PROCEDES_DANGEREUX');
    if (config.messagesAutomatises || config.systemePhonic) result.sectionsDocument.push('MESSAGES_PHONIQUES');
    if (this.hasLithiumRisk(config)) result.sectionsDocument.push('FEU_BATTERIE_LITHIUM');
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

    const salleGicleurs = config.salleGicleurs ?? config.salleGicleursLocalisation;
    if (!salleGicleurs && config.gicleurs) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'EMPL-003',
        message: 'Localisation salle gicleurs non documentée. À compléter.',
      });
    }

    const equipSoins = config.equipementsSoins ?? [];
    const hasTrousse =
      config.trousseSecoursPresente === true ||
      equipSoins.some((e) => !!e.type && e.type.toLowerCase().includes('premiers soins'));
    const hasDEA =
      config.defibrillateur === true ||
      equipSoins.some((e) => !!e.type && e.type.toLowerCase().includes('dea'));

    if (!hasTrousse) {
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
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'T5-S1001-VERIFICATION',
        message: '1 interconnexion déclarée — confirmer si d\'autres systèmes sont interconnectés pour évaluer l\'applicabilité de S1001.',
        reference: 'CNPI 2020 art. 6.8.1.1',
      });
    }
  }

  private applyMatieresDangereusesRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!config.matieresDangereuses) return;

    if (config.psiEntreePrincipale === true) {
      result.validations.push({
        type: 'INFO',
        code: 'T10-PSI-ENTREE-OK',
        message: 'PSI conservé et accessible à l\'entrée principale ✓',
        reference: 'CNPI 2020 art. 2.8.2.12',
      });
    } else {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T10-PSI-ENTREE-NR',
        message: 'Matières dangereuses déclarées — confirmer que le PSI est accessible à l\'entrée principale du bâtiment (intervenants d\'urgence).',
        reference: 'CNPI 2020 art. 2.8.2.12',
      });
    }

    const matieresList = config.matieresList ?? [];
    const substancesTMDSansSignalisation = matieresList.filter(
      (m) => m.tmd === true && m.signalisationTMD === false,
    );
    if (substancesTMDSansSignalisation.length > 0) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'T10-TMD-SIGNALISATION',
        message: `${substancesTMDSansSignalisation.length} substance(s) TMD sans signalisation déclarée à l'entrée de l'aire de stockage.`,
        reference: 'CNPI 2020 art. 3.2.7.14',
      });
    }

    const substancesSansEmplacement = matieresList.filter(
      (m) => !!m.nom && (!m.emplacementPrecis || m.emplacementPrecis.trim() === ''),
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

  private applyPsiRevisionRules(
    config: BuildingConfig,
    result: ConfiguratorResult,
    profil: ProfilReglementaire,
  ): void {
    if (profil.psiRequis !== 'OUI') return;

    if (!config.psiDerniereRevision) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'PSI-REVISION-NR',
        message: 'Date de dernière révision du PSI non renseignée — révision annuelle obligatoire (intervalles ≤ 12 mois).',
        reference: 'CNPI 2020 art. 2.8.2.2',
      });
      return;
    }

    const diff = Math.floor(
      (Date.now() - new Date(config.psiDerniereRevision).getTime()) / 86400000,
    );
    const prochaine = new Date(
      new Date(config.psiDerniereRevision).getTime() + 365 * 86400000,
    ).toLocaleDateString('fr-CA');

    if (diff > 365) {
      result.validations.push({
        type: 'ERREUR',
        code: 'PSI-REVISION-ECHUE',
        message: `Révision annuelle du PSI échue depuis ${diff - 365} jour(s) — intervalle de 12 mois dépassé.`,
        reference: 'CNPI 2020 art. 2.8.2.2',
      });
    } else if (diff > 305) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'PSI-REVISION-PROCHE',
        message: `Révision du PSI à prévoir dans ${365 - diff} jour(s) — échéance : ${prochaine}.`,
        reference: 'CNPI 2020 art. 2.8.2.2',
      });
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'PSI-REVISION-OK',
        message: `Révision annuelle du PSI en règle ✓ — prochaine révision avant le ${prochaine}.`,
        reference: 'CNPI 2020 art. 2.8.2.2',
      });
    }
  }

  private applyPsiChecklistRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!result.profilReglementaire || result.profilReglementaire.psiRequis !== 'OUI') return;

    const elements: { label: string; ok: boolean }[] = [
      { label: 'Alarme incendie', ok: config.panneauAlarme === true },
      { label: 'Appel service incendie', ok: config.teleSurveillance === true || !!config.centraleSurveillance },
      { label: 'Instructions aux occupants', ok: config.panneauAlarme === true },
      { label: 'Évacuation', ok: !!config.pointRassemblement },
      { label: 'Mesures PPNAE', ok: !config.personnelHandicap || (config.ppnaeMesures || []).length > 0 },
      { label: 'Maîtrise initiale de l\'incendie', ok: config.extincteurPortatif === true },
      { label: 'Personnel de surveillance', ok: config.agentSecurite === true || config.securite24h === true || config.posteSurveillance === true },
      { label: 'Formation du personnel', ok: true },
      { label: 'Installations sécurité incendie', ok: config.panneauAlarme === true && !!config.panneauLocalisation },
      { label: 'Exercices d\'incendie', ok: !!result.profilReglementaire?.frequenceExercices },
      { label: 'Surveillance des risques', ok: !config.matieresDangereuses || (config.matieresList ?? []).length > 0 },
      { label: 'Inspection et entretien', ok: config.programmeInspectionEntretien === true },
    ];

    const documentes = elements.filter((e) => e.ok).length;
    const manquants = elements.filter((e) => !e.ok);

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
        message: `PSI — ${documentes}/12 éléments documentés. Manquants : ${manquants.map((e) => e.label).join(', ')}.`,
        reference: 'CNPI 2020 art. 2.8.2.1',
      });
    }
  }

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

  private applyLaboratoireRules(config: BuildingConfig, result: ConfiguratorResult): void {
    if (!config.laboratoirePresent) return;

    const usage = (config.usagePrincipal || '').trim();
    if (!usage.startsWith('A2') && result.profilReglementaire) {
      result.profilReglementaire.frequenceExercices = 'Tous les 3 mois';
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
    const max = isPiles ? 30 : 365;
    const label = isPiles ? '30 jours (piles)' : '12 mois';
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
    const critiques = result.validations.filter((v) => v.type === 'CRITIQUE').length;
    const erreurs = result.validations.filter((v) => v.type === 'ERREUR').length;
    const avertissements = result.validations.filter((v) => v.type === 'AVERTISSEMENT').length;
    result.score = Math.max(
      0,
      Math.min(100, 100 - critiques * 25 - erreurs * 15 - avertissements * 5),
    );

    result.scoreCompletude = this.calculateCompletude(config);
  }

  private calculateCompletude(config: BuildingConfig): number {
    const c = config as any;

    const checks: { earned: boolean; weight: number }[] = [
      { earned: !!c.province, weight: 2 },
      { earned: !!c.typeDocument, weight: 3 },
      { earned: !!c.responsableNom, weight: 5 },
      { earned: !!c.dateReleve, weight: 3 },

      { earned: !!config.usagePrincipal, weight: 10 },
      { earned: !!config.anneeConstruction, weight: 8 },
      { earned: (config.floors || 0) > 0, weight: 5 },
      { earned: !!c.buildingType, weight: 3 },

      { earned: !!config.pointRassemblement, weight: 8 },
      { earned: !!config.posteCommandement, weight: 5 },
      { earned: !!c.lieuDocument, weight: 5 },

      { earned: config.panneauAlarme !== undefined && config.panneauAlarme !== null, weight: 5 },
      { earned: !config.panneauAlarme || !!c.panneauLocalisation, weight: 3 },

      { earned: config.extincteurPortatif !== undefined && config.extincteurPortatif !== null, weight: 5 },

      { earned: (c.quartsOccupation || []).length > 0, weight: 8 },

      { earned: (c.equipementsSoins || []).length > 0, weight: 5 },

      { earned: !config.usagePrincipal?.startsWith('A') || !!config.capaciteMaxReglementaire, weight: 4 },
      { earned: !config.usagePrincipal?.startsWith('D') || config.traitementsMedicauxSurPlace !== undefined, weight: 3 },
      { earned: !config.matieresDangereuses || (c.matieresList || []).length > 0, weight: 4 },
      { earned: !config.matieresDangereuses || config.psiEntreePrincipale !== undefined, weight: 3 },
      { earned: c.programmeInspectionEntretien !== undefined, weight: 3 },
    ];

    const total = checks.reduce((s, ch) => s + ch.weight, 0);
    const earned = checks.reduce((s, ch) => s + (ch.earned ? ch.weight : 0), 0);
    return Math.round((earned / total) * 100);
  }
}
