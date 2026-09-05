import { Injectable } from '@nestjs/common';

export interface BuildingConfig {
  // ========== DESCRIPTION GÉNÉRALE ==========
  buildingType: string;
  usagePrincipal: string;
  usageSecondaire?: string;
  floors: number;
  basements: number;
  superficie?: number;
  anneeConstruction?: number;
  typeConstruction?: string;
  hauteurBatiment?: 'STANDARD' | 'GRANDE_HAUTEUR';

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
        message: 'Personnes necessitant assistance declarees : registre PPNAE requis et accompagnateur active.',
        reference: 'CNPI 2010 art. 2.8',
      });
    }
  }

  private applyAlarmRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (!config.panneauAlarme) {
      result.validations.push({
        type: 'CRITIQUE',
        code: 'ALARME-001',
        message: 'Aucun panneau alarme incendie declare. Requis par le CNPI 2010 art. 2.8.',
        reference: 'CNPI 2010',
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
        message: 'Panneau double signal : procedures ALERTE et ALARME activees. Equipe EPI obligatoire.',
        reference: 'CNPI 2010 art. 2.8',
      });
    } else if (config.panneauType === 'SIMPLE') {
      result.proceduresActives.push('PROC-ALARME-INCENDIE');
      result.proceduresActives.push('PROC-CONTOURNEMENT-PANNEAU');
    }

    if (!config.teleSurveillance) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'ALARME-003',
        message: 'Aucune centrale de telesurveillance declaree. Recommande pour conformite ULC-S536.',
        reference: 'ULC-S536',
      });
    }

    if (!config.stationManuelle) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'ALARME-004',
        message: 'Aucune station manuelle d alarme declaree. Verifier la conformite.',
        reference: 'CNPI 2010',
      });
    }

    if (!config.telephonePompier) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'ALARME-005',
        message: 'Telephone pompier non declare. Requis dans les batiments de grande hauteur.',
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
          message: 'Gicleurs sans pompe incendie declaree. Verifier la configuration du reseau.',
          reference: 'NFPA 25',
        });
      }
      if (!config.vannesIsolement) {
        result.validations.push({
          type: 'RECOMMANDATION',
          code: 'GICLEUR-002',
          message: 'Vannes d isolement de zones non declarees. Documenter les emplacements.',
        });
      }
    } else if (config.floors > 2) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'GICLEUR-003',
        message: 'Batiment de plus de 2 etages sans gicleurs declares. Verifier la conformite au CNPI.',
        reference: 'CNPI 2010',
      });
    }

    if (config.boyauIncendie) {
      result.validations.push({
        type: 'INFO',
        code: 'GICLEUR-004',
        message: 'Boyaux incendie presents : inspections selon NFPA 1962 requises annuellement.',
        reference: 'NFPA 1962',
      });
    }
  }

  private applyExtincteurRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (!config.extincteurPortatif) {
      result.validations.push({
        type: 'CRITIQUE',
        code: 'EXTINCTEUR-001',
        message: 'Aucun extincteur portatif declare. Requis par le CNPI. Inspection annuelle NFPA 10.',
        reference: 'NFPA 10',
      });
    } else {
      result.validations.push({
        type: 'INFO',
        code: 'EXTINCTEUR-002',
        message: 'Extincteurs portatifs presents : inspection annuelle selon NFPA 10 requise.',
        reference: 'NFPA 10',
      });
    }

    if (config.systemeHotte) {
      result.proceduresActives.push('PROC-INCENDIE-SERVICE-ALIMENTAIRE');
      result.validations.push({
        type: 'INFO',
        code: 'EXTINCTEUR-003',
        message: 'Systeme extinction hotte detecte : procedure incendie service alimentaire activee.',
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
          message: 'Ascenseurs sans ascenseur pompier declare. Requis selon le code du batiment.',
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
          message: 'Generatrice presente : documenter les equipements fonctionnant sur alimentation de secours.',
        });
      }
    } else {
      result.proceduresActives.push('PROC-PANNE-COURANT');
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'GENERATRICE-002',
        message: 'Aucune generatrice : documenter les equipements critiques sans alimentation de secours.',
      });
    }

    if (config.gazNaturel) {
      result.proceduresActives.push('PROC-FUITE-GAZ-NATUREL');
    }

    if (config.desenfumage) {
      result.validations.push({
        type: 'INFO',
        code: 'MECANIQUE-001',
        message: 'Systeme desenfumage present : documenter activation et procedure contournement.',
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
          message: 'Matieres dangereuses sans trousse de deversement declaree. Requis SIMDUT/TMD.',
          reference: 'SIMDUT 2015',
        });
      }
    }

    if (config.batteriesLithium) {
      result.proceduresActives.push('PROC-FEU-BATTERIE-LITHIUM');
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'MD-002',
        message: 'Batteries lithium-ion : procedure specifique activee. Extincteur eau recommande.',
      });
    }

    if (config.ammoniac) {
      result.proceduresActives.push('PROC-FUITE-AMMONIAC');
      result.proceduresActives.push('PROC-EXPOSITION-AMMONIAC');
      if (!config.detecteurAmmoniac) {
        result.validations.push({
          type: 'CRITIQUE',
          code: 'MD-003',
          message: 'Ammoniac present sans detecteur NH3 declare. CRITIQUE - risque vie humaine.',
        });
      }
    }

    if (config.detecteurCO) {
      const seuilsRemplis = config.detecteurCOSeuil1 && config.detecteurCOSeuil2;
      if (!seuilsRemplis) {
        result.validations.push({
          type: 'INFO',
          code: 'DETECTEUR-001',
          message: 'Detecteur CO : documenter seuils activation (25 ppm alarme, 150 ppm max).',
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
        message: 'Espaces clos : procedure cadenassage et programme entree espace clos OBLIGATOIRES.',
        reference: 'LSST Québec',
      });
    }

    if (config.travailChaud) {
      result.proceduresActives.push('PROC-TRAVAIL-CHAUD');
      result.validations.push({
        type: 'INFO',
        code: 'IND-002',
        message: 'Travaux a chaud : permis travail chaud requis. Procedure et registre actives.',
        reference: 'CNPI 2010',
      });
    }

    if (config.chariotsElevateurs) {
      result.validations.push({
        type: 'INFO',
        code: 'IND-003',
        message: 'Chariots elevateurs : documenter zones operation et procedures recharge batteries.',
      });
    }

    if (config.procesDangereux) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'IND-004',
        message: 'Procedes dangereux declares : section specifique requise dans le document.',
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
        message: `Batiment grande hauteur : secteurs evacuation par etage recommandes. Telephone pompier requis.`,
      });
    }

    if (config.lieuSommeil) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'OCCUP-002',
        message: 'Lieu de sommeil : exigences renforcees CNPI Québec applicables.',
        reference: 'Code securite Québec',
      });
    }

    if (config.occupationNuit && !config.securite24h) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'OCCUP-003',
        message: 'Occupation de nuit sans securite 24h : evaluer la pertinence d une surveillance nocturne.',
      });
    }
  }

  private applyCommunicationRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (!config.systemePhonic && !config.systemePhonicAutomatise) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'COMM-001',
        message: 'Aucun systeme de communication phonique declare. Recommande pour batiments multi-etages.',
      });
    }

    if (config.messagesAutomatises) {
      result.validations.push({
        type: 'INFO',
        code: 'COMM-002',
        message: 'Messages automatises detectes : documenter les messages ALERTE et ALARME dans les annexes.',
      });
    }

    if (!config.radiosCommunication && config.floors > 5) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'COMM-003',
        message: 'Batiment de plus de 5 etages : radios de communication recommandees pour l equipe urgence.',
      });
    }
  }

  private applyCertificationRules(config: BuildingConfig, result: ConfiguratorResult) {
    if (config.certBOMA) {
      result.sectionsDocument.push('CERTIFICATION_BOMA');
      result.validations.push({
        type: 'INFO',
        code: 'CERT-001',
        message: 'Certification BOMA BEST : exigences sante-securite et plan urgence integrees a l evaluation.',
        reference: 'BOMA BEST',
      });
    }

    if (config.certLEED) {
      result.sectionsDocument.push('CERTIFICATION_LEED');
      result.validations.push({
        type: 'INFO',
        code: 'CERT-002',
        message: 'Certification LEED : documenter les systemes durables impactant les procedures urgence.',
        reference: 'LEED Canada',
      });
    }

    if (config.certISO22301) {
      result.sectionsDocument.push('CERTIFICATION_ISO22301');
      result.validations.push({
        type: 'INFO',
        code: 'CERT-003',
        message: 'ISO 22301 active : sections continuite activites et plan reprise requises.',
        reference: 'ISO 22301',
      });
    }
  }

  private applySectionRules(config: BuildingConfig, result: ConfiguratorResult) {
    // Sections toujours presentes
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
    // Validations liées aux emplacements stratégiques
    if (!config.pointRassemblement) {
      result.validations.push({
        type: 'ERREUR',
        code: 'EMPL-001',
        message: 'Point de rassemblement non defini. Obligatoire selon CNPI.',
        reference: 'CNPI 2010 art. 2.8',
      });
    }

    if (!config.posteCommandement) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'EMPL-002',
        message: 'Poste de commandement non defini. Recommande pour coordination urgence.',
      });
    }

    const salleGicleurs = config.salleGicleurs || (config as any).salleGicleursLocalisation;
    if (!salleGicleurs && config.gicleurs) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'EMPL-003',
        message: 'Localisation salle gicleurs non documentee. A completer.',
      });
    }

    // Validation premiers soins
        const equipSoins = (config as any).equipementsSoins || [];
    const hasTrausse = config.trousseSecoursPresente ||
      equipSoins.some((e: any) => e.type && e.type.toLowerCase().includes('premiers soins'));
    const hasDEA = config.defibrillateur ||
      equipSoins.some((e: any) => e.type && e.type.toLowerCase().includes('dea'));

    if (!hasTrausse) {
      result.validations.push({
        type: 'AVERTISSEMENT',
        code: 'SOINS-001',
        message: 'Trousse de premiers soins non declaree. Obligatoire selon le Code du travail.',
      });
    }
    if (!hasDEA && config.floors > 3) {
      result.validations.push({
        type: 'RECOMMANDATION',
        code: 'SOINS-002',
        message: 'DEA non declare. Fortement recommande pour batiments multi-etages.',
      });
    }
  }

  private calculateScore(config: BuildingConfig, result: ConfiguratorResult): void {
    let score = 0;
    const critiques = result.validations.filter(v => v.type === 'CRITIQUE').length;
    const erreurs = result.validations.filter(v => v.type === 'ERREUR').length;
    const avertissements = result.validations.filter(v => v.type === 'AVERTISSEMENT').length;

    score = 100 - (critiques * 25) - (erreurs * 15) - (avertissements * 5);
    result.score = Math.max(0, Math.min(100, score));
  }
}