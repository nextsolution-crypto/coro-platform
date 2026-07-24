// ============================================================
// CORO — Module 8 : Registres et Annexes
// ============================================================

import { DocumentContext } from './module1.templates';

// ============================================================
// TYPES
// ============================================================

export interface TrainingEntry {
  nom: string;
  titre: string;
  date: string;
  formateur: string;
}

export interface PhoneticMessage {
  evenement: string;
  messageFR: string;
  messageEN: string;
}

export interface EvacuationReport {
  adresse: string;
  telephoneContact: string;
  dateEvenement: string;
  heure: string;
  coordonnateurUrgence: string;
  typeEvenement: string; // 'exercice' | 'non-fondee' | 'fondee'
  cause: string;
  heureDeClenchement: string;
  deroulement: string;
  recommandation: string;
  tempsEvacuationComplete: string;
  signatureResponsable: string;
  dateSignature: string;
}

export interface RiskInspectionRow {
  equipement: string;
  codeNorme: string;
  article: string;
  observations: string;
}

export interface EvacuationSectorRow {
  etage: string;
  evacue: boolean;
  notes: string;
}

// ============================================================
// DONNÉES FIXES — MESSAGES PHONIQUES
// ============================================================

const MESSAGES_PHONIQUES_FR: PhoneticMessage[] = [
  {
    evenement: 'ALERTE',
    messageFR: 'Attention, Attention. Une alerte incendie est présentement en cours dans le bâtiment. Notre équipe est en déplacement pour en établir la cause. S\'il vous plaît, cessez vos activités et restez à l\'écoute des consignes.\n\n(Répéter en anglais)',
    messageEN: 'Attention, Attention. A fire alert is currently in progress in the building. Our team is investigating the cause. Please stop your activities and listen for further instructions.\n\n(Repeat in French)',
  },
  {
    evenement: 'ÉVACUATION',
    messageFR: 'Attention, Attention. Pour des raisons de sécurité, nous devons procéder à l\'évacuation de l\'immeuble immédiatement. Évacuez dans le calme par les cages d\'escalier et dirigez-vous au point de rassemblement extérieur.\n\n(Répéter en anglais)',
    messageEN: 'Attention, Attention. For safety reasons, we must proceed with an immediate building evacuation. Please evacuate calmly via the stairwells and proceed to the exterior assembly point.\n\n(Repeat in French)',
  },
  {
    evenement: 'FAUSSE ALERTE',
    messageFR: 'Attention x3 – Notre vérification indique qu\'il s\'agit d\'une fausse alerte. Veuillez continuer vos activités. Merci de votre collaboration.',
    messageEN: 'Attention x3 – Our verification indicates this was a false alarm. Please resume your activities. Thank you for your cooperation.',
  },
  {
    evenement: 'PANNE DE COURANT',
    messageFR: 'Attention x3 – Nous subissons présentement une panne de courant. Veuillez rester calme et demeurer à votre poste de travail. Les ascenseurs ne peuvent pas être utilisés. Si la situation devait se prolonger, nous vous aviserions aussi rapidement que possible. Merci de votre collaboration.',
    messageEN: 'Attention x3 – We are currently experiencing a power outage. Please remain calm and stay at your workstation. Elevators cannot be used. If the situation persists, we will advise you as soon as possible. Thank you for your cooperation.',
  },
  {
    evenement: 'FIN DE PANNE DE COURANT',
    messageFR: 'Attention x3 – Nous avons le plaisir de vous aviser que la panne de courant est terminée. Vous pouvez maintenant utiliser les ascenseurs de l\'immeuble. Tous les systèmes sont opérationnels. Merci de votre collaboration.',
    messageEN: 'Attention x3 – We are pleased to advise that the power outage has ended. You may now use the building\'s elevators. All systems are operational. Thank you for your cooperation.',
  },
  {
    evenement: 'AVIS DE CONFINEMENT',
    messageFR: 'Attention x3 – Une procédure de confinement est présentement en cours. Veuillez rester calme et demeurer à l\'intérieur du bâtiment. Il est important de ne pas sortir du bâtiment. Les prises d\'air et certains systèmes de ventilation ont été fermés à cet effet. Nous vous tiendrons informés. Merci de votre collaboration.',
    messageEN: 'Attention x3 – A shelter-in-place procedure is currently in effect. Please remain calm and stay inside the building. It is important not to exit the building. Air intakes and certain ventilation systems have been closed accordingly. We will keep you informed. Thank you for your cooperation.',
  },
  {
    evenement: 'VÉRIFICATION DU SYSTÈME D\'ALARME INCENDIE',
    messageFR: 'Attention x3 – Dans quelques instants, nous procéderons à la vérification du système d\'alarme incendie. Nous vous prions de ne pas tenir compte du signal sonore que vous entendrez. Nous vous aviserons dès que nous aurons terminé. Merci de votre collaboration.',
    messageEN: 'Attention x3 – In a few moments, we will proceed with the verification of the fire alarm system. Please disregard the audible signal you will hear. We will notify you once the verification is complete. Thank you for your cooperation.',
  },
  {
    evenement: 'FIN DE LA VÉRIFICATION',
    messageFR: 'Attention x3 – La vérification du système d\'alarme incendie est maintenant terminée. Nous vous remercions de votre patience.',
    messageEN: 'Attention x3 – The fire alarm system verification is now complete. Thank you for your patience.',
  },
  {
    evenement: 'TIREUR ACTIF',
    messageFR: 'Attention x3 – Code argent en cours. Confinement requis.',
    messageEN: 'Attention x3 – Code Silver in progress. Lockdown required.',
  },
  {
    evenement: 'VENTS VIOLENTS',
    messageFR: 'Attention x3 – Des vents violents sont à venir dans les prochaines heures. Les occupants des étages supérieurs doivent s\'éloigner des fenêtres immédiatement. Des mises à jour seront fournies dès que plus d\'informations seront disponibles. Merci de votre collaboration.',
    messageEN: 'Attention x3 – Severe winds are expected in the coming hours. Occupants on upper floors must move away from windows immediately. Updates will be provided as more information becomes available. Thank you for your cooperation.',
  },
  {
    evenement: 'FIN DE VENTS VIOLENTS',
    messageFR: 'Attention x3 – Les vents violents sont terminés. Vous pouvez retourner à vos activités. Merci de votre collaboration.',
    messageEN: 'Attention x3 – The severe winds have ended. You may return to your activities. Thank you for your cooperation.',
  },
];

// ============================================================
// DONNÉES FIXES — INSPECTIONS ET SURVEILLANCES (8.4)
// ============================================================

const INSPECTIONS_RISQUES_FR: RiskInspectionRow[] = [
  { equipement: 'SORTIE DE SECOURS', codeNorme: 'CNPI', article: 'art. 2.7.2.1 (2)', observations: '' },
  { equipement: 'SÉPARATIONS COUPE-FEU', codeNorme: 'CNPI', article: 'art. 2.2.1.2 (1)', observations: '' },
  { equipement: 'PANNEAU INCENDIE', codeNorme: 'CNPI / CAN/ULC-S536', article: 'art. 6.3.1.1 (1)', observations: '' },
  { equipement: 'AVERTISSEUR DE MONOXYDE DE CARBONE', codeNorme: 'CNPI', article: 'art. 6.3.1.2 (1)', observations: '' },
  { equipement: 'SYSTÈME DE GICLEURS', codeNorme: 'CNPI / NFPA 25', article: 'art. 6.4.1.1 (1)', observations: '' },
  { equipement: 'EXTINCTEURS PORTATIFS', codeNorme: 'CNPI / NFPA 10', article: 'art. 6.2.1.1 (1)', observations: '' },
  { equipement: 'POMPE INCENDIE', codeNorme: 'NFPA 25', article: 'Tableau 8.1', observations: '' },
  { equipement: 'RACCORD-POMPIER', codeNorme: 'CNPI', article: 'art. 2.5.1.4 (1)', observations: '' },
  { equipement: 'ACCÈS AU TOIT', codeNorme: 'CNPI', article: 'art. 2.5.1.3 (1)', observations: '' },
  { equipement: 'ASCENSEUR', codeNorme: 'ASME A17.1 / CSA B44', article: 'art. 7.2.2.1 (2)', observations: '' },
  { equipement: 'SYSTÈME D\'EXTINCTION SPÉCIAL', codeNorme: 'CNPI', article: 'art. 6.7.1.2 (1)', observations: '' },
  { equipement: 'GÉNÉRATRICE', codeNorme: 'CAN/CSA-C282', article: '—', observations: '' },
  { equipement: 'VENTILATION', codeNorme: 'CNPI', article: 'art. 7.2.4.1 (1)', observations: '' },
  { equipement: 'ÉCLAIRAGE D\'URGENCE', codeNorme: 'CNPI', article: 'art. 6.5.1.7 (1)', observations: '' },
  { equipement: 'ÉQUIPEMENT DE CUISSON COMMERCIAL', codeNorme: 'CNPI', article: 'art. 2.6.1.9 (1)', observations: '' },
  { equipement: 'STOCKAGE DE DÉCHETS COMBUSTIBLES', codeNorme: 'CNPI', article: 'art. 2.4.1.1 (1)', observations: '' },
  { equipement: 'ACCUMULATION DE PRODUITS COMBUSTIBLES', codeNorme: 'CNPI', article: 'art. 2.4.1.1 (1)', observations: '' },
  { equipement: 'PLAN DE SÉCURITÉ INCENDIE & MESURES D\'URGENCE — FORMATION ET EXERCICE', codeNorme: 'CNPI', article: 'art. 2.8.2.1 (1)', observations: '' },
];

const INSPECTIONS_RISQUES_EN: RiskInspectionRow[] = [
  { equipement: 'EMERGENCY EXIT', codeNorme: 'NBC', article: 'art. 2.7.2.1 (2)', observations: '' },
  { equipement: 'FIRE SEPARATIONS', codeNorme: 'NBC', article: 'art. 2.2.1.2 (1)', observations: '' },
  { equipement: 'FIRE ALARM PANEL', codeNorme: 'NBC / CAN/ULC-S536', article: 'art. 6.3.1.1 (1)', observations: '' },
  { equipement: 'CARBON MONOXIDE DETECTOR', codeNorme: 'NBC', article: 'art. 6.3.1.2 (1)', observations: '' },
  { equipement: 'SPRINKLER SYSTEM', codeNorme: 'NBC / NFPA 25', article: 'art. 6.4.1.1 (1)', observations: '' },
  { equipement: 'PORTABLE FIRE EXTINGUISHERS', codeNorme: 'NBC / NFPA 10', article: 'art. 6.2.1.1 (1)', observations: '' },
  { equipement: 'FIRE PUMP', codeNorme: 'NFPA 25', article: 'Table 8.1', observations: '' },
  { equipement: 'FIRE DEPARTMENT CONNECTION', codeNorme: 'NBC', article: 'art. 2.5.1.4 (1)', observations: '' },
  { equipement: 'ROOF ACCESS', codeNorme: 'NBC', article: 'art. 2.5.1.3 (1)', observations: '' },
  { equipement: 'ELEVATOR', codeNorme: 'ASME A17.1 / CSA B44', article: 'art. 7.2.2.1 (2)', observations: '' },
  { equipement: 'SPECIAL SUPPRESSION SYSTEM', codeNorme: 'NBC', article: 'art. 6.7.1.2 (1)', observations: '' },
  { equipement: 'GENERATOR', codeNorme: 'CAN/CSA-C282', article: '—', observations: '' },
  { equipement: 'VENTILATION', codeNorme: 'NBC', article: 'art. 7.2.4.1 (1)', observations: '' },
  { equipement: 'EMERGENCY LIGHTING', codeNorme: 'NBC', article: 'art. 6.5.1.7 (1)', observations: '' },
  { equipement: 'COMMERCIAL COOKING EQUIPMENT', codeNorme: 'NBC', article: 'art. 2.6.1.9 (1)', observations: '' },
  { equipement: 'COMBUSTIBLE WASTE STORAGE', codeNorme: 'NBC', article: 'art. 2.4.1.1 (1)', observations: '' },
  { equipement: 'COMBUSTIBLE MATERIAL ACCUMULATION', codeNorme: 'NBC', article: 'art. 2.4.1.1 (1)', observations: '' },
  { equipement: 'FIRE SAFETY PLAN & EMERGENCY MEASURES — TRAINING AND DRILL', codeNorme: 'NBC', article: 'art. 2.8.2.1 (1)', observations: '' },
];

// ============================================================
// GÉNÉRATION DES SECTEURS D'ÉVACUATION selon nb d'étages
// ============================================================

function buildEvacuationSectors(floors: number): EvacuationSectorRow[] {
  const sectors: EvacuationSectorRow[] = [
    { etage: 'RDC', evacue: false, notes: '' },
  ];
  for (let i = 2; i <= Math.max(floors, 2); i++) {
    sectors.push({ etage: String(i), evacue: false, notes: '' });
  }
  return sectors;
}

// ============================================================
// GÉNÉRATION MODULE 8 — FR
// ============================================================

function generateModule8FR(ctx: DocumentContext): any {
  return {
    moduleNumber: 8,
    title: 'REGISTRES ET ANNEXES',
    language: 'fr',
    sections: [
      {
        id: '8.1',
        title: 'REGISTRE DE FORMATION',
        type: 'training_table',
        columns: ['NOM', 'TITRE / FONCTION', 'DATE', 'FORMATEUR'],
        allowAdd: true,
        allowDelete: true,
        entries: Array.from({ length: 20 }, () => ({
          nom: '',
          titre: '',
          date: '',
          formateur: '',
        })) as TrainingEntry[],
      },
      {
        id: '8.2',
        title: 'EXEMPLES DE MESSAGES PHONIQUES',
        type: 'phonetic_table',
        columns: ['ÉVÉNEMENT', 'MESSAGE FRANÇAIS', 'MESSAGE ANGLAIS'],
        allowAdd: false,
        allowDelete: false,
        entries: MESSAGES_PHONIQUES_FR,
      },
      {
        id: '8.3',
        title: 'RAPPORT D\'ÉVACUATION',
        type: 'evacuation_report',
        data: {
          adresse: ctx.buildingAddress || '',
          telephoneContact: '',
          dateEvenement: '',
          heure: '',
          coordonnateurUrgence: '',
          typeEvenement: '',
          cause: '',
          heureDeClenchement: '',
          deroulement: '',
          recommandation: '',
          tempsEvacuationComplete: '',
          signatureResponsable: '',
          dateSignature: '',
        } as EvacuationReport,
      },
      {
        id: '8.4',
        title: 'INSPECTIONS ET SURVEILLANCES DES RISQUES',
        type: 'risk_table',
        columns: ['ÉQUIPEMENT', 'CODE / NORME / RÈGLEMENT EN RÉFÉRENCE', 'ARTICLE', 'OBSERVATIONS'],
        allowAdd: true,
        allowDelete: false,
        entries: INSPECTIONS_RISQUES_FR,
      },
      {
        id: '8.5',
        title: 'REGISTRE D\'ÉVACUATION PAR SECTEURS',
        type: 'sector_table',
        columns: ['ÉTAGE / SECTEUR', 'ÉVACUÉ?', 'AUTRES INFORMATIONS'],
        allowAdd: true,
        allowDelete: true,
        entries: buildEvacuationSectors(ctx.floors || 1),
      },
      {
        id: '8.6',
        title: 'RAPPORT D\'INSPECTION DES ÉQUIPEMENTS DE PROTECTION INCENDIE',
        type: 'text',
        content: 'Insérez dans cette section les rapports d\'inspection des équipements de protection incendie.',
      },
      {
        id: '8.7',
        title: 'CADENASSAGE ET ESPACE CLOS',
        type: 'text',
        content: `**1) Objectif**
Assurer le contrôle sécuritaire des énergies dangereuses (cadenassage) et encadrer l'entrée, le travail et les mesures de sauvetage en espace clos afin de :
- Prévenir les blessures graves et incidents majeurs lors de travaux hors production
- Réduire les risques d'exposition à une atmosphère dangereuse
- Structurer la coordination entre l'exploitant, les travailleurs, les sous-traitants et les services d'urgence

**Références réglementaires :** CNESST – contrôle des énergies et espaces clos; RSST (Règlement sur la santé et la sécurité du travail)

**2) Champ d'application**
Cette section s'applique à toute activité sur le site impliquant :
- Entretien, inspection, réparation, déblocage, nettoyage, ajustement, ou toute intervention hors production exposant à une zone dangereuse
- Entrée ou travail dans un espace clos (inspection, nettoyage, maintenance, récupération, etc.)
- Travaux réalisés par des employés internes ou des sous-traitants

**3) Définitions (résumé)**
- **Cadenassage** : méthode de contrôle des énergies visant l'installation d'un cadenas à clé unique sur un dispositif d'isolement afin d'empêcher toute remise en marche ou libération d'énergie
- **Espace clos** : espace totalement ou partiellement fermé, non conçu pour être occupé en permanence, avec des risques particuliers (atmosphère, ensevelissement, agitation mécanique, etc.)

**4) Rôles et responsabilités**
**Employeur / Direction de site**
- S'assure de l'existence, de la diffusion et de l'application de procédures écrites de cadenassage, contrôle des énergies dangereuses, entrée et travail et sauvetage en espace clos
- Met à disposition les ressources humaines, matérielles et organisationnelles nécessaires

**Responsable SST / Responsable du PMU**
- Maintient à jour le registre des équipements et sources d'énergie et l'inventaire des espaces clos
- Coordonne l'arrimage entre les procédures SST et la réponse d'urgence`,
      },
      {
        id: '8.8',
        title: 'PERMIS DE TRAVAIL À CHAUD ET DEMANDE D\'ÉVITEMENT DE COMPOSANTE',
        type: 'hot_work_permit',
        content: `**Permis de travail à chaud**
Lors de la réalisation de travaux susceptibles de produire de la chaleur, des flammes ou des étincelles, il est impératif d'obtenir un permis de travail à chaud. Ce permis garantit que toutes les mesures de sécurité sont prises pour prévenir les risques d'incendie.

**Demande d'évitement** : Lorsque les travaux risquent de déclencher le système d'alarme incendie, comme dans le cas de travaux produisant beaucoup de poussières, une demande d'évitement doit être déposée.

**Plan d'évacuation de chantier** : Avant le début des travaux :
- L'entrepreneur ou le responsable des travaux doit élaborer un plan d'évacuation spécifique au chantier
- Ce plan doit mentionner de « En cas d'urgence, composez le 9-1-1 »
- Le nom du chantier, de l'entrepreneur et la date de mise à jour

**8.8.1 Objectif du permis de travail à chaud**
Le permis vise à garantir que toute personne effectuant des travaux générant de la chaleur, des flammes ou des étincelles le fait en toute sécurité et en conformité avec les procédures établies pour minimiser le risque d'incendie ou d'autres dangers.

**8.8.2 Durée et validité du permis**
Le permis est valable pour la durée des travaux mentionnés dans le permis. Il ne peut être transféré et est valide uniquement pour les travaux spécifiés.

**8.8.3 Équipement de sécurité**
Avant de commencer les travaux, l'entrepreneur doit s'assurer que tous les équipements de sécurité sont disponibles sur le lieu de travail, notamment les extincteurs, les couvertures anti-feu, et les dispositifs d'arrosage.

**8.8.4 Formation du personnel**
Tout personnel effectuant des travaux à chaud doit avoir reçu une formation appropriée concernant les risques associés et les mesures préventives à adopter.

**8.8.5 Inspection post-travaux**
Après la réalisation des travaux, le site doit être inspecté pour s'assurer qu'aucun matériau combustible ne soit en train de s'enflammer.

**8.8.6 Responsabilité de la personne autorisant le permis**
La personne délivrant le permis doit s'assurer que tous les critères de sécurité sont respectés et que le lieu de travail est sécurisé avant d'approuver le permis de travail à chaud.`,
      },
      {
        id: '8.9',
        title: 'COPIE À L\'ENTREPRENEUR',
        type: 'text',
        content: `**CONDITIONS ET EXIGENCES**

**Matériel :**
- Assurer un bon état de fonctionnement du matériel
- Réparer toute fuite ou défaut avant utilisation

**Précautions dans un rayon de 15 m :**
- Protéger ou déplacer les objets/matières combustibles si nécessaire
- Obstruer ou recouvrir les ouvertures pour éviter le passage d'étincelles
- Nettoyer l'aire des travaux de toute matière combustible ou inflammable
- Protéger les canalisations de gaz inflammable avec une barrière thermique

**Mesures supplémentaires :**
- Afficher l'avis de permis de travail à chaud à l'entrée du chantier
- Assurer l'élimination des matières combustibles derrière les murs
- Disposer d'extincteurs supplémentaires près de la zone de travail
- Exercer une surveillance continue, même pendant les pauses
- Assurer une surveillance incendie dans les zones adjacentes, si nécessaire
- Former au moins une personne au maniement d'un extincteur et aux mesures d'urgence

**NON-RESPECT**
Advenant un non-respect des mesures, le permis sera révoqué et des sanctions peuvent être appliquées. Il est interdit d'effectuer toute forme de travaux pouvant déclencher le système de protection incendie sans avoir avisé au préalable le service de sécurité incendie et avoir rempli une demande en bonne et due forme.

**TRAVAUX DE PEINTURE ET TRAVAUX PRODUISANT DE LA POUSSIÈRE**
Les travaux produisant de la poussière sont, de manière exhaustive, des travaux de sablage, de perçage de béton et de sciure de bois. Lors de ces travaux, vous devez aviser le responsable de l'immeuble avant le début et à la fin et remplir un formulaire d'évitement.

Il est formellement interdit de peinturer tout matériel de protection incendie soit : détecteur incendie, gicleurs et station manuelle.`,
      },
    ],
  };
}

// ============================================================
// GÉNÉRATION MODULE 8 — EN
// ============================================================

function generateModule8EN(ctx: DocumentContext): any {
  return {
    moduleNumber: 8,
    title: 'RECORDS AND APPENDICES',
    language: 'en',
    sections: [
      {
        id: '8.1',
        title: 'TRAINING REGISTER',
        type: 'training_table',
        columns: ['NAME', 'TITLE / FUNCTION', 'DATE', 'TRAINER'],
        allowAdd: true,
        allowDelete: true,
        entries: Array.from({ length: 20 }, () => ({
          nom: '',
          titre: '',
          date: '',
          formateur: '',
        })) as TrainingEntry[],
      },
      {
        id: '8.2',
        title: 'EXAMPLES OF PHONETIC MESSAGES',
        type: 'phonetic_table',
        columns: ['EVENT', 'FRENCH MESSAGE', 'ENGLISH MESSAGE'],
        allowAdd: false,
        allowDelete: false,
        entries: MESSAGES_PHONIQUES_FR,
      },
      {
        id: '8.3',
        title: 'EVACUATION REPORT',
        type: 'evacuation_report',
        data: {
          adresse: ctx.buildingAddress || '',
          telephoneContact: '',
          dateEvenement: '',
          heure: '',
          coordonnateurUrgence: '',
          typeEvenement: '',
          cause: '',
          heureDeClenchement: '',
          deroulement: '',
          recommandation: '',
          tempsEvacuationComplete: '',
          signatureResponsable: '',
          dateSignature: '',
        } as EvacuationReport,
      },
      {
        id: '8.4',
        title: 'RISK INSPECTIONS AND MONITORING',
        type: 'risk_table',
        columns: ['EQUIPMENT', 'CODE / STANDARD / REFERENCE REGULATION', 'ARTICLE', 'OBSERVATIONS'],
        allowAdd: true,
        allowDelete: false,
        entries: INSPECTIONS_RISQUES_EN,
      },
      {
        id: '8.5',
        title: 'EVACUATION REGISTER BY SECTOR',
        type: 'sector_table',
        columns: ['FLOOR / SECTOR', 'EVACUATED?', 'OTHER INFORMATION'],
        allowAdd: true,
        allowDelete: true,
        entries: buildEvacuationSectors(ctx.floors || 1),
      },
      {
        id: '8.6',
        title: 'FIRE PROTECTION EQUIPMENT INSPECTION REPORT',
        type: 'text',
        content: 'Insert in this section the fire protection equipment inspection reports.',
      },
      {
        id: '8.7',
        title: 'LOCKOUT/TAGOUT AND CONFINED SPACES',
        type: 'text',
        content: `**1) Objective**
Ensure safe control of hazardous energies (lockout/tagout) and manage entry, work and rescue in confined spaces in order to:
- Prevent serious injuries and major incidents during non-production work
- Reduce the risks of exposure to a hazardous atmosphere
- Structure coordination between the operator, workers, subcontractors and emergency services

**Regulatory references:** CNESST – energy control and confined spaces; RSST (Regulation respecting occupational health and safety)

**2) Scope**
This section applies to any activity on site involving:
- Maintenance, inspection, repair, unblocking, cleaning, adjustment, or any non-production intervention exposing workers to a hazardous zone
- Entry or work in a confined space (inspection, cleaning, maintenance, recovery, etc.)
- Work performed by internal employees or subcontractors`,
      },
      {
        id: '8.8',
        title: 'HOT WORK PERMIT AND COMPONENT BYPASS REQUEST',
        type: 'text',
        content: `**Hot Work Permit**
When performing work that may produce heat, flames or sparks, it is mandatory to obtain a hot work permit. This permit ensures that all safety measures are in place to prevent fire hazards.

**Bypass Request:** When work risks triggering the fire alarm system, such as work producing excessive dust, a bypass request must be submitted.

**Site Evacuation Plan:** Before work begins:
- The contractor or person responsible for the work must develop a site-specific evacuation plan
- This plan must mention "In case of emergency, dial 9-1-1"
- The site name, contractor name and update date must be included`,
      },
      {
        id: '8.9',
        title: 'COPY TO CONTRACTOR',
        type: 'text',
        content: `**CONDITIONS AND REQUIREMENTS**

**Equipment:**
- Ensure all equipment is in good working order
- Repair any leak or defect before use

**Precautions within 15 m radius:**
- Protect or move combustible objects/materials if necessary
- Block or cover openings to prevent sparks from passing through
- Clean the work area of all combustible or flammable materials
- Protect flammable gas pipes with a thermal barrier

**Additional measures:**
- Post the hot work permit notice at the site entrance
- Ensure elimination of combustible materials behind walls
- Place additional extinguishers near the work area
- Maintain continuous surveillance, even during breaks
- Ensure fire surveillance in adjacent areas if necessary
- Train at least one person in fire extinguisher use and emergency measures

**NON-COMPLIANCE**
In the event of non-compliance, the permit will be revoked and penalties may be applied.`,
      },
    ],
  };
}

// ============================================================
// EXPORT PRINCIPAL
// ============================================================

export function generateModule8(ctx: DocumentContext): any {
  return {
    fr: generateModule8FR(ctx),
    en: generateModule8EN(ctx),
  };
}