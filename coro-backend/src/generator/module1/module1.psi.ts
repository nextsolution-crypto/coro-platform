import { DocumentContext, REFERENCES } from './module1.context';

export function generateModule1PsiFR(ctx: DocumentContext): any {
  const ref = REFERENCES[ctx.province] || REFERENCES['Quebec'];
  const exerciceFrequence = ctx.hauteurBatiment ? ref.exerciceBGH : ref.exerciceStandard;
  const exerciceFrequenceCourt = ctx.hauteurBatiment ? 'Deux fois par an' : 'Une fois par an';
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

Le présent Plan de sécurité incendie (${docType}) est élaboré conformément à l'${ref.article} du ${ref.code}, ainsi qu'aux règlements municipaux applicables.

Ses objectifs sont :
- D'assurer la sécurité de toutes les personnes présentes sur le site, incluant les employés, visiteurs, fournisseurs et autres parties prenantes ;
- De protéger les biens matériels de l'entreprise ;
- De permettre une évacuation rapide, ordonnée et sécuritaire en cas d'incendie.

Le présent ${docType} définit les procédures d'intervention en cas de situations telles que :
- Découverte de fumée ou de flammes ;
- Activation du système d'alarme incendie ;
- Bris de gicleurs ou défaillance d'un système de protection incendie ;
- Tout autre événement nécessitant une évacuation ou une intervention de sécurité incendie.

Il est mis à jour au moins une fois par année, conformément à l'${ref.article} du ${ref.code}, accompagné d'un programme de formation et d'exercices d'évacuation planifiés afin de maintenir un haut niveau de préparation.

**Portée**

Ce plan s'applique au site situé au ${ctx.buildingAddress}, exploité par ${ctx.clientName}, et couvre :
- L'ensemble des occupants permanents ou temporaires ;
- Les visiteurs et sous-traitants présents sur les lieux ;
- Les équipements de sécurité incendie en place.

Il précise :
- Les rôles et responsabilités des intervenants désignés (responsable du bâtiment, personnel de surveillance) ;
- Les procédures d'évacuation et de communication en situation d'urgence incendie ;
- Les mesures de gestion post-événement (retour à la normale, bilan).

Le plan est conçu pour être appliqué en collaboration avec :
- Les services d'urgence locaux (incendie, police, services médicaux d'urgence) ;
- Les responsables désignés sur le site ;${ctx.multiLocataires ? '\n- Les intervenants externes, partenaires ou locataires, afin d\'assurer une coordination efficace en cas d\'urgence.' : '\n- Les intervenants externes et partenaires.'}`,
      },
      {
        id: '1.2',
        title: 'RESPONSABILITÉ DU CONTENU',
        content: `**Responsable principal du plan**

La responsabilité de l'élaboration, de la mise à jour annuelle, de la diffusion et de l'application du présent Plan de sécurité incendie (${docType}) revient au ${responsableTitre} de ${ctx.clientName}.

Ce dernier s'assure que le plan est :
- Conforme aux lois et règlements en vigueur, incluant l'${ref.article} du ${ref.code} ;
- Adapté aux particularités du site ;
- Validé périodiquement par le biais de formations, d'exercices et de revues opérationnelles.

Le relevé technique à la base du présent plan a été effectué le : **${ctx.dateReleve || '[DATE DU RELEVÉ]'}**
Les informations contenues dans ce document reflètent l'état du bâtiment à cette date.

**Responsabilités liées au Plan de sécurité incendie**

Le ${responsableTitre} ou son délégué doit :
- Mettre en œuvre et actualiser le ${docType} au moins une fois par année, ou à la suite de toute modification significative du bâtiment ou de son occupation ;
- Conserver une copie physique du plan à l'intérieur du panneau d'alarme incendie ou à proximité immédiate, tel qu'exigé par le code applicable ;${ctx.multiLocataires ? '\n- Diffuser les consignes pertinentes à chaque nouvelle occupation, déménagement ou modification de configuration.' : ''}

**Responsabilités du responsable du ${docType}**

Le responsable du Plan de sécurité incendie est chargé de :
- Organiser une séance d'information annuelle pour les occupants du bâtiment${ctx.multiLocataires ? ' et les locataires' : ''} ;
- Informer et sensibiliser tous les occupants aux procédures d'évacuation et à la sécurité incendie ;
- Coordonner un exercice d'évacuation annuel, en produire un rapport et identifier les pistes d'amélioration ;
- Maintenir un registre des personnes ayant besoin d'assistance à l'évacuation.

**Gestion technique des infrastructures et des équipements de sécurité**

Le responsable des opérations ou de la gestion immobilière doit :
- Afficher des plans d'évacuation à jour à chaque étage, à proximité des ascenseurs ou sorties principales ;
- Veiller à ce que les issues de secours soient dégagées, accessibles et dûment identifiées en tout temps ;
- S'assurer de la fonctionnalité et de l'accessibilité des équipements de protection incendie ;
- Planifier et consigner toutes les inspections, tests et entretiens réglementaires, en conformité avec les normes applicables (notamment CAN/ULC-S536 et code applicable).

**Décharge de responsabilité**

${ctx.companyName} s'engage à fournir à ses clients des services et conseils professionnels rigoureux, fondés sur les normes, lois et règlements applicables en matière de sécurité incendie, notamment ceux en vigueur dans la province de ${ctx.province}.

Les recommandations émises dans le présent plan sont élaborées à partir :
- D'un relevé technique du bâtiment effectué à la date mentionnée ;
- Des informations fournies par le client lorsque ceux-ci ne sont pas vérifiables par le conseiller ;
- Des meilleures pratiques de l'industrie ;
- Des exigences réglementaires connues au moment de la rédaction.

Cependant :
- L'adoption, l'interprétation et la mise en œuvre des recommandations relèvent exclusivement de la responsabilité du client.
- En cas de non-application partielle ou totale, ${ctx.companyName} dégage toute responsabilité.
- Le présent document n'a pas force de loi et ne se substitue ni aux règlements municipaux, ni aux exigences des services d'incendie locaux.

**Propriété intellectuelle**

Toute reproduction, adaptation, diffusion ou utilisation partielle ou intégrale du plan sans l'accord préalable et écrit de ${ctx.companyName} est strictement interdite.`,
      },
      {
        id: '1.3',
        title: 'FORMATION ET FRÉQUENCE',
        content: `**Objectif**

L'objectif des formations est d'assurer que le personnel de surveillance et les occupants du bâtiment possèdent les connaissances nécessaires pour réagir efficacement lors d'une situation d'urgence incendie, conformément au présent Plan de sécurité incendie.

La formation vise à :
- Clarifier les responsabilités du personnel de surveillance ;
- Développer une maîtrise des procédures d'évacuation incendie ;
- Sensibiliser les occupants aux comportements sécuritaires ;
- Maintenir une culture de sécurité incendie au sein du bâtiment.

**Obligations réglementaires**

Conformément à l'${ref.articleFormation}, le personnel chargé de la mise en œuvre du plan de sécurité incendie doit recevoir une formation adéquate et continue, adaptée aux spécificités du bâtiment.

**Contenu de la formation**

La formation comprend les sujets suivants :
- Procédures d'évacuation propres au bâtiment ;
- Fonctionnement du système d'alarme incendie (signal simple ou double) ;
- Utilisation des équipements de protection incendie de base : extincteurs portatifs ;
- Support aux personnes ayant besoin d'assistance à l'évacuation ;
- Consignes à transmettre aux occupants lors d'une alarme incendie.

**Fréquence des formations**

| Moment | Type de formation | Obligation |
|---|---|---|
| À l'entrée en fonction | Formation initiale | Obligatoire pour tout nouveau responsable ou membre du personnel de surveillance |
| Chaque année | Formation de maintien | Obligatoire — conformément à l'${ref.article} du ${ref.code} |
| ${exerciceFrequenceCourt} | Exercice d'évacuation pratique | ${ctx.hauteurBatiment ? 'Obligatoire pour les bâtiments à grande hauteur (BGH)' : 'Obligatoire — au moins une fois par année'} |

**Suivi et traçabilité**

- Une feuille de présence est signée à chaque session de formation ;
- Les données sont inscrites dans le Registre de formation du ${docType} ;
- Le responsable désigné s'assure que la fréquence des formations respecte les exigences réglementaires.`,
      },
      {
        id: '1.4',
        title: "EXERCICE D'ÉVACUATION",
        content: `Conformément à l'${ref.articleExercice}, un exercice d'évacuation doit être réalisé ${exerciceFrequence} dans tout bâtiment assujetti à un plan de sécurité incendie${ctx.hauteurBatiment ? '. Ce bâtiment étant un bâtiment à grande hauteur (BGH), la fréquence minimale est augmentée conformément au code applicable.' : '.'}

**1.4.1 Planification et exécution**

- L'exercice est planifié à l'avance par le responsable désigné.
- Chaque exercice vise à valider les procédures d'évacuation incendie et à identifier les lacunes.
- Il doit être adapté à la configuration du bâtiment et à son occupation.

**1.4.2 Observation et évaluation**

Des observateurs désignés évaluent :
- La réactivité des occupants à l'alarme incendie ;
- Le respect des itinéraires d'évacuation ;
- Le temps d'évacuation global.

**1.4.3 Objectifs des exercices**

- Familiariser les occupants avec les consignes d'évacuation et le point de rassemblement ;
- Identifier les personnes nécessitant une assistance et mettre à jour les registres ;
- Valider le bon fonctionnement du système d'alarme incendie ;
- Développer les réflexes appropriés en cas d'alarme réelle.

**1.4.4 Suivi post-exercice**

- Un débriefing est organisé avec les parties prenantes ;
- Le ${docType} est mis à jour si nécessaire suite aux constats de l'exercice ;
- Les rapports d'exercice sont conservés minimum 24 mois dans les registres du bâtiment.`,
      },
      {
        id: '1.5',
        title: 'HISTORIQUE DES MISES À JOUR',
        content: `**1.5.1 Journal des modifications**

Le présent Plan de sécurité incendie (${docType}) est un document évolutif qui doit être révisé au moins une fois tous les 12 mois, conformément à l'${ref.articleRevision} du ${ref.description}.

| Date | Description de la modification | Personne responsable |
|---|---|---|
${(ctx.historiqueList && ctx.historiqueList.length > 0
  ? ctx.historiqueList.map(h => `| ${h.date || '—'} | ${h.type || '—'} | ${h.responsable || '—'} |`).join('\n')
  : `| ${ctx.dateReleve || '—'} | ${ctx.versionDocument || 'Création initiale'} | ${ctx.responsableNom || '—'} |`
)}

**Révisions périodiques et déclencheurs particuliers**

Une mise à jour doit être effectuée sans délai lorsque survient l'un des événements suivants :
- Une modification aux aménagements ou à l'occupation du bâtiment ;
- Un changement dans les systèmes de sécurité incendie ou les équipements ;
- Un incident incendie ou une alarme déclenchée ;
- Un exercice d'évacuation identifiant des lacunes à corriger.`,
      },
      {
        id: '1.6',
        title: 'DÉFINITIONS ET TERMES',
        isEditable: true,
        content: `Les définitions suivantes visent à assurer une compréhension uniforme des termes employés dans le présent Plan de sécurité incendie.

**Accompagnateur pour personne nécessitant de l'aide à l'évacuation** : Personne désignée chargée d'assister les occupants ayant des limitations fonctionnelles lors d'une évacuation incendie.

**Confinement** : Procédure consistant à demeurer à l'intérieur d'une zone sécurisée lorsque l'évacuation par les corridors n'est pas sécuritaire en raison de la fumée ou des flammes.

**Évacuation** : Déplacement organisé et sécuritaire des occupants vers l'extérieur du bâtiment, conformément aux itinéraires définis dans le ${docType}.

**Personnel de surveillance** : Personne désignée par le responsable du bâtiment pour assurer la mise en œuvre des procédures d'évacuation lors d'une alarme incendie.

**Plan de sécurité incendie (${docType})** : Document officiel décrivant les procédures d'évacuation, les responsabilités et les équipements de sécurité incendie du bâtiment.

**Point de rassemblement** : Emplacement extérieur prédéfini où les occupants se regroupent après l'évacuation du bâtiment.

**Responsable du PSI** : Personne désignée responsable de l'élaboration, de la mise à jour et de l'application du Plan de sécurité incendie.

**Signal d'alarme incendie** : Signal sonore et/ou visuel déclenché pour alerter les occupants d'un incendie nécessitant l'évacuation du bâtiment.

**Système d'alarme incendie** : Ensemble des dispositifs de détection et de signalisation permettant d'alerter les occupants et les services d'urgence en cas d'incendie.`,
      },
    ],
  };
}

export function generateModule1PsiEN(ctx: DocumentContext): any {
  const ref = REFERENCES[ctx.province] || REFERENCES['Quebec'];
  const exerciceFrequence = ctx.hauteurBatiment ? ref.exerciceBGH_en : ref.exerciceStandard_en;
  const exerciceFrequenceCourt = ctx.hauteurBatiment ? 'Twice per year' : 'Once per year';
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

This Fire Safety Plan (${docType}) has been prepared in accordance with ${ref.article_en} of the ${ref.code_en}, as well as applicable municipal regulations.

Its objectives are:
- To ensure the safety of all persons present on site, including employees, visitors, suppliers, and other stakeholders;
- To protect the company's physical assets;
- To enable a rapid, orderly, and safe evacuation in the event of a fire.

This ${docType} defines intervention procedures for situations such as:
- Discovery of smoke or flames;
- Activation of the fire alarm system;
- Sprinkler failure or fire protection system deficiency;
- Any other event requiring evacuation or fire safety intervention.

It is updated at least once per year, in accordance with ${ref.article_en} of the ${ref.code_en}, supported by a training program and planned evacuation drills.

**Scope**

This plan applies to the site located at ${ctx.buildingAddress}, operated by ${ctx.clientName}, and covers:
- All permanent and temporary occupants;
- Visitors and subcontractors on the premises;
- Fire safety equipment in place.

It defines:
- The roles and responsibilities of designated personnel (building manager, surveillance staff);
- Evacuation and communication procedures in fire emergencies;
- Post-event management measures (return to normal, debriefing).

The plan is designed to be implemented in collaboration with:
- Local emergency services (fire, police, emergency medical services);
- Designated on-site personnel;${ctx.multiLocataires ? '\n- External stakeholders, partners, and tenants.' : '\n- External stakeholders and partners.'}`,
      },
      {
        id: '1.2',
        title: 'CONTENT RESPONSIBILITY',
        content: `**Primary Responsible Party**

The responsibility for developing, annually updating, distributing, and implementing this Fire Safety Plan (${docType}) rests with the ${responsableTitre} of ${ctx.clientName}.

This individual ensures that the plan is:
- Compliant with applicable laws and regulations, including ${ref.article_en} of the ${ref.code_en};
- Adapted to the specific characteristics of the site;
- Periodically validated through training, drills, and operational reviews.

The technical survey on which this plan is based was conducted on: **${ctx.dateReleve || '[DATE OF SURVEY]'}**

**Responsibilities Related to the Fire Safety Plan**

The ${responsableTitre} or their delegate must:
- Implement and update the ${docType} at least once per year;
- Maintain a physical copy of the plan inside or adjacent to the fire alarm panel, as required by applicable code;${ctx.multiLocataires ? '\n- Distribute relevant instructions at each new occupancy or configuration change.' : ''}

**Responsibilities of the ${docType} Administrator**

The Fire Safety Plan administrator is responsible for:
- Organizing an annual information session for building occupants${ctx.multiLocataires ? ' and tenants' : ''};
- Educating all occupants about evacuation procedures and fire safety;
- Coordinating an annual evacuation drill and producing an evaluation report;
- Maintaining an up-to-date register of persons requiring evacuation assistance.

**Technical Management of Safety Equipment**

The operations officer must:
- Post up-to-date evacuation plans on each floor, near elevators or main exits;
- Ensure emergency exits are clear and properly identified at all times;
- Ensure the functionality of fire protection equipment;
- Document all regulatory inspections and maintenance in compliance with applicable standards (including CAN/ULC-S536).

**Disclaimer**

${ctx.companyName} is committed to providing rigorous professional services based on applicable fire safety standards, laws, and regulations in the province of ${ctx.province}.

However:
- Implementation of recommendations is the exclusive responsibility of the client.
- ${ctx.companyName} assumes no liability for consequences of non-application.
- This document does not supersede municipal regulations or local fire department requirements.

**Intellectual Property**

Any reproduction or use of this plan without prior written consent of ${ctx.companyName} is strictly prohibited.`,
      },
      {
        id: '1.3',
        title: 'TRAINING AND FREQUENCY',
        content: `**Objective**

Training ensures that surveillance personnel and building occupants have the knowledge to respond effectively during a fire emergency, in accordance with this Fire Safety Plan.

**Regulatory Requirements**

In accordance with ${ref.articleFormation_en}, personnel responsible for implementing the fire safety plan must receive adequate and ongoing training.

**Training Content**

- Evacuation procedures specific to the building;
- Fire alarm system operation (single or double signal);
- Basic use of fire protection equipment: portable extinguishers;
- Support for persons requiring evacuation assistance;
- Instructions to communicate to occupants during a fire alarm.

**Training Frequency**

| Timing | Type of Training | Obligation |
|---|---|---|
| Upon hiring | Initial training | Mandatory for all new surveillance personnel |
| Annually | Skills maintenance | Mandatory — per ${ref.article_en} of the ${ref.code_en} |
| ${exerciceFrequenceCourt} | Practical evacuation drill | ${ctx.hauteurBatiment ? 'Mandatory for high-rise buildings' : 'Mandatory — at least once per year'} |

**Tracking**

- Attendance sheets signed at each training session;
- Data recorded in the ${docType} Training Register.`,
      },
      {
        id: '1.4',
        title: 'EVACUATION DRILL',
        content: `In accordance with ${ref.articleExercice_en}, an evacuation drill must be conducted ${exerciceFrequence} in all buildings subject to a fire safety plan${ctx.hauteurBatiment ? '. As this is a high-rise building, the minimum frequency is increased.' : '.'}

**1.4.1 Planning and Execution**

- The drill is planned in advance by the designated responsible person.
- Each drill validates fire evacuation procedures and identifies gaps.
- It must be adapted to the building's configuration and occupancy.

**1.4.2 Observation and Evaluation**

Designated observers evaluate:
- Occupant responsiveness to the fire alarm;
- Compliance with evacuation routes;
- Overall evacuation time.

**1.4.3 Drill Objectives**

- Familiarize occupants with evacuation instructions and the assembly point;
- Identify persons requiring assistance and update registers;
- Validate the proper functioning of the fire alarm system;
- Develop appropriate reflexes in the event of a real alarm.

**1.4.4 Post-Drill Follow-Up**

- A debriefing is organized with all stakeholders;
- The ${docType} is updated as necessary based on drill findings;
- Drill reports are retained for a minimum of 24 months.`,
      },
      {
        id: '1.5',
        title: 'REVISION HISTORY',
        content: `**1.5.1 Modification Log**

This Fire Safety Plan (${docType}) must be reviewed at least once every 12 months, in accordance with ${ref.articleRevision_en} of the ${ref.description_en}.

| Date | Description of Modification | Responsible Person |
|---|---|---|
${(ctx.historiqueList && ctx.historiqueList.length > 0
  ? ctx.historiqueList.map(h => `| ${h.date || '—'} | ${h.type || '—'} | ${h.responsable || '—'} |`).join('\n')
  : `| ${ctx.dateReleve || '—'} | ${ctx.versionDocument || 'Initial creation'} | ${ctx.responsableNom || '—'} |`
)}

**Specific Triggers for Updates**

An update must be made when:
- Building layout or occupancy changes;
- Fire safety systems or equipment changes;
- A fire incident or triggered alarm occurs;
- An evacuation drill identifies gaps to correct.`,
      },
      {
        id: '1.6',
        title: 'DEFINITIONS AND TERMS',
        isEditable: true,
        content: `The following definitions ensure a uniform understanding of terms used in this Fire Safety Plan.

**Person Requiring Evacuation Assistance**: A designated person responsible for assisting occupants with functional limitations during a fire evacuation.

**Confinement / Shelter-in-Place**: A procedure requiring occupants to remain within a secured area when corridor evacuation is not safe due to smoke or flames.

**Evacuation**: The organized movement of occupants to the exterior of the building, in accordance with the routes defined in the ${docType}.

**Fire Safety Plan (${docType})**: Official document describing evacuation procedures, responsibilities, and fire safety equipment for the building.

**Assembly Point**: A pre-defined exterior location where occupants gather following building evacuation.

**Fire Safety Plan Administrator**: The designated person responsible for developing, updating, and implementing the Fire Safety Plan.

**Fire Alarm Signal**: An audible and/or visual signal activated to alert occupants of a fire requiring building evacuation.

**Fire Alarm System**: The set of detection and signaling devices that alert occupants and emergency services in the event of a fire.

**Surveillance Personnel**: Person designated by the building manager to implement evacuation procedures during a fire alarm.`,
      },
    ],
  };
}