export interface DocumentContext {
  clientName: string;
  buildingName: string;
  buildingAddress: string;
  city: string;
  province: string;
  year: number;
  documentType: string;
  responsableNom: string;
  responsableTitre: string;
  dateReleve: string;
  floors: number;
  hauteurBatiment: boolean;
  multiLocataires: boolean;
  companyName: string;
}

interface ReglementRef {
  code: string;
  article: string;
  description: string;
  articleFormation: string;
  articleExercice: string;
  articleRevision: string;
  exerciceStandard: string;
  exerciceBGH: string;
  // Anglais
  code_en: string;
  article_en: string;
  description_en: string;
  articleFormation_en: string;
  articleExercice_en: string;
  articleRevision_en: string;
  exerciceStandard_en: string;
  exerciceBGH_en: string;
}

const REFERENCES: Record<string, ReglementRef> = {
  Quebec: {
    code: 'Code national de prévention des incendies – Canada 2010, incorporé au Chapitre VIII du Code de sécurité du Québec (RLRQ, c. B-1.1, r. 3)',
    article: 'section 2.8',
    description: 'Code de sécurité du Québec (RLRQ, c. B-1.1, r. 3)',
    articleFormation: 'article 2.8.2.1 (3) du CNPI 2010 modifié',
    articleExercice: 'article 2.8.3.2 du Code national de prévention des incendies – Canada 2010, incorporé au Chapitre VIII du Code de sécurité du Québec',
    articleRevision: 'article 2.8.2.1 (4) du Code national de prévention des incendies – Canada 2010',
    exerciceStandard: 'au moins une fois par année',
    exerciceBGH: 'au moins deux fois par année',
    code_en: 'National Fire Code of Canada 2010, incorporated into Chapter VIII of the Quebec Safety Code (CQLR, c. B-1.1, r. 3)',
    article_en: 'section 2.8',
    description_en: 'Quebec Safety Code (CQLR, c. B-1.1, r. 3)',
    articleFormation_en: 'article 2.8.2.1 (3) of the amended NFCC 2010',
    articleExercice_en: 'article 2.8.3.2 of the National Fire Code of Canada 2010, incorporated into Chapter VIII of the Quebec Safety Code',
    articleRevision_en: 'article 2.8.2.1 (4) of the National Fire Code of Canada 2010',
    exerciceStandard_en: 'at least once per year',
    exerciceBGH_en: 'at least twice per year',
  },
  Ontario: {
    code: 'Ontario Fire Code (O. Reg. 213/07) sous la Loi sur la prévention et la protection contre l\'incendie, 1997 (FPPA)',
    article: 'Division B, Section 2.8',
    description: 'Ontario Fire Code (O. Reg. 213/07)',
    articleFormation: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
    articleExercice: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
    articleRevision: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
    exerciceStandard: 'au moins une fois par année',
    exerciceBGH: 'aux trois mois (minimum 4 fois par année)',
    code_en: 'Ontario Fire Code (O. Reg. 213/07) under the Fire Protection and Prevention Act, 1997 (FPPA)',
    article_en: 'Division B, Section 2.8',
    description_en: 'Ontario Fire Code (O. Reg. 213/07)',
    articleFormation_en: 'Division B, Section 2.8 of the Ontario Fire Code (O. Reg. 213/07)',
    articleExercice_en: 'Division B, Section 2.8 of the Ontario Fire Code (O. Reg. 213/07)',
    articleRevision_en: 'Division B, Section 2.8 of the Ontario Fire Code (O. Reg. 213/07)',
    exerciceStandard_en: 'at least once per year',
    exerciceBGH_en: 'every three months (minimum 4 times per year)',
  },
  Alberta: {
    code: 'National Fire Code – 2023 Alberta Edition (NFC(AE))',
    article: 'Section 2.8',
    description: 'National Fire Code – 2023 Alberta Edition (NFC(AE)) sous la Safety Codes Act',
    articleFormation: 'article 2.8.2.1 (3) du NFC(AE)',
    articleExercice: 'article 2.8.3.1 du National Fire Code – 2023 Alberta Edition (NFC(AE))',
    articleRevision: 'article 2.8.2.1 (4) du NFC(AE)',
    exerciceStandard: 'au moins une fois par année (intervalles max 12 mois)',
    exerciceBGH: 'aux deux mois (minimum 6 fois par année)',
    code_en: 'National Fire Code – 2023 Alberta Edition (NFC(AE))',
    article_en: 'Section 2.8',
    description_en: 'National Fire Code – 2023 Alberta Edition (NFC(AE)) under the Safety Codes Act',
    articleFormation_en: 'article 2.8.2.1 (3) of the NFC(AE)',
    articleExercice_en: 'article 2.8.3.1 of the National Fire Code – 2023 Alberta Edition (NFC(AE))',
    articleRevision_en: 'article 2.8.2.1 (4) of the NFC(AE)',
    exerciceStandard_en: 'at least once per year (maximum 12-month intervals)',
    exerciceBGH_en: 'every two months (minimum 6 times per year)',
  },
};

function generateModule1FR(ctx: DocumentContext): any {
  const ref = REFERENCES[ctx.province] || REFERENCES['Quebec'];
  const exerciceFrequence = ctx.hauteurBatiment ? ref.exerciceBGH : ref.exerciceStandard;
  const docType = ctx.documentType;
  const responsableTitre = ctx.responsableTitre || 'Directeur(trice) de la sécurité';

  return {
    moduleNumber: 1,
    title: 'INTRODUCTION',
    language: 'fr',
    sections: [
      {
        id: '1.1',
        title: 'OBJET ET PORTÉE',
        content: `**Objet**

Ce plan de mesures d'urgence (${docType}) est élaboré conformément à la ${ref.article} du ${ref.code}, ainsi qu'aux règlements municipaux applicables.

Ses objectifs sont :
- D'assurer la sécurité de toutes les personnes présentes sur le site, incluant les employés, visiteurs, fournisseurs et autres parties prenantes ;
- De protéger les biens matériels de l'entreprise ;
- De permettre une reprise rapide et structurée des activités normales à la suite d'une urgence.

Le présent ${docType} définit les procédures d'intervention en cas d'urgences telles que :
- Incendie ;
- Fuite de gaz ;
- Déversement de matières dangereuses ;
- Bris de gicleurs ou autre système de protection ;
- Panne de courant ou d'ascenseur ;
- Tout autre événement nécessitant une réaction coordonnée.

Il est mis à jour au moins une fois par année, accompagné d'un programme de formation continue et d'exercices d'évacuation planifiés afin de maintenir un haut niveau de préparation opérationnelle.

**Portée**

Ce plan s'applique au site situé au ${ctx.buildingAddress}, exploité par ${ctx.clientName}, et couvre :
- L'ensemble des occupants permanents ou temporaires ;
- Les visiteurs et sous-traitants présents sur les lieux ;
- Les équipements de sécurité incendie en place ;
- Les procédures opérationnelles spécifiques au bâtiment.

Il précise :
- Les rôles et responsabilités des intervenants internes (coordonnateur d'urgence, équipe d'intervention, personnel de sécurité) ;
- Les procédures d'évacuation, s'il y a lieu, de confinement et de communication en situation d'urgence ;
- Les mesures de gestion post-événement (retour à la normale, bilan, communication).

Le plan est conçu pour être appliqué en collaboration avec :
- Les services d'urgence locaux (incendie, police, services médicaux d'urgence) ;
- Les responsables désignés sur le site ;${ctx.multiLocataires ? '\n- Les intervenants externes, partenaires ou locataires, afin d\'assurer une coordination efficace en cas d\'urgence.' : '\n- Les intervenants externes et partenaires, afin d\'assurer une coordination efficace en cas d\'urgence.'}`,
      },
      {
        id: '1.2',
        title: 'RESPONSABILITÉ DU CONTENU',
        content: `**Responsable principal du plan**

La responsabilité de l'élaboration, de la mise à jour annuelle, de la diffusion et de l'application du présent plan de mesures d'urgence (${docType}) revient au [${responsableTitre}] de ${ctx.clientName}.

Ce dernier s'assure que le plan est :
- Conforme aux lois et règlements en vigueur, incluant la ${ref.article} du ${ref.code} ;
- Adapté aux particularités du site ;
- Validé périodiquement par le biais de formations, d'exercices et de revues opérationnelles.

Le relevé technique à la base du présent plan a été effectué le : **${ctx.dateReleve || '[DATE DU RELEVÉ]'}**
Les informations contenues dans ce document reflètent l'état du bâtiment à cette date.

**Responsabilités liées au plan de mesures d'urgence**

Le [${responsableTitre}] ou son délégué doit :
- Mettre en œuvre et actualiser le ${docType} au moins une fois par année, ou à la suite de toute modification significative du bâtiment ou de son occupation ;
- Conserver une copie physique du plan, facilement accessible à l'entrée du bâtiment tel que demandé par le code applicable ;
- Désigner un coordonnateur d'urgence responsable des interventions initiales, de l'évacuation et de la communication avec les services d'urgence ;${ctx.multiLocataires ? '\n- Diffuser le guide du locataire ou les consignes pertinentes à chaque nouvelle occupation, déménagement ou modification de configuration.' : ''}

**Responsabilités du responsable du ${docType}**

Le responsable du plan de mesures d'urgence est chargé de :
- Organiser une séance d'information annuelle pour les membres de l'équipe d'urgence${ctx.multiLocataires ? ' et les locataires' : ''} ;
- Informer et sensibiliser tous les occupants du bâtiment aux procédures d'évacuation, s'il y a lieu, de confinement, et à la sécurité incendie ;
- Coordonner un exercice d'évacuation annuel, en produire un rapport d'évaluation, et identifier les pistes d'amélioration ;
- Maintenir un registre des personnes ayant besoin d'assistance à l'évacuation à jour et accessible ;
- Effectuer des inspections préventives régulières dans les aires communes afin d'identifier les non-conformités, les risques potentiels ou les comportements à corriger.

**Gestion technique des infrastructures et des équipements de sécurité**

Le responsable des opérations ou de la gestion immobilière doit :
- Afficher des plans d'évacuation à jour à chaque étage, à proximité des ascenseurs ou sorties principales ;
- Veiller à ce que les issues de secours soient dégagées, accessibles et dûment identifiées en tout temps ;
- S'assurer de la fonctionnalité et de l'accessibilité des équipements de protection incendie (extincteurs, gicleurs, boyaux, détecteurs, etc.) ;
- Planifier et consigner toutes les inspections, tests et entretiens réglementaires, en conformité avec les normes applicables (notamment CAN/ULC-S536 et code applicable).

**Décharge de responsabilité**

${ctx.companyName} s'engage à fournir à ses clients des services et conseils professionnels rigoureux, fondés sur les normes, lois et règlements applicables en matière de sécurité incendie et de mesures d'urgence, notamment ceux en vigueur dans la province de ${ctx.province}.

Les recommandations émises dans le présent plan sont élaborées à partir :
- D'un relevé technique du bâtiment effectué à la date mentionnée ;
- Des informations fournies par le client lorsque ceux-ci ne sont pas vérifiables par le conseiller ;
- Des meilleures pratiques de l'industrie ;
- Des exigences réglementaires connues au moment de la rédaction.

Cependant :
- L'adoption, l'interprétation et la mise en œuvre des recommandations contenues dans ce document relèvent exclusivement de la responsabilité du client.
- En cas de non-application partielle ou totale, ${ctx.companyName} dégage toute responsabilité quant aux conséquences pouvant en découler (dommages matériels, blessures, pertes d'exploitation, etc.).
- Le présent document n'a pas force de loi et ne se substitue ni aux règlements municipaux, ni aux exigences particulières des services d'incendie locaux, ni à toute décision de l'autorité compétente.

**Propriété intellectuelle**

Toute reproduction, adaptation, diffusion ou utilisation partielle ou intégrale du plan sans l'accord préalable et écrit de ${ctx.companyName} est strictement interdite. Toute infraction pourra entraîner des sanctions civiles ou pénales.`,
      },
      {
        id: '1.3',
        title: 'FORMATION ET FRÉQUENCE',
        content: `**Objectif**

L'objectif des formations est d'assurer que chaque membre de l'équipe d'urgence possède les connaissances, les réflexes et les compétences opérationnelles nécessaires pour intervenir efficacement en situation d'urgence, conformément au plan de mesures d'urgence en vigueur.

La formation vise à :
- Clarifier les rôles et responsabilités individuels ;
- Développer une maîtrise des procédures d'évacuation et d'intervention ;
- Renforcer la gestion sécuritaire des occupants, notamment les personnes vulnérables ;
- Maintenir une culture de sécurité proactive au sein du bâtiment.

**Obligations réglementaires**

Conformément à l'${ref.articleFormation}, le personnel chargé de la mise en œuvre du plan de mesures d'urgence doit recevoir une formation adéquate et continue, adaptée aux spécificités du bâtiment et aux procédures en place.

**Contenu de la formation**

La formation comprend les sujets suivants :
- Procédures d'évacuation propres au bâtiment et aux divers étages ;
- Utilisation des équipements de protection incendie : extincteurs, stations manuelles d'alarme incendie, panneaux d'alarme incendie à simple ou double étape ;
- Protocoles de communication et coordination : chaîne de commandement, interaction avec les services d'urgence ;
- Support aux personnes ayant besoin d'assistance à l'évacuation ou vulnérables ;
- Consignes générales à transmettre aux occupants en situation d'urgence ;
- Risques spécifiques liés à l'occupation des lieux : locaux techniques, matières dangereuses, etc.

**Méthodes pédagogiques**

La formation est assurée selon une combinaison des approches suivantes :
- Sessions dirigées par un intervenant interne ou un formateur externe accrédité ;
- Supports pédagogiques numériques ou imprimés : manuels, vidéos explicatives, fiches de procédure ;
- Exercices pratiques : simulation d'évacuation, déploiement de l'équipe d'urgence, manipulation d'équipements.

**Fréquence des formations**

| Moment | Type de formation | Obligation |
|---|---|---|
| À l'entrée en fonction | Formation initiale | Obligatoire pour tout nouveau membre de l'équipe d'urgence |
| Chaque année | Formation de maintien des compétences | Obligatoire pour tous les membres actifs |
| Deux fois par an | Exercices pratiques (évacuation, simulations) | Recommandé pour renforcer l'application des connaissances |
| En tout temps | Formation spécifique | Recommandée si un employé a besoin de plus de support |

**Suivi et traçabilité**

- Une feuille de présence est signée à chaque session de formation ;
- Les données sont inscrites dans le Registre de formation du ${docType} ;
- Des évaluations ou mises en situation peuvent être utilisées pour valider les acquis ;
- Le coordonnateur d'urgence est responsable de s'assurer que la fréquence et la qualité des formations respectent les exigences du présent plan.`,
      },
      {
        id: '1.4',
        title: "EXERCICE D'ÉVACUATION",
        content: `Conformément à l'${ref.articleExercice}, un exercice d'évacuation doit être réalisé ${exerciceFrequence} dans tout bâtiment assujetti à un plan de mesures d'urgence${ctx.hauteurBatiment ? '. Ce bâtiment étant un bâtiment à grande hauteur (BGH), la fréquence minimale est augmentée conformément au code applicable.' : '.'}

**1.4.1 Planification et exécution**

- L'exercice annuel est planifié à l'avance par le coordonnateur d'urgence, en collaboration avec l'équipe d'intervention et les services de sécurité du bâtiment.
- Chaque exercice vise à valider les procédures, évaluer les comportements et identifier les écarts ou lacunes opérationnelles.
- Il doit intégrer les enseignements des exercices précédents et être adapté à la réalité du bâtiment (occupation, configuration, horaires, zones à risque, construction en cours, etc.).

**1.4.2 Observation et évaluation**

Des observateurs désignés (membres de l'équipe de gestion) sont mandatés pour évaluer :
- La réactivité des occupants ;
- Le respect des itinéraires et points de rassemblement ;
- La clarté des messages diffusés ;
- Le temps d'évacuation global.

Les observations sont consignées dans un rapport d'évacuation structuré, à l'aide du gabarit standardisé disponible à la section Registres et Annexes du présent document.

**1.4.3 Objectifs des exercices**

Les exercices poursuivent les objectifs suivants :
- Familiarisation des occupants avec les consignes, les itinéraires d'évacuation et le point de rassemblement ;
- Identification des personnes nécessitant une assistance (mobilité réduite, besoins particuliers) et mise à jour des registres ;
- Validation technique du système d'alarme incendie et de l'ensemble des dispositifs liés à l'évacuation ;
- Développement des réflexes d'urgence chez les occupants et les intervenants ;
- Renforcement de la crédibilité des procédures, afin de susciter une réponse sérieuse et ordonnée en cas d'événement réel.

**1.4.4 Suivi post-exercice**

- Une séance de retour d'expérience (post-mortem) est organisée avec les parties prenantes (coordonnateur d'urgence, observateurs, gestionnaires, sécurité, etc.) pour analyser les résultats et recommander des actions correctives.
- Le plan de mesures d'urgence est mis à jour si nécessaire, en fonction :
  - Des constats de l'exercice ;
  - Des modifications à la configuration du site ;
  - Des changements dans l'occupation des lieux (nouveaux locataires, zones réaménagées, etc.).
- Les rapports d'exercice doivent être conservés dans les registres du bâtiment pendant une période minimale de deux ans, ou selon les exigences spécifiques du service de sécurité incendie local.

**PROCÉDURE D'EXERCICE D'ÉVACUATION**

PLANIFICATION DE L'EXERCICE :
- Choisir un scénario pertinent (ex. incendie, fuite de gaz) ;
- Déterminer les objectifs spécifiques de l'exercice ;
- Informer les services d'urgence si leur présence est requise ;
- Aviser les occupants de la tenue d'un exercice (sans divulguer tous les détails pour maintenir le réalisme).

PRÉPARATION DE L'EXERCICE :
- S'assurer que le ${docType} est à jour et que le trousseau de clés pompier est disponible ;
- Préparer la clé du panneau incendie et les outils nécessaires (tournevis, clés Allen) ;
- Informer la centrale d'alarme pour éviter une mobilisation non intentionnelle des services d'urgence.

DÉROULEMENT DE L'EXERCICE :
- Déclencher l'alarme via une station manuelle ou autre dispositif autorisé ;
- Démarrer un chronomètre dès le déclenchement ;
- Superviser l'évacuation et la sécurité au point de rassemblement ;
- Arrêter le chronomètre lorsque tous les occupants sont rassemblés ;
- Réarmer le panneau incendie, remettre en fonction les systèmes (ascenseurs, ventilation) si nécessaire ;
- Autoriser le retour ordonné dans le bâtiment.

APRÈS L'EXERCICE :
- Confirmer à la centrale que l'exercice est terminé ;
- S'assurer que la centrale a reçu l'information de l'alarme dans un délai de 90 secondes suivant le déclenchement ;
- Tenir un débriefing avec l'équipe d'évacuation et noter les points forts et axes d'amélioration ;
- Compléter le Rapport d'évacuation (voir modèle en annexe) ;
- Mettre à jour le ${docType} si des modifications sont nécessaires.

RÈGLES DE DOCUMENTATION :
Le Rapport d'évacuation doit inclure :
- La date et l'heure de l'exercice ;
- Les objectifs visés ;
- Le scénario choisi ;
- Les temps d'évacuation par zone ;
- Les problèmes rencontrés et solutions proposées.
Tous les rapports sont conservés minimum 24 mois dans la section Registres et Annexes du ${docType}.`,
      },
      {
        id: '1.5',
        title: 'HISTORIQUE DES MISES À JOUR',
        content: `**1.5.1 Journal des modifications**

Ce plan de mesures d'urgence (${docType}) est un document évolutif qui doit être révisé au moins une fois tous les 12 mois, conformément à l'${ref.articleRevision} du ${ref.description}.

La responsabilité de cette révision incombe au [${responsableTitre}] ou à une personne désignée. Les modifications sont consignées dans le tableau suivant, qui sert d'historique officiel des mises à jour du document.

| Date | Description de la modification | Personne responsable |
|---|---|---|
| ${ctx.year}-01-01 | Création initiale du document | ${ctx.responsableNom || '[NOM]'} |
| | | |
| | | |

**Révisions périodiques et déclencheurs particuliers**

Outre la révision annuelle obligatoire, une mise à jour doit être effectuée sans délai lorsque survient l'un des événements suivants :
- Une modification aux opérations du bâtiment, aux aménagements ou à l'occupation ;
- Un changement dans les systèmes de sécurité, les équipements ou les fournisseurs ;
- Un incident (incendie, alarme déclenchée, déversement, etc.), qu'il soit fondé ou non fondé ;
- Un exercice d'évacuation ou un retour d'expérience des occupants, de l'équipe d'urgence ou des services municipaux.

Ces mises à jour assurent que le ${docType} demeure un outil actuel, opérationnel et conforme, au service de la sécurité de tous les occupants.

**1.5.2 Décharge de responsabilité**

${ctx.companyName} – Clause de non-responsabilité

${ctx.companyName} s'engage à fournir à ses clients des services et conseils professionnels rigoureux, fondés sur les normes, lois et règlements applicables en matière de sécurité incendie et de mesures d'urgence.

Les recommandations émises dans le présent plan sont élaborées à partir :
- D'un relevé technique du bâtiment effectué à la date mentionnée ;
- Des informations fournies par le client lorsque ceux-ci ne sont pas vérifiables par le conseiller ;
- Des meilleures pratiques de l'industrie ;
- Des exigences réglementaires connues au moment de la rédaction.

Cependant :
- L'adoption, l'interprétation et la mise en œuvre des recommandations contenues dans ce document relèvent exclusivement de la responsabilité du client.
- En cas de non-application partielle ou totale, ${ctx.companyName} dégage toute responsabilité quant aux conséquences pouvant en découler.
- Le présent document n'a pas force de loi et ne se substitue ni aux règlements municipaux, ni aux exigences particulières des services d'incendie locaux.`,
      },
      {
        id: '1.6',
        title: 'DÉFINITIONS ET TERMES',
        isEditable: true,
        content: `Les définitions suivantes visent à assurer une compréhension uniforme des termes employés dans le présent plan de mesures d'urgence. Elles sont classées par ordre alphabétique pour faciliter la consultation.

**Accompagnateur pour personne nécessitant de l'aide à l'évacuation** : Membre désigné chargé d'assister les personnes ayant des limitations fonctionnelles ou des besoins particuliers lors d'une évacuation, en collaboration avec l'équipe d'évacuation, pour garantir un déplacement sécuritaire et adapté.

**Brigadier** : Membre de l'équipe d'urgence positionné à des points stratégiques pour orienter les occupants vers le ou les points de rassemblement, assurant la fluidité des déplacements et la sécurité aux intersections.

**Chercheur** : Membre de l'équipe d'urgence désigné pour vérifier qu'aucune personne ne demeure dans une zone déterminée lors d'une évacuation, tout en veillant à sa propre sécurité.

**Confinement** : Procédure consistant à demeurer à l'intérieur d'une zone sécurisée du bâtiment en cas de menace externe (intempéries extrêmes, danger chimique, etc.), lorsque l'évacuation n'est pas sécuritaire.

**Coordonnateur d'urgence** : Personne désignée responsable de la gestion globale d'une situation d'urgence, supervisant la mise en œuvre des procédures, la coordination avec les services d'urgence et la mise à jour régulière du ${docType}.

**Éléments de détection** : Composants d'un système d'alarme incendie conçus pour identifier la présence de fumée, chaleur, flammes ou variation de débit des gicleurs.

**Équipements de premiers soins** : Trousse ou matériel médical destiné à traiter immédiatement une blessure ou une maladie soudaine, localisé et signalé pour un accès rapide.

**Équipe d'urgence** : Groupe de personnes formées et désignées pour appliquer les procédures prévues au ${docType} lors d'une urgence.

**Équipe de première intervention (EPI)** : Formée de 3 personnes minimum. Cette équipe est chargée d'évaluer rapidement la situation dès la détection d'un incident, sans mettre en péril leur sécurité.

**Évacuation** : Déplacement organisé et sécuritaire des occupants vers un lieu sûr, conformément aux itinéraires et protocoles définis dans le ${docType}.

**Matières dangereuses** : Substances présentant un danger pour la santé, la sécurité ou l'environnement, classifiées selon le SIMDUT et/ou le TMD, avec indication de leur emplacement et de leur numéro UN.

**Permis de travail à chaud** : Document autorisant temporairement des travaux produisant flammes, étincelles ou chaleur, délivré conformément aux normes de sécurité en vigueur.

**Plan de mesures d'urgence (${docType})** : Document officiel décrivant les procédures d'urgence, les rôles et responsabilités, ainsi que les moyens matériels et humains mis en œuvre pour protéger les personnes et les biens en cas d'urgence.

**Point de rassemblement** : Emplacement extérieur prédéfini où les occupants se regroupent après une évacuation, clairement indiqué et communiqué.

**Rapport d'inspection des équipements de protection incendie** : Document consignant les résultats des vérifications réglementaires des systèmes incendie, incluant alarmes, gicleurs et autres dispositifs.

**Relais auxiliaires** : Dispositifs intégrés au système d'alarme incendie déclenchant des actions automatiques (arrêt de ventilation, rappel des ascenseurs, déverrouillage des portes, activation du désenfumage).

**Responsable de secteur** : Membre de l'équipe d'urgence assigné à la supervision de l'évacuation d'une zone précise, rapportant au coordonnateur d'urgence.

**Responsable du point de rassemblement** : Membre de l'équipe d'urgence supervisant la sécurité et l'organisation des occupants au point de rassemblement.

**Responsable mécanique du bâtiment** : Personne possédant une connaissance technique approfondie des systèmes et infrastructures du bâtiment, fournissant un appui aux services d'urgence.

**Signal d'alarme incendie** : Signal sonore et/ou visuel déclenché pour alerter d'un incendie ou autre urgence nécessitant l'application des procédures d'évacuation.

**Surveillant de sortie** : Membre de l'équipe d'urgence positionné à une sortie pour faciliter et sécuriser le passage des occupants.

**Système de désenfumage** : Installation mécanique ou naturelle permettant l'extraction de fumée afin d'améliorer la visibilité et réduire les risques d'inhalation toxique.

**Système de gicleurs et protection incendie** : Installation fixe d'extinction automatique par eau, conçue pour protéger tout ou partie du bâtiment.`,
      },
    ],
  };
}

function generateModule1EN(ctx: DocumentContext): any {
  const ref = REFERENCES[ctx.province] || REFERENCES['Quebec'];
  const exerciceFrequence = ctx.hauteurBatiment ? ref.exerciceBGH_en : ref.exerciceStandard_en;
  const docType = ctx.documentType;
  const responsableTitre = ctx.responsableTitre || 'Director of Security';

  return {
    moduleNumber: 1,
    title: 'INTRODUCTION',
    language: 'en',
    sections: [
      {
        id: '1.1',
        title: 'PURPOSE AND SCOPE',
        content: `**Purpose**

This Emergency Response Plan (${docType}) has been prepared in accordance with ${ref.article_en} of the ${ref.code_en}, as well as applicable municipal regulations.

Its objectives are:
- To ensure the safety of all persons present on site, including employees, visitors, suppliers, and other stakeholders;
- To protect the company's physical assets;
- To enable a rapid and structured return to normal operations following an emergency.

This ${docType} defines intervention procedures for emergencies such as:
- Fire;
- Gas leak;
- Hazardous material spill;
- Sprinkler or fire protection system failure;
- Power outage or elevator malfunction;
- Any other event requiring a coordinated response.

It is updated at least once per year, supported by a continuous training program and planned evacuation drills to maintain a high level of operational readiness.

**Scope**

This plan applies to the site located at ${ctx.buildingAddress}, operated by ${ctx.clientName}, and covers:
- All permanent and temporary occupants;
- Visitors and subcontractors on the premises;
- Fire safety equipment in place;
- Building-specific operational procedures.

It defines:
- The roles and responsibilities of internal stakeholders (emergency coordinator, response team, security personnel);
- Evacuation, shelter-in-place, and communication procedures in emergency situations;
- Post-event management measures (return to normal, debriefing, communication).

The plan is designed to be implemented in collaboration with:
- Local emergency services (fire, police, emergency medical services);
- Designated on-site personnel;${ctx.multiLocataires ? '\n- External stakeholders, partners, and tenants, to ensure effective coordination in the event of an emergency.' : '\n- External stakeholders and partners, to ensure effective coordination in the event of an emergency.'}`,
      },
      {
        id: '1.2',
        title: 'CONTENT RESPONSIBILITY',
        content: `**Primary Responsible Party**

The responsibility for developing, annually updating, distributing, and implementing this Emergency Response Plan (${docType}) rests with the [${responsableTitre}] of ${ctx.clientName}.

This individual ensures that the plan is:
- Compliant with applicable laws and regulations, including ${ref.article_en} of the ${ref.code_en};
- Adapted to the specific characteristics of the site;
- Periodically validated through training, drills, and operational reviews.

The technical survey on which this plan is based was conducted on: **${ctx.dateReleve || '[DATE OF SURVEY]'}**
The information contained in this document reflects the condition of the building as of that date.

**Responsibilities Related to the Emergency Response Plan**

The [${responsableTitre}] or their delegate must:
- Implement and update the ${docType} at least once per year, or following any significant change to the building or its occupancy;
- Maintain a physical copy of the plan, easily accessible at the building entrance as required by applicable code;
- Designate an emergency coordinator responsible for initial response, evacuation, and communication with emergency services;${ctx.multiLocataires ? '\n- Distribute the tenant guide or relevant instructions at each new occupancy, relocation, or configuration change.' : ''}

**Responsibilities of the ${docType} Administrator**

The emergency plan administrator is responsible for:
- Organizing an annual information session for emergency team members${ctx.multiLocataires ? ' and tenants' : ''};
- Informing and educating all building occupants about evacuation procedures, shelter-in-place, and fire safety;
- Coordinating an annual evacuation drill, producing an evaluation report, and identifying areas for improvement;
- Maintaining an up-to-date and accessible register of persons requiring evacuation assistance;
- Conducting regular preventive inspections in common areas to identify non-conformities, potential hazards, or behaviors requiring correction.

**Technical Management of Infrastructure and Safety Equipment**

The operations or property management officer must:
- Post up-to-date evacuation plans on each floor, near elevators or main exits;
- Ensure that emergency exits are clear, accessible, and properly identified at all times;
- Ensure the functionality and accessibility of fire protection equipment (extinguishers, sprinklers, hoses, detectors, etc.);
- Plan and document all regulatory inspections, tests, and maintenance, in compliance with applicable standards (including CAN/ULC-S536 and applicable code).

**Disclaimer**

${ctx.companyName} is committed to providing its clients with rigorous professional services and advice based on applicable standards, laws, and regulations governing fire safety and emergency management in the province of ${ctx.province}.

The recommendations contained in this plan are based on:
- A technical survey of the building conducted on the date indicated;
- Information provided by the client when not independently verifiable by the consultant;
- Industry best practices;
- Regulatory requirements known at the time of drafting.

However:
- The adoption, interpretation, and implementation of the recommendations in this document are the exclusive responsibility of the client.
- In the event of partial or total non-application, ${ctx.companyName} assumes no liability for resulting consequences (property damage, injuries, business losses, etc.).
- This document does not have the force of law and does not supersede municipal regulations, local fire department requirements, or any decision by the competent authority.

**Intellectual Property**

Any reproduction, adaptation, distribution, or partial or total use of this plan without the prior written consent of ${ctx.companyName} is strictly prohibited. Any violation may result in civil or criminal penalties.`,
      },
      {
        id: '1.3',
        title: 'TRAINING AND FREQUENCY',
        content: `**Objective**

The objective of training is to ensure that each member of the emergency team possesses the knowledge, reflexes, and operational skills necessary to respond effectively in emergency situations, in accordance with the current emergency response plan.

Training aims to:
- Clarify individual roles and responsibilities;
- Develop proficiency in evacuation and intervention procedures;
- Strengthen the safe management of occupants, particularly vulnerable persons;
- Maintain a proactive safety culture within the building.

**Regulatory Requirements**

In accordance with ${ref.articleFormation_en}, personnel responsible for implementing the emergency response plan must receive adequate and ongoing training, adapted to the building's specific characteristics and procedures in place.

**Training Content**

Training covers the following topics:
- Evacuation procedures specific to the building and its various floors;
- Use of fire protection equipment: extinguishers, manual fire alarm stations, single or double-stage fire alarm panels;
- Communication and coordination protocols: chain of command, interaction with emergency services;
- Support for persons requiring evacuation assistance or who are vulnerable;
- General instructions to communicate to occupants in emergency situations;
- Specific risks related to the occupancy: mechanical rooms, hazardous materials, etc.

**Training Methods**

Training is delivered through a combination of the following approaches:
- Sessions led by an internal facilitator or accredited external trainer;
- Digital or printed educational materials: manuals, instructional videos, procedure sheets;
- Practical exercises: evacuation simulations, emergency team deployment, equipment handling.

**Training Frequency**

| Timing | Type of Training | Obligation |
|---|---|---|
| Upon hiring | Initial training | Mandatory for all new emergency team members |
| Annually | Skills maintenance training | Mandatory for all active members |
| Twice per year | Practical exercises (evacuation, simulations) | Recommended to reinforce knowledge application |
| As needed | Specific training | Recommended if an employee requires additional support |

**Tracking and Traceability**

- An attendance sheet is signed at each training session;
- Data is recorded in the ${docType} Training Register;
- Assessments or situational exercises may be used to validate learning outcomes;
- The emergency coordinator is responsible for ensuring that the frequency and quality of training meet the requirements of this plan.`,
      },
      {
        id: '1.4',
        title: 'EVACUATION DRILL',
        content: `In accordance with ${ref.articleExercice_en}, an evacuation drill must be conducted ${exerciceFrequence} in all buildings subject to an emergency response plan${ctx.hauteurBatiment ? '. As this building is a high-rise building, the minimum frequency is increased in accordance with applicable code.' : '.'}

**1.4.1 Planning and Execution**

- The annual drill is planned in advance by the emergency coordinator, in collaboration with the response team and building security services.
- Each drill aims to validate procedures, evaluate behaviors, and identify operational gaps or deficiencies.
- It must incorporate lessons learned from previous drills and be adapted to the realities of the building (occupancy, layout, schedules, risk zones, ongoing construction, etc.).

**1.4.2 Observation and Evaluation**

Designated observers (members of the management team) are tasked with evaluating:
- The responsiveness of occupants;
- Compliance with evacuation routes and assembly points;
- The clarity of communicated messages;
- The overall evacuation time.

Observations are recorded in a structured evacuation report using the standardized template available in the Registers and Appendices section of this document.

**1.4.3 Drill Objectives**

Drills pursue the following objectives:
- Familiarizing occupants with instructions, evacuation routes, and the assembly point;
- Identifying persons requiring assistance (reduced mobility, special needs) and updating registers;
- Technical validation of the fire alarm system and all evacuation-related devices;
- Developing emergency reflexes among occupants and responders;
- Reinforcing the credibility of procedures to promote a serious and orderly response in a real event.

**1.4.4 Post-Drill Follow-Up**

- A debriefing session (post-mortem) is organized with stakeholders (emergency coordinator, observers, managers, security, etc.) to analyze results and recommend corrective actions.
- The emergency response plan is updated as necessary, based on:
  - Findings from the drill;
  - Changes to the site configuration;
  - Changes in occupancy (new tenants, reconfigured areas, etc.).
- Drill reports must be retained in the building's records for a minimum period of two years, or as required by the local fire safety authority.

**EVACUATION DRILL PROCEDURE**

DRILL PLANNING:
- Select a relevant scenario (e.g., fire, gas leak);
- Define the specific objectives of the drill;
- Notify emergency services if their presence is required;
- Inform occupants of the upcoming drill (without disclosing all details to maintain realism).

DRILL PREPARATION:
- Ensure the ${docType} is current and that the fire department key box is available;
- Prepare the fire panel key and necessary tools (screwdriver, Allen keys);
- Notify the monitoring station to avoid an unintentional mobilization of emergency services.

DRILL EXECUTION:
- Activate the alarm via a manual station or other authorized device;
- Start a stopwatch at the time of activation;
- Supervise the evacuation and safety at the assembly point;
- Stop the stopwatch when all occupants are assembled;
- Reset the fire panel and restore systems (elevators, ventilation) as needed;
- Authorize an orderly return to the building.

AFTER THE DRILL:
- Confirm to the monitoring station that the drill is complete;
- Verify that the station received the alarm signal within 90 seconds of activation;
- Hold a debriefing with the evacuation team and note strengths and areas for improvement;
- Complete the Evacuation Report (see template in appendix);
- Update the ${docType} if any modifications are required.

DOCUMENTATION REQUIREMENTS:
The Evacuation Report must include:
- The date and time of the drill;
- The objectives;
- The scenario selected;
- Evacuation times by zone;
- Issues encountered and proposed solutions.
All reports are retained for a minimum of 24 months in the Registers and Appendices section of the ${docType}.`,
      },
      {
        id: '1.5',
        title: 'REVISION HISTORY',
        content: `**1.5.1 Modification Log**

This Emergency Response Plan (${docType}) is a living document that must be reviewed at least once every 12 months, in accordance with ${ref.articleRevision_en} of the ${ref.description_en}.

The responsibility for this review rests with the [${responsableTitre}] or a designated individual. Modifications are recorded in the table below, which serves as the official revision history for this document.

| Date | Description of Modification | Responsible Person |
|---|---|---|
| ${ctx.year}-01-01 | Initial document creation | ${ctx.responsableNom || '[NAME]'} |
| | | |
| | | |

**Periodic Reviews and Specific Triggers**

In addition to the mandatory annual review, an update must be made without delay when any of the following events occur:
- A change in building operations, layout, or occupancy;
- A change in security systems, equipment, or suppliers;
- An incident (fire, triggered alarm, spill, etc.), whether confirmed or unconfirmed;
- An evacuation drill or feedback from occupants, the emergency team, or municipal services.

These updates ensure that the ${docType} remains a current, operational, and compliant tool, serving the safety of all occupants.

**1.5.2 Disclaimer**

${ctx.companyName} – Liability Disclaimer

${ctx.companyName} is committed to providing its clients with rigorous professional services and advice, based on applicable standards, laws, and regulations governing fire safety and emergency management.

The recommendations in this plan are based on:
- A technical survey of the building conducted on the date indicated;
- Information provided by the client when not independently verifiable by the consultant;
- Industry best practices;
- Regulatory requirements known at the time of drafting.

However:
- The adoption, interpretation, and implementation of the recommendations are the exclusive responsibility of the client.
- In the event of partial or total non-implementation, ${ctx.companyName} assumes no liability for resulting consequences.
- This document does not have the force of law and does not supersede municipal regulations or local fire department requirements.`,
      },
      {
        id: '1.6',
        title: 'DEFINITIONS AND TERMS',
        isEditable: true,
        content: `The following definitions are intended to ensure a uniform understanding of the terms used in this emergency response plan. They are listed in alphabetical order for ease of reference.

**Brigadier / Floor Warden** : A member of the emergency team positioned at strategic points to direct occupants toward assembly points, ensuring the smooth flow of movement and safety at intersections.

**Confinement / Shelter-in-Place** : A procedure requiring occupants to remain within a secured area of the building in the event of an external threat (extreme weather, chemical hazard, etc.), when evacuation is not safe.

**Emergency Coordinator** : The designated person responsible for overall management of an emergency situation, overseeing the implementation of procedures, coordination with emergency services, and regular updates to the ${docType}.

**Emergency Response Plan (${docType})** : An official document describing emergency procedures, roles and responsibilities, and the human and material resources deployed to protect persons and property in an emergency.

**Emergency Team** : A group of trained and designated individuals responsible for implementing the procedures set out in the ${docType} during an emergency.

**Evacuation** : The organized and safe movement of occupants to a secure location, in accordance with the routes and protocols defined in the ${docType}.

**First Response Team (FRT)** : Comprised of a minimum of 3 persons. This team is responsible for rapidly assessing a situation upon detection of an incident, without endangering their own safety.

**Hazardous Materials** : Substances posing a risk to health, safety, or the environment, classified under WHMIS and/or TDG regulations, with indication of their location and UN number.

**Hot Work Permit** : A document temporarily authorizing work that produces flames, sparks, or heat, issued in accordance with applicable safety standards.

**Mechanical Building Supervisor** : A person with in-depth technical knowledge of building systems and infrastructure, providing support to emergency services.

**Person Requiring Evacuation Assistance (PREA)** : A designated individual responsible for assisting persons with functional limitations or special needs during an evacuation, in collaboration with the evacuation team, to ensure a safe and adapted departure.

**Searcher** : A member of the emergency team designated to verify that no person remains in a defined area during an evacuation, while ensuring their own safety.

**Secondary Assembly Point** : A pre-defined exterior location where occupants gather following an evacuation, clearly indicated and communicated.

**Sector Supervisor** : A member of the emergency team assigned to oversee the evacuation of a specific zone, reporting to the emergency coordinator.

**Smoke Control System** : A mechanical or natural installation designed to extract smoke and improve visibility, reducing the risk of toxic inhalation.

**Sprinkler and Fire Protection System** : A fixed automatic water-based suppression system designed to protect all or part of the building.

**Assembly Point Supervisor** : A member of the emergency team responsible for supervising the safety and organization of occupants at the assembly point.

**Auxiliary Relays** : Devices integrated into the fire alarm system that trigger automatic actions (ventilation shutdown, elevator recall, door unlocking, smoke control activation).

**Detection Elements** : Components of a fire alarm system designed to identify the presence of smoke, heat, flames, or changes in sprinkler flow rates.

**Exit Monitor** : A member of the emergency team positioned at an exit to facilitate and secure the passage of occupants.

**Fire Alarm Signal** : An audible and/or visual signal activated to alert occupants of a fire or other emergency requiring the implementation of evacuation procedures.

**First Aid Equipment** : A kit or medical supplies intended to provide immediate treatment for an injury or sudden illness, located and marked for rapid access.`,
      },
    ],
  };
}

export function generateModule1(ctx: DocumentContext): any {
  return {
    fr: generateModule1FR(ctx),
    en: generateModule1EN(ctx),
  };
}