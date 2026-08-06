import { DocumentContext, REFERENCES } from './module1.context';

export function generateModule1PmuFR(ctx: DocumentContext): any {
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

La responsabilité de l'élaboration, de la mise à jour annuelle, de la diffusion et de l'application du présent plan de mesures d'urgence (${docType}) revient au ${responsableTitre} de ${ctx.clientName}.

Ce dernier s'assure que le plan est :
- Conforme aux lois et règlements en vigueur, incluant la ${ref.article} du ${ref.code} ;
- Adapté aux particularités du site ;
- Validé périodiquement par le biais de formations, d'exercices et de revues opérationnelles.

Le relevé technique à la base du présent plan a été effectué le : **${ctx.dateReleve || '[DATE DU RELEVÉ]'}**
Les informations contenues dans ce document reflètent l'état du bâtiment à cette date.

**Responsabilités liées au plan de mesures d'urgence**

Le ${responsableTitre} ou son délégué doit :
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
| ${exerciceFrequenceCourt} | Exercices pratiques (évacuation, simulations) | ${ctx.hauteurBatiment ? 'Obligatoire pour les bâtiments à grande hauteur (BGH)' : 'Recommandé pour renforcer l\'application des connaissances'} |
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
- Il doit intégrer les enseignements des exercices précédents et être adapté à la réalité du bâtiment.

**1.4.2 Observation et évaluation**

Des observateurs désignés sont mandatés pour évaluer :
- La réactivité des occupants ;
- Le respect des itinéraires et points de rassemblement ;
- La clarté des messages diffusés ;
- Le temps d'évacuation global.

**1.4.3 Objectifs des exercices**

- Familiarisation des occupants avec les consignes, les itinéraires d'évacuation et le point de rassemblement ;
- Identification des personnes nécessitant une assistance et mise à jour des registres ;
- Validation technique du système d'alarme incendie ;
- Développement des réflexes d'urgence chez les occupants et les intervenants.

**1.4.4 Suivi post-exercice**

- Une séance de retour d'expérience est organisée avec les parties prenantes ;
- Le ${docType} est mis à jour si nécessaire ;
- Les rapports d'exercice sont conservés minimum 24 mois dans les registres.`,
      },
      {
        id: '1.5',
        title: 'HISTORIQUE DES MISES À JOUR',
        content: `**1.5.1 Journal des modifications**

Ce plan de mesures d'urgence (${docType}) est un document évolutif qui doit être révisé au moins une fois tous les 12 mois, conformément à l'${ref.articleRevision} du ${ref.description}.

| Date | Description de la modification | Personne responsable |
|---|---|---|
${(ctx.historiqueList && ctx.historiqueList.length > 0
  ? ctx.historiqueList.map(h => `| ${h.date || '—'} | ${h.type || '—'} | ${h.responsable || '—'} |`).join('\n')
  : `| ${ctx.dateReleve || '—'} | ${ctx.versionDocument || 'Création initiale'} | ${ctx.responsableNom || '—'} |`
)}

**Révisions périodiques et déclencheurs particuliers**

Une mise à jour doit être effectuée sans délai lorsque survient l'un des événements suivants :
- Une modification aux opérations du bâtiment, aux aménagements ou à l'occupation ;
- Un changement dans les systèmes de sécurité, les équipements ou les fournisseurs ;
- Un incident (incendie, alarme déclenchée, déversement, etc.) ;
- Un exercice d'évacuation ou un retour d'expérience.`,
      },
      {
        id: '1.6',
        title: 'DÉFINITIONS ET TERMES',
        isEditable: true,
        content: `Les définitions suivantes visent à assurer une compréhension uniforme des termes employés dans le présent plan de mesures d'urgence.

**Accompagnateur pour personne nécessitant de l'aide à l'évacuation** : Membre désigné chargé d'assister les personnes ayant des limitations fonctionnelles lors d'une évacuation.

**Brigadier** : Membre de l'équipe d'urgence positionné à des points stratégiques pour orienter les occupants vers le point de rassemblement.

**Chercheur** : Membre de l'équipe d'urgence désigné pour vérifier qu'aucune personne ne demeure dans une zone lors d'une évacuation.

**Confinement** : Procédure consistant à demeurer à l'intérieur d'une zone sécurisée lorsque l'évacuation n'est pas sécuritaire.

**Coordonnateur d'urgence** : Personne désignée responsable de la gestion globale d'une situation d'urgence.

**Équipe d'urgence** : Groupe de personnes formées et désignées pour appliquer les procédures prévues au ${docType}.

**Équipe de première intervention (EPI)** : Formée de 3 personnes minimum, chargée d'évaluer rapidement la situation dès la détection d'un incident.

**Évacuation** : Déplacement organisé et sécuritaire des occupants vers un lieu sûr.

**Matières dangereuses** : Substances présentant un danger, classifiées selon le SIMDUT et/ou le TMD.

**Plan de mesures d'urgence (${docType})** : Document officiel décrivant les procédures d'urgence, les rôles et responsabilités.

**Point de rassemblement** : Emplacement extérieur prédéfini où les occupants se regroupent après une évacuation.

**Responsable de secteur** : Membre de l'équipe d'urgence assigné à la supervision de l'évacuation d'une zone précise.

**Signal d'alarme incendie** : Signal sonore et/ou visuel déclenché pour alerter d'un incendie ou autre urgence.`,
      },
    ],
  };
}

export function generateModule1PmuEN(ctx: DocumentContext): any {
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

It is updated at least once per year, supported by a continuous training program and planned evacuation drills.

**Scope**

This plan applies to the site located at ${ctx.buildingAddress}, operated by ${ctx.clientName}, and covers:
- All permanent and temporary occupants;
- Visitors and subcontractors on the premises;
- Fire safety equipment in place;
- Building-specific operational procedures.

It defines:
- The roles and responsibilities of internal stakeholders (emergency coordinator, response team, security personnel);
- Evacuation, shelter-in-place, and communication procedures;
- Post-event management measures (return to normal, debriefing, communication).

The plan is designed to be implemented in collaboration with:
- Local emergency services (fire, police, emergency medical services);
- Designated on-site personnel;${ctx.multiLocataires ? '\n- External stakeholders, partners, and tenants, to ensure effective coordination.' : '\n- External stakeholders and partners, to ensure effective coordination.'}`,
      },
      {
        id: '1.2',
        title: 'CONTENT RESPONSIBILITY',
        content: `**Primary Responsible Party**

The responsibility for developing, annually updating, distributing, and implementing this Emergency Response Plan (${docType}) rests with the ${responsableTitre} of ${ctx.clientName}.

This individual ensures that the plan is:
- Compliant with applicable laws and regulations, including ${ref.article_en} of the ${ref.code_en};
- Adapted to the specific characteristics of the site;
- Periodically validated through training, drills, and operational reviews.

The technical survey on which this plan is based was conducted on: **${ctx.dateReleve || '[DATE OF SURVEY]'}**

**Responsibilities Related to the Emergency Response Plan**

The ${responsableTitre} or their delegate must:
- Implement and update the ${docType} at least once per year;
- Maintain a physical copy of the plan, easily accessible at the building entrance;
- Designate an emergency coordinator responsible for initial response and evacuation;${ctx.multiLocataires ? '\n- Distribute the tenant guide at each new occupancy or configuration change.' : ''}

**Responsibilities of the ${docType} Administrator**

The emergency plan administrator is responsible for:
- Organizing an annual information session for emergency team members${ctx.multiLocataires ? ' and tenants' : ''};
- Educating all building occupants about evacuation and fire safety procedures;
- Coordinating an annual evacuation drill and producing an evaluation report;
- Maintaining an up-to-date register of persons requiring evacuation assistance.

**Technical Management of Safety Equipment**

The operations officer must:
- Post up-to-date evacuation plans on each floor;
- Ensure emergency exits are clear and properly identified at all times;
- Ensure the functionality of fire protection equipment;
- Document all regulatory inspections and maintenance.

**Disclaimer**

${ctx.companyName} is committed to providing rigorous professional services based on applicable standards, laws, and regulations in the province of ${ctx.province}.

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

Training ensures that each emergency team member has the knowledge and skills to respond effectively in emergency situations.

**Regulatory Requirements**

In accordance with ${ref.articleFormation_en}, personnel responsible for implementing the emergency response plan must receive adequate and ongoing training.

**Training Content**

- Evacuation procedures specific to the building;
- Use of fire protection equipment;
- Communication and coordination protocols;
- Support for persons requiring evacuation assistance;
- Specific risks related to the occupancy.

**Training Frequency**

| Timing | Type of Training | Obligation |
|---|---|---|
| Upon hiring | Initial training | Mandatory for all new emergency team members |
| Annually | Skills maintenance training | Mandatory for all active members |
| ${exerciceFrequenceCourt} | Practical exercises | ${ctx.hauteurBatiment ? 'Mandatory for high-rise buildings' : 'Recommended'} |

**Tracking**

- Attendance sheets signed at each training session;
- Data recorded in the ${docType} Training Register.`,
      },
      {
        id: '1.4',
        title: 'EVACUATION DRILL',
        content: `In accordance with ${ref.articleExercice_en}, an evacuation drill must be conducted ${exerciceFrequence} in all buildings subject to an emergency response plan${ctx.hauteurBatiment ? '. As this is a high-rise building, the minimum frequency is increased.' : '.'}

**1.4.1 Planning and Execution**

- The annual drill is planned in advance by the emergency coordinator.
- Each drill validates procedures and identifies operational gaps.

**1.4.2 Observation and Evaluation**

Designated observers evaluate:
- Responsiveness of occupants;
- Compliance with evacuation routes;
- Clarity of messages communicated;
- Overall evacuation time.

**1.4.3 Drill Objectives**

- Familiarize occupants with evacuation routes and assembly points;
- Identify persons requiring assistance;
- Validate the fire alarm system;
- Develop emergency reflexes.

**1.4.4 Post-Drill Follow-Up**

- Debriefing session with all stakeholders;
- Update the ${docType} as necessary;
- Retain drill reports for a minimum of 24 months.`,
      },
      {
        id: '1.5',
        title: 'REVISION HISTORY',
        content: `**1.5.1 Modification Log**

This Emergency Response Plan (${docType}) must be reviewed at least once every 12 months, in accordance with ${ref.articleRevision_en} of the ${ref.description_en}.

| Date | Description of Modification | Responsible Person |
|---|---|---|
${(ctx.historiqueList && ctx.historiqueList.length > 0
  ? ctx.historiqueList.map(h => `| ${h.date || '—'} | ${h.type || '—'} | ${h.responsable || '—'} |`).join('\n')
  : `| ${ctx.dateReleve || '—'} | ${ctx.versionDocument || 'Initial creation'} | ${ctx.responsableNom || '—'} |`
)}

**Specific Triggers for Updates**

An update must be made when:
- Building operations, layout, or occupancy changes;
- Security systems or equipment changes;
- An incident occurs;
- An evacuation drill identifies gaps.`,
      },
      {
        id: '1.6',
        title: 'DEFINITIONS AND TERMS',
        isEditable: true,
        content: `The following definitions ensure a uniform understanding of terms used in this emergency response plan.

**Brigadier / Floor Warden**: A member of the emergency team directing occupants toward assembly points.

**Confinement / Shelter-in-Place**: A procedure requiring occupants to remain within a secured area when evacuation is not safe.

**Emergency Coordinator**: The designated person responsible for overall emergency management.

**Emergency Response Plan (${docType})**: Official document describing emergency procedures, roles and responsibilities.

**Emergency Team**: A group of trained individuals responsible for implementing the ${docType} procedures.

**Evacuation**: The organized movement of occupants to a secure location.

**First Response Team (FRT)**: Comprised of a minimum of 3 persons, responsible for rapidly assessing an incident.

**Hazardous Materials**: Substances posing a risk, classified under WHMIS and/or TDG regulations.

**Assembly Point**: A pre-defined exterior location where occupants gather following an evacuation.

**Fire Alarm Signal**: An audible and/or visual signal activated to alert occupants of an emergency.`,
      },
    ],
  };
}