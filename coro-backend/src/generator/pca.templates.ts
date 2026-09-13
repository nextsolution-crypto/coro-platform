import { DocumentContext } from './module1/module1.index';
import { getActivePcaProcedures } from './procedures/pca/index';

export function generatePcaModules(ctx: DocumentContext, pcaConfig: any) {

  const cfg = pcaConfig || {};
  const clientName = ctx.clientName || '';
  const year = ctx.year || new Date().getFullYear();

  // ── Helpers ──
  const riskScore = (prob: string, impact: string): string => {
    const p = prob === 'ELEVEE' ? 3 : prob === 'MOYENNE' ? 2 : 1;
    const i = impact === 'ELEVE' ? 3 : impact === 'MOYEN' ? 2 : 1;
    const score = p * i;
    if (score >= 6) return `${score} - ÉLEVÉ`;
    if (score >= 3) return `${score} - MOYEN`;
    return `${score} - FAIBLE`;
  };

  const riskScoreEN = (prob: string, impact: string): string => {
    const p = prob === 'ELEVEE' ? 3 : prob === 'MOYENNE' ? 2 : 1;
    const i = impact === 'ELEVE' ? 3 : impact === 'MOYEN' ? 2 : 1;
    const score = p * i;
    if (score >= 6) return `${score} - HIGH`;
    if (score >= 3) return `${score} - MEDIUM`;
    return `${score} - LOW`;
  };

  const probLabel = (v: string) => v === 'ELEVEE' ? '3 - Élevée' : v === 'MOYENNE' ? '2 - Moyenne' : '1 - Faible';
  const impactLabel = (v: string) => v === 'ELEVE' ? '3 - Sévère' : v === 'MOYEN' ? '2 - Modéré' : '1 - Faible';
  const probLabelEN = (v: string) => v === 'ELEVEE' ? '3 - High' : v === 'MOYENNE' ? '2 - Medium' : '1 - Low';
  const impactLabelEN = (v: string) => v === 'ELEVE' ? '3 - Severe' : v === 'MOYEN' ? '2 - Moderate' : '1 - Low';

  const scenarioLabel = (id: string) => ({
    sinistre: 'Sinistre bâtiment / perte de site',
    meteo: 'Événement météorologique extrême',
    cyber: 'Cyberattaque / perte des systèmes TI',
    pandemie: 'Pandémie / absentéisme massif',
    electrique: 'Panne électrique prolongée',
    fournisseur: 'Perte d\'un fournisseur critique',
    personnel: 'Perte d\'un employé clé',
    approvisionnement: 'Interruption chaîne d\'approvisionnement',
    autre: 'Autre scénario',
  }[id] || id);

  const scenarioLabelEN = (id: string) => ({
    sinistre: 'Building disaster / site loss',
    meteo: 'Extreme weather event',
    cyber: 'Cyberattack / IT system loss',
    pandemie: 'Pandemic / mass absenteeism',
    electrique: 'Extended power outage',
    fournisseur: 'Loss of a critical supplier',
    personnel: 'Loss of a key employee',
    approvisionnement: 'Supply chain disruption',
    autre: 'Other scenario',
  }[id] || id);

  const consecLabel = (id: string) => ({
  sinistre: 'Perte d\'accès à l\'emplacement',
  meteo: 'Perte d\'accès à l\'emplacement / absentéisme',
  cyber: 'Perte des systèmes TI et de communication',
  pandemie: 'Absentéisme anormal / perte de personnel clé',
  electrique: 'Perte de ressources essentielles',
  fournisseur: 'Interruption d\'un fournisseur critique',
  personnel: 'Perte de personnel clé',
  approvisionnement: 'Interruption d\'un fournisseur critique',
  autre: 'Autre conséquence',
}[id] || id);

const consecLabelEN = (id: string) => ({
  sinistre: 'Loss of access to premises',
  meteo: 'Loss of access to premises / absenteeism',
  cyber: 'Loss of IT and communication systems',
  pandemie: 'Abnormal absenteeism / loss of key personnel',
  electrique: 'Loss of essential resources',
  fournisseur: 'Disruption of a critical supplier',
  personnel: 'Loss of key personnel',
  approvisionnement: 'Critical supply chain disruption',
  autre: 'Other consequence',
}[id] || id);

  const riskScenarios = Array.isArray(cfg.riskScenarios)
  ? cfg.riskScenarios
  : [];

const criticalServices = Array.isArray(cfg.criticalServices)
  ? cfg.criticalServices
  : [];

const cellMembers = Array.isArray(cfg.cellMembers)
  ? cfg.cellMembers
  : [];

const regulatoryReqs = Array.isArray(cfg.regulatoryReqs)
  ? cfg.regulatoryReqs
  : [];

const criticalITSystems = Array.isArray(cfg.criticalITSystems)
  ? cfg.criticalITSystems
  : [];

const criticalSuppliers = Array.isArray(cfg.criticalSuppliers)
  ? cfg.criticalSuppliers
  : [];

const authoritiesToNotify = Array.isArray(cfg.authoritiesToNotify)
  ? cfg.authoritiesToNotify
  : [];

  // Activez les procédures PCA selon les scénarios
  const activePcaProcedures = getActivePcaProcedures(riskScenarios);
  const procedureListFR = activePcaProcedures.map(p => `• ${p.code} — ${p.titleFR}`).join('\n');
  const procedureListEN = activePcaProcedures.map(p => `• ${p.code} — ${p.titleEN}`).join('\n');

  // ══════════════════════════════════════════════
  // MODULE 1 — INTRODUCTION ET POLITIQUE DE CONTINUITÉ
  // ══════════════════════════════════════════════
  const m1fr = {
    moduleNumber: 1,
    title: 'INTRODUCTION ET POLITIQUE DE CONTINUITÉ',
    language: 'fr',
    sections: [
      {
        id: 'm1_s1',
        title: 'La continuité des activités',
        content: `La continuité des activités est une démarche structurée visant à préparer l'organisation à maintenir ou à rétablir, dans des délais et à des niveaux acceptables, les produits, services et activités jugés essentiels lorsqu'un incident perturbe son fonctionnement normal. La planification ne vise pas à prévoir chaque événement possible; elle vise plutôt à comprendre les priorités de l'organisation, ses dépendances critiques et les conséquences d'une interruption afin de préparer des solutions de remplacement réalistes.

Le PCA constitue ainsi un outil de référence pour la gestion de la continuité. Il regroupe les décisions préparatoires, les responsabilités, les critères d'activation, les priorités de reprise, les stratégies, les ressources, les communications et les mécanismes de suivi nécessaires lorsqu'une perturbation dépasse la capacité de gestion courante.`,
      },
      {
        id: 'm1_s2',
        title: 'Articulation entre urgence, incident, continuité et reprise',
        content: `DIMENSION | FINALITÉ PRINCIPALE | EXEMPLES
─────────────────────────────────────────────────────────────────────
Mesures d'urgence / PSI / PMU | Protéger les personnes, maîtriser l'événement et limiter les dommages immédiats. | Évacuation, confinement, premiers secours, intervention incendie.
─────────────────────────────────────────────────────────────────────
Gestion d'incident | Coordonner les décisions, ressources, communications et priorités pendant l'événement. | Cellule de gestion d'incident, rapports de situation, journal de bord.
─────────────────────────────────────────────────────────────────────
Continuité des activités | Maintenir les activités essentielles à un niveau acceptable malgré la perturbation. | Télétravail, site alternatif, procédures manuelles, fournisseur de relève.
─────────────────────────────────────────────────────────────────────
Reprise et retour à la normale | Rétablir progressivement les capacités normales et fermer les mesures temporaires. | Restauration TI, retour au site, rattrapage des opérations, bilan postincident.`,
      },
      {
        id: 'm1_s3',
        title: 'Objectif et portée du plan',
        content: `Organisation visée : ${clientName}
Portée : ${cfg.scope === 'ORGANIZATION'
  ? 'Organisation entière'
  : cfg.scope === 'BUILDING'
    ? 'Bâtiment spécifique'
    : cfg.scope === 'MULTI_BUILDING'
      ? 'Plusieurs bâtiments'
      : 'Non précisée'}
Secteur d'activité : ${cfg.sector || 'Non précisé'}
Nombre d'employés : ${cfg.employeeCount ?? 'Non précisé'}
Heures d'opération : ${cfg.operatingHours || 'Non précisé'}
Année d'émission : ${year}

Le présent Plan de continuité des activités (PCA) a pour objectif de permettre à ${clientName} de maintenir ses activités essentielles à un niveau acceptable et de rétablir les capacités requises conformément aux objectifs de continuité définis dans le BIA. Il établit les priorités de continuité, les stratégies documentées, les responsabilités, les critères d'activation et les mécanismes de suivi nécessaires à une réponse coordonnée.

⚠️ AVIS IMPORTANT
La présence d'une référence dans le PCA ne constitue pas une attestation de conformité. L'organisation demeure responsable d'identifier les exigences qui lui sont effectivement applicables, d'obtenir au besoin les avis juridiques, réglementaires, techniques ou professionnels requis et de maintenir ses obligations à jour.`,
      },
      {
        id: 'm1_s4',
        title: 'Références normatives et réglementaires',
        content: `RÉFÉRENCE | NATURE | UTILISATION DANS LE PCA
─────────────────────────────────────────────────────────────────────
ISO 22301:2019 — Systèmes de management de la continuité d'activité | Norme internationale | Cadre de référence pour une démarche structurée de management de la continuité.
─────────────────────────────────────────────────────────────────────
CSA Z1600 — Continuité et gestion des urgences | Norme canadienne | Référence générale pour la planification, la préparation, la réponse et la continuité.
─────────────────────────────────────────────────────────────────────
Guide de gestion de la continuité des activités — Gouvernement du Québec | Guide de bonnes pratiques | Structure la démarche autour de l'analyse, de la conception, de la mise en œuvre et de la validation.
─────────────────────────────────────────────────────────────────────
ISO 22301:2019/Amd 1:2024 — Amendement changements climatiques | Amendement normatif | Ajoute la considération des changements climatiques comme risque à évaluer lors des révisions.
─────────────────────────────────────────────────────────────────────
${regulatoryReqs.length > 0 ? regulatoryReqs.map((r: string) => `${r} | Exigence applicable | À documenter selon le secteur et les activités de l'organisation.`).join('\n─────────────────────────────────────────────────────────────────────\n') : 'Exigences légales, réglementaires et contractuelles propres à l\'organisation | Exigences applicables | À documenter selon le secteur, les activités, les clients et les territoires concernés.'}

Documents connexes :
- Plan de mesures d'urgence (PMU), lorsqu'applicable${cfg.linkedPmuId ? ' — LIEN ÉTABLI' : ''}
- Plan de sécurité incendie (PSI), lorsqu'applicable
- Plan ou procédure de réponse aux incidents de cybersécurité
- Procédures SST et procédures d'intervention spécialisées
- Plans de reprise informatique et procédures de sauvegarde/restauration
- Contrats de services critiques, ententes de relève et polices d'assurance`,
      },
      {
        id: 'm1_s5',
        title: 'Politique de continuité des activités',
        content: `La direction de ${clientName} s'engage à maintenir un Plan de continuité des activités (PCA) à jour, exercé régulièrement et accessible à tous les intervenants concernés.

Cette politique traduit l'engagement de la direction à :
- Protéger la vie et la sécurité des employés, clients et visiteurs en toute circonstance
- Maintenir les activités essentielles au niveau de service minimum acceptable défini dans le BIA
- Préserver la réputation, les actifs et la viabilité à long terme de l'organisation
- Assurer la conformité aux obligations légales, réglementaires et contractuelles applicables
- Fournir les ressources nécessaires à la mise en œuvre et au maintien du PCA
- Exercer, tester et améliorer continuellement le dispositif de continuité

Le PCA est révisé selon la fréquence établie par l'organisation et lors de tout changement significatif dans les activités, la structure, les systèmes, les dépendances ou l'environnement de l'organisation. À défaut d'une fréquence interne définie, une révision annuelle constitue la fréquence de référence du programme de maintien présenté dans le présent PCA.`,
      },
      {
        id: 'm1_s6',
        title: 'Historique des versions et contrôle documentaire',
        content: `VERSION | DATE | NATURE DE LA MODIFICATION | PRÉPARÉ PAR | APPROUVÉ PAR
─────────────────────────────────────────────────────────────────────
1.0 | ${year} | Émission initiale du Plan de continuité des activités | ${cfg.coordinatorFirstName || ''} ${cfg.coordinatorLastName || ''} — ${cfg.coordinatorTitle || 'Coordonnateur PCA'} | Direction générale
─────────────────────────────────────────────────────────────────────

DIFFUSION ET DISPONIBILITÉ
Une copie à jour du PCA doit être accessible aux personnes appelées à l'utiliser, y compris lorsque les locaux ou les systèmes habituels sont indisponibles.

- Version électronique contrôlée dans l'emplacement documentaire désigné
- Accès hors site ou hors réseau lorsque requis par les stratégies de continuité
- Copies papier ciblées pour les fonctions critiques lorsque la perte des systèmes numériques est un scénario crédible
- Retrait ou destruction des versions périmées selon les règles internes de gestion documentaire

APPROBATION DU CHAPITRE

FONCTION | NOM / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
Responsable du PCA | ${cfg.coordinatorFirstName || ''} ${cfg.coordinatorLastName || ''} |
Direction générale | |`,
      },
    ],
  };

  const m1en = {
    moduleNumber: 1,
    title: 'INTRODUCTION AND CONTINUITY POLICY',
    language: 'en',
    sections: [
      {
        id: 'm1_s1',
        title: 'Business continuity',
        content: `Business continuity is a structured approach designed to prepare the organization to maintain or restore, within acceptable timeframes and at acceptable levels, products, services and activities deemed essential when an incident disrupts normal operations. Planning does not aim to anticipate every possible event; rather, it aims to understand the organization's priorities, critical dependencies and the consequences of an interruption in order to prepare realistic alternative solutions.

The BCP is therefore a reference tool for continuity management. It brings together the preparatory decisions, responsibilities, activation criteria, recovery priorities, strategies, resources, communications and monitoring mechanisms required when a disruption exceeds normal management capacity.`,
      },
      {
        id: 'm1_s2',
        title: 'Articulation between emergency, incident, continuity and recovery',
        content: `DIMENSION | PRIMARY PURPOSE | EXAMPLES
─────────────────────────────────────────────────────────────────────
Emergency measures / FSP / ERP | Protect people, control the event and limit immediate damage. | Evacuation, containment, first aid, fire response.
─────────────────────────────────────────────────────────────────────
Incident management | Coordinate decisions, resources, communications and priorities during the event. | Incident management team, situation reports, incident log.
─────────────────────────────────────────────────────────────────────
Business continuity | Maintain essential activities at an acceptable level despite the disruption. | Telework, alternate site, manual procedures, backup supplier.
─────────────────────────────────────────────────────────────────────
Recovery and return to normal | Progressively restore normal capacities and close temporary measures. | IT restoration, site return, operational catch-up, post-incident review.`,
      },
      {
        id: 'm1_s3',
        title: 'Plan objective and scope',
        content: `Organization: ${clientName}
Scope: ${cfg.scope === 'ORGANIZATION'
  ? 'Entire organization'
  : cfg.scope === 'BUILDING'
    ? 'Specific building'
    : cfg.scope === 'MULTI_BUILDING'
      ? 'Multiple buildings'
      : 'Not specified'}
Business sector: ${cfg.sector || 'Not specified'}
Number of employees: ${cfg.employeeCount ?? 'Not specified'}
Operating hours: ${cfg.operatingHours || 'Not specified'}
Year of issue: ${year}

This Business Continuity Plan (BCP) aims to enable ${clientName} to maintain its essential activities at an acceptable level and restore required capabilities in accordance with the continuity objectives established in the BIA. It establishes continuity priorities, documented strategies, responsibilities, activation criteria and monitoring mechanisms required for a coordinated response.

⚠️ IMPORTANT NOTICE
The presence of a reference in this BCP does not constitute certification of compliance. The organization remains responsible for identifying the legal, regulatory, contractual and other requirements actually applicable to its activities, obtaining legal, regulatory, technical or professional advice where required, and keeping those obligations current.`,
      },
      {
        id: 'm1_s4',
        title: 'Normative and regulatory references',
        content: `REFERENCE | NATURE | USE IN THE BCP
─────────────────────────────────────────────────────────────────────
ISO 22301:2019 — Business Continuity Management Systems | International standard | Reference framework for a structured business continuity management approach.
─────────────────────────────────────────────────────────────────────
CSA Z1600 — Emergency and Continuity Management | Canadian standard | General reference for planning, preparedness, response and continuity.
─────────────────────────────────────────────────────────────────────
Business Continuity Management Guide — Government of Quebec | Best practice guide | Structures the approach around analysis, design, implementation and validation.
─────────────────────────────────────────────────────────────────────
ISO 22301:2019/Amd 1:2024 — Climate action changes | Normative amendment | Requires the organization to consider whether climate change is a relevant issue within the management system context.
─────────────────────────────────────────────────────────────────────
${regulatoryReqs.length > 0 ? regulatoryReqs.map((r: string) => `${r} | Applicable requirement | To be documented according to the organization's sector and activities.`).join('\n─────────────────────────────────────────────────────────────────────\n') : 'Organization-specific legal, regulatory and contractual requirements | Applicable requirements | To be documented according to the sector, activities, clients and jurisdictions concerned.'}

Related documents:
- Emergency Response Plan (ERP), where applicable${cfg.linkedPmuId ? ' — LINK ESTABLISHED' : ''}
- Fire Safety Plan (FSP), where applicable
- Cybersecurity incident response plan or procedure
- Occupational health and safety procedures and specialized response procedures
- IT recovery plans and backup/restoration procedures
- Critical service contracts, recovery agreements and insurance policies.`,
      },
      {
        id: 'm1_s5',
        title: 'Business continuity policy',
        content: `The management of ${clientName} commits to maintaining an up-to-date Business Continuity Plan, regularly exercised and accessible to all relevant stakeholders.

This policy reflects management's commitment to:
- Protect the life and safety of employees, clients and visitors under all circumstances
- Maintain essential activities at the minimum acceptable service level defined in the BIA
- Preserve the organization's reputation, assets and long-term viability
- Ensure compliance with applicable legal, regulatory and contractual obligations
- Provide the resources necessary to implement and maintain the BCP
- Exercise, test and continuously improve the continuity framework

The BCP is reviewed according to the frequency established by the organization and following any significant change in its activities, structure, systems, dependencies or operating environment. Where no internal review frequency has been established, an annual review is used as the reference frequency in the maintenance program presented in this BCP.`,
      },
      {
        id: 'm1_s6',
        title: 'Version history and document control',
        content: `VERSION | DATE | NATURE OF CHANGE | PREPARED BY | APPROVED BY
─────────────────────────────────────────────────────────────────────
1.0 | ${year} | Initial issuance of the Business Continuity Plan | ${cfg.coordinatorFirstName || ''} ${cfg.coordinatorLastName || ''} — ${cfg.coordinatorTitle || 'BCP Coordinator'} | Senior Management

DISTRIBUTION AND AVAILABILITY
An up-to-date copy of the BCP must be accessible to those expected to use it, including when normal premises or systems are unavailable.

CHAPTER APPROVAL

FUNCTION | NAME / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
BCP Coordinator | ${cfg.coordinatorFirstName || ''} ${cfg.coordinatorLastName || ''} |
Senior Management | |`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 2 — CONTEXTE ORGANISATIONNEL ET GOUVERNANCE
  // ══════════════════════════════════════════════
  const coordName = `${cfg.coordinatorFirstName || ''} ${cfg.coordinatorLastName || ''}`.trim();
  const coordTitle = cfg.coordinatorTitle || 'Coordonnateur PCA';
  const coordEmail = cfg.coordinatorEmail || 'À compléter';
  const coordPhone = cfg.coordinatorPhone || 'À compléter';
  const substName = `${cfg.substituteFirstName || ''} ${cfg.substituteLastName || ''}`.trim();
  const substPhone = cfg.substitutePhone || 'À compléter';
  const substEmail = cfg.substituteEmail || 'À compléter';

  const cellMembersTable = cellMembers.length > 0
    ? cellMembers.map((m: any) =>
        `${m.role || 'À définir'} | ${m.firstName || ''} ${m.lastName || ''} | ${m.phone || 'À compléter'} | ${m.email || 'À compléter'}`
      ).join('\n')
    : 'Opérations | À désigner | À compléter | À compléter\nTechnologies de l\'information | À désigner | À compléter | À compléter\nRessources humaines | À désigner | À compléter | À compléter\nCommunications | À désigner | À compléter | À compléter\nFinances / assurances | À désigner | À compléter | À compléter\nInstallations | À désigner | À compléter | À compléter';

  const regsTable = regulatoryReqs.length > 0
  ? regulatoryReqs.map((r: string) => `${r} | À documenter | À compléter | À compléter`).join('\n')
  : 'Exigences spécifiques non documentées dans la configuration | À déterminer | À désigner | Analyse et validation requises';

  const m2fr = {
    moduleNumber: 2,
    title: 'CONTEXTE ORGANISATIONNEL ET GOUVERNANCE',
    language: 'fr',
    sections: [
      {
        id: 'm2_s1',
        title: 'Principes de gouvernance',
        content: `PRINCIPE DE GOUVERNANCE
Une réponse efficace exige des responsabilités connues avant l'incident. Les personnes appelées à diriger ou soutenir la continuité doivent être désignées, connaître leur mandat et disposer d'un substitut lorsque leur fonction est critique.

La gouvernance de la continuité permet de relier les décisions stratégiques de la direction aux actions tactiques et opérationnelles requises pendant une interruption. Elle évite qu'une crise repose sur des initiatives individuelles non coordonnées et précise qui possède l'autorité pour mobiliser les ressources, modifier les priorités, engager des dépenses, communiquer et déclarer le retour à la normale.

Dans le cadre du présent PCA, la direction conserve l'autorité stratégique. Le coordonnateur PCA assure la coordination générale du dispositif, tandis que les responsables fonctionnels évaluent les impacts dans leur domaine, mettent en œuvre les stratégies de continuité retenues selon l'autorité qui leur est déléguée et rendent compte de la situation à la cellule de gestion d'incident.

PRINCIPES DE FONCTIONNEMENT DE LA CELLULE DE GESTION D'INCIDENT
- La composition de la cellule est adaptée à la nature, à l'étendue et à la durée de l'incident
- Un responsable et un substitut sont désignés pour les fonctions critiques
- Certains rôles peuvent être jumelés dans une petite organisation, à condition de ne pas créer une surcharge incompatible avec une gestion efficace
- Les décisions, hypothèses, actions, dépenses et communications importantes sont consignées dans le journal de bord d'incident`,
      },
      {
        id: 'm2_s2',
        title: 'Description de l\'organisation',
        content: `Organisation : ${clientName}
Secteur d'activité : ${cfg.sector || cfg.clientSector || 'Non précisé'}
Nombre d'employés : ${cfg.employeeCount ?? cfg.clientEmployeeCount ?? 'Non précisé'}
Heures d'opération : ${cfg.operatingHours || 'Non précisé'}
Portée du plan : ${cfg.scope === 'ORGANIZATION'
  ? 'Organisation entière'
  : cfg.scope === 'BUILDING'
    ? 'Bâtiment spécifique'
    : cfg.scope === 'MULTI_BUILDING'
      ? 'Plusieurs bâtiments'
      : 'Non précisée'}

CONTEXTE ORGANISATIONNEL
TYPE DE DÉPENDANCE | NATURE | INCIDENCE SUR LA CONTINUITÉ
─────────────────────────────────────────────────────────────────────
Personnel | Compétences, disponibilité, concentration des connaissances. | Identification des postes clés, formation croisée, relève.
─────────────────────────────────────────────────────────────────────
Technologique | Applications, données, accès, communications, téléphonie. | Relève TI, procédures manuelles, sauvegardes hors site.
─────────────────────────────────────────────────────────────────────
Physique | Sites, accès, équipements, énergie, services publics. | Site alternatif, génératrice, relocalisation.
─────────────────────────────────────────────────────────────────────
Fournisseurs | Produits, transport, services professionnels et techniques. | Fournisseurs alternatifs, stocks tampon, substitution.
─────────────────────────────────────────────────────────────────────
Client / contrat | SLA, délais, obligations de livraison, pénalités. | Priorisation, communications, gestion des engagements.

PARTIES INTÉRESSÉES
PARTIE INTÉRESSÉE | ATTENTE PRINCIPALE | INCIDENCE SUR LE PCA
─────────────────────────────────────────────────────────────────────
Employés | Sécurité, information, continuité d'emploi et conditions de travail claires. | Alerte, communications internes, télétravail, soutien RH.
─────────────────────────────────────────────────────────────────────
Clients | Maintien des services, respect des engagements et information rapide. | Priorisation, SLA, messages de perturbation, reprise.
─────────────────────────────────────────────────────────────────────
Fournisseurs et partenaires | Instructions, commandes, accès et coordination. | Contacts d'urgence, alternatives, chaîne d'approvisionnement.
─────────────────────────────────────────────────────────────────────
Direction / actionnaires | Protection des revenus, actifs, réputation et capacité de décision. | Gouvernance, rapports de situation, décisions stratégiques.
─────────────────────────────────────────────────────────────────────
Autorités / organismes de réglementation | Respect des obligations applicables et notifications requises. | Registre des exigences, seuils de notification, traçabilité.
─────────────────────────────────────────────────────────────────────
Assureurs | Notification rapide, documentation des dommages et dépenses. | Procédures financières, preuves, contacts et conditions de couverture.`,
      },
      {
        id: 'm2_s3',
        title: 'Coordonnateur PCA',
        content: `Le coordonnateur PCA est le point de convergence du dispositif de continuité. Il est avisé lorsqu'un incident menace la capacité de l'organisation à maintenir ses activités, évalue avec les responsables concernés le besoin d'activer le PCA et assure la mobilisation de la cellule de gestion d'incident selon les critères établis.

FONCTION | Coordonnateur du Plan de continuité des activités
─────────────────────────────────────────────────────────────────────
TITULAIRE | ${coordName || 'À désigner'}
TITRE | ${coordTitle}
TÉLÉPHONE | ${coordPhone}
COURRIEL | ${coordEmail}
─────────────────────────────────────────────────────────────────────
SUBSTITUT | ${substName || 'À désigner'}
TÉLÉPHONE SUBSTITUT | ${substPhone}
COURRIEL SUBSTITUT | ${substEmail}

MANDAT DU COORDONNATEUR PCA
- Recevoir et qualifier l'information relative à une interruption réelle ou potentielle
- Recommander ou déclarer l'activation du PCA selon l'autorité qui lui est déléguée
- Mobiliser la cellule de gestion d'incident et confirmer le mode de coordination
- S'assurer que le PCA est appliqué et adapté à la situation réelle
- Maintenir une compréhension commune de la situation et des priorités de reprise
- Coordonner les rapports de situation, les décisions et le suivi des actions
- Veiller à la production du rapport postincident et au suivi des mesures correctives
- Coordonner le programme de maintien, d'exercices et de mise à jour du PCA

SUBSTITUTION ET RELÈVE
Le substitut doit être en mesure d'assumer immédiatement le rôle du coordonnateur PCA. Les coordonnées, accès, documents et pouvoirs délégués nécessaires doivent donc être disponibles indépendamment de la présence du titulaire.

PORTE-PAROLE DÉSIGNÉ : ${cfg.spokesperson || 'À désigner'}
RESPONSABLE SUIVI MÉDIAS SOCIAUX : ${cfg.socialMediaMonitor || 'À désigner'}`,
      },
      {
        id: 'm2_s4',
        title: 'Cellule de gestion d\'incident',
        content: `La cellule de gestion d'incident constitue la structure de coordination tactique du PCA. Elle réunit les fonctions nécessaires pour évaluer les conséquences de l'incident, maintenir les activités essentielles, coordonner les ressources, soutenir la reprise et préparer les décisions devant être soumises à la direction.

La cellule n'est pas nécessairement mobilisée au complet pour chaque événement. Le coordonnateur convoque les fonctions requises selon le niveau d'incident, les activités touchées et les stratégies à activer.

FONCTION | TITULAIRE | TÉLÉPHONE | COURRIEL
─────────────────────────────────────────────────────────────────────
Chef de cellule / Direction générale | À désigner | À compléter | À compléter
─────────────────────────────────────────────────────────────────────
Coordonnateur PCA | ${coordName || 'À désigner'} | ${coordPhone} | ${coordEmail}
─────────────────────────────────────────────────────────────────────
${cellMembersTable}

MATRICE D'AUTORITÉ — À VALIDER PAR L'ORGANISATION
Les autorités ci-dessous constituent une structure de référence. Elles doivent être confirmées en fonction des délégations de pouvoir, politiques internes et responsabilités réellement applicables.

DÉCISION | AUTORITÉ DE RÉFÉRENCE | CONSULTATION | TRACE REQUISE
─────────────────────────────────────────────────────────────────────
Activation du PCA | Coordonnateur PCA, lorsque cette autorité lui est déléguée; sinon direction ou autorité désignée | Chef de cellule au besoin | Heure, motif et niveau d'activation
─────────────────────────────────────────────────────────────────────
Dépense exceptionnelle | Direction ou délégataire autorisé | Finances | Montant, motif et approbation
─────────────────────────────────────────────────────────────────────
Fermeture / relocalisation d'un site | Autorité organisationnelle désignée | Installations, opérations, RH | Décision et impacts
─────────────────────────────────────────────────────────────────────
Priorisation des clients / services | Direction et responsables opérationnels désignés | Coordonnateur PCA, finances | Critères et arbitrage
─────────────────────────────────────────────────────────────────────
Communication publique | Porte-parole ou autorité désignée | Communications, juridique au besoin | Version approuvée et heure de diffusion
─────────────────────────────────────────────────────────────────────
Retour aux activités normales | Direction ou autorité désignée | Coordonnateur PCA et responsables fonctionnels | Critères atteints et heure de clôture`,
      },
      {
        id: 'm2_s5',
        title: 'Coordination de l\'incident',
        content: `Les lieux et moyens de coordination doivent être prédéterminés afin que la cellule puisse fonctionner même lorsque le site principal ou les systèmes habituels sont indisponibles.

ÉLÉMENT | DISPOSITION
─────────────────────────────────────────────────────────────────────
Bureau de coordination principal | ${ctx.buildingAddress || cfg.buildingName || 'À compléter'}
─────────────────────────────────────────────────────────────────────
Bureau de coordination alternatif | ${cfg.coordinationLocation || 'À définir'}
─────────────────────────────────────────────────────────────────────
Pont téléphonique d'urgence | ${cfg.emergencyBridge || 'À définir'}
─────────────────────────────────────────────────────────────────────
Mode virtuel de relève | À documenter — prévoir, lorsque requis, un moyen de coordination accessible si le site principal ou les systèmes habituels sont indisponibles
─────────────────────────────────────────────────────────────────────
Journal de bord | Formulaire CORO — modalités d'accès et de conservation hors ligne à confirmer`,
      },
      {
        id: 'm2_s6',
        title: 'Exigences réglementaires et contractuelles',
        content: `Les exigences applicables à la continuité varient selon le secteur d'activité, les territoires, les contrats, les types de données traitées, les permis détenus et les engagements pris envers les clients et partenaires.

IMPORTANT
Cette section ne constitue pas un avis juridique ni une attestation de conformité. Dans un PCA réel, chaque exigence doit être validée par l'organisation et, lorsque nécessaire, par les fonctions juridique, conformité, TI, SST, finances ou par un professionnel compétent.

EXIGENCE | TYPE | PROPRIÉTAIRE | FONCTION RESPONSABLE | INCIDENCE SUR LE PCA
─────────────────────────────────────────────────────────────────────
${regsTable}

RESPONSABILITÉ DE MAINTIEN DU REGISTRE
Le propriétaire de chaque exigence doit signaler au responsable du PCA tout changement susceptible de modifier une priorité, un délai, une stratégie ou une obligation de notification. Le registre doit être revu selon le cycle de maintien établi par l'organisation et chaque fois qu'un changement réglementaire, contractuel ou organisationnel pertinent est identifié.

APPROBATION DU CHAPITRE
FONCTION | NOM / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
Responsable du PCA | ${coordName || ''} |
Direction générale | |`,
      },
    ],
  };

    const m2en = {
    moduleNumber: 2,
    title: 'ORGANIZATIONAL CONTEXT AND GOVERNANCE',
    language: 'en',
    sections: [
      {
        id: 'm2_s1',
        title: 'Governance principles',
        content: `GOVERNANCE PRINCIPLE
An effective response requires responsibilities to be understood before an incident occurs. People expected to lead or support continuity must be designated, understand their mandate and have an alternate when their function is critical.

Continuity governance connects management's strategic decisions with the tactical and operational actions required during a disruption. It reduces reliance on uncoordinated individual initiatives and clarifies who has authority to mobilize resources, modify priorities, incur expenses, communicate and declare a return to normal operations.

Within this BCP, management retains strategic authority. The BCP Coordinator oversees overall continuity coordination, while functional owners assess impacts within their areas, implement continuity strategies according to the authority delegated to them and report the situation to the incident management team.

INCIDENT MANAGEMENT TEAM OPERATING PRINCIPLES
- Team composition is adapted to the nature, scope and duration of the incident
- A primary role holder and an alternate should be designated for critical functions
- Roles may be combined in smaller organizations provided this does not create an unreasonable workload or impair effective incident management
- Significant decisions, assumptions, actions, expenses and communications are documented in the incident log`,
      },

      {
        id: 'm2_s2',
        title: 'Organization description',
        content: `Organization: ${clientName}
Business sector: ${cfg.sector || cfg.clientSector || 'Not specified'}
Number of employees: ${cfg.employeeCount ?? cfg.clientEmployeeCount ?? 'Not specified'}
Operating hours: ${cfg.operatingHours || 'Not specified'}
Plan scope: ${cfg.scope === 'ORGANIZATION'
  ? 'Entire organization'
  : cfg.scope === 'BUILDING'
    ? 'Specific building'
    : cfg.scope === 'MULTI_BUILDING'
      ? 'Multiple buildings'
      : 'Not specified'}

ORGANIZATIONAL CONTEXT
DEPENDENCY TYPE | NATURE | CONTINUITY CONSIDERATION
─────────────────────────────────────────────────────────────────────
Personnel | Skills, availability and concentration of knowledge | Identification of key positions, cross-training and backup resources
─────────────────────────────────────────────────────────────────────
Technology | Applications, data, access, communications and telephony | IT recovery, manual procedures and off-site backups
─────────────────────────────────────────────────────────────────────
Physical | Sites, access, equipment, energy and utilities | Alternate site, backup power and relocation
─────────────────────────────────────────────────────────────────────
Suppliers | Products, transportation, professional and technical services | Alternate suppliers, buffer stocks and substitution
─────────────────────────────────────────────────────────────────────
Clients / contracts | SLAs, deadlines, delivery obligations and penalties | Prioritization, communications and commitment management

INTERESTED PARTIES
INTERESTED PARTY | PRIMARY EXPECTATION | BCP CONSIDERATION
─────────────────────────────────────────────────────────────────────
Employees | Safety, information, employment continuity and clear working arrangements | Alerts, internal communications, telework and HR support
─────────────────────────────────────────────────────────────────────
Clients | Service continuity, fulfilment of commitments and timely information | Prioritization, SLAs, disruption communications and recovery
─────────────────────────────────────────────────────────────────────
Suppliers and partners | Instructions, orders, access and coordination | Emergency contacts, alternatives and supply-chain coordination
─────────────────────────────────────────────────────────────────────
Management / shareholders | Protection of revenue, assets, reputation and decision-making capability | Governance, situation reporting and strategic decisions
─────────────────────────────────────────────────────────────────────
Authorities / regulators | Compliance with applicable obligations and required notifications | Requirements register, notification criteria and traceability
─────────────────────────────────────────────────────────────────────
Insurers | Timely notification and documentation of damages and expenses | Financial procedures, evidence, contacts and coverage conditions`,
      },

      {
        id: 'm2_s3',
        title: 'BCP Coordinator',
        content: `The BCP Coordinator is the central coordination point for the continuity framework. The Coordinator is informed when an incident threatens the organization's ability to maintain its activities, assesses with the relevant functional owners whether BCP activation is required and coordinates mobilization of the incident management team according to established criteria.

FUNCTION | Business Continuity Plan Coordinator
─────────────────────────────────────────────────────────────────────
TITLEHOLDER | ${coordName || 'To be designated'}
TITLE | ${cfg.coordinatorTitle || 'BCP Coordinator'}
PHONE | ${coordPhone}
EMAIL | ${coordEmail}
─────────────────────────────────────────────────────────────────────
ALTERNATE | ${substName || 'To be designated'}
ALTERNATE PHONE | ${substPhone}
ALTERNATE EMAIL | ${substEmail}

BCP COORDINATOR MANDATE
- Receive and assess information related to an actual or potential disruption
- Recommend or declare BCP activation according to delegated authority
- Mobilize the incident management team and confirm the coordination method
- Ensure the BCP is applied and adapted to the actual situation
- Maintain a common operating picture and shared recovery priorities
- Coordinate situation reports, decisions and action tracking
- Coordinate preparation of the post-incident report and follow-up of corrective actions
- Coordinate the BCP maintenance, exercise and update program

ALTERNATE AND SUCCESSION
The alternate should be able to assume the BCP Coordinator role when required. Necessary contact information, access, documentation and delegated authority should therefore be available independently of the primary role holder.

DESIGNATED SPOKESPERSON: ${cfg.spokesperson || 'To be designated'}
SOCIAL MEDIA MONITORING LEAD: ${cfg.socialMediaMonitor || 'To be designated'}`,
      },

      {
        id: 'm2_s4',
        title: 'Incident management team',
        content: `The incident management team is the tactical coordination structure of the BCP. It brings together the functions required to assess the consequences of an incident, maintain essential activities, coordinate resources, support recovery and prepare decisions requiring management approval.

The full team does not necessarily need to be mobilized for every event. The BCP Coordinator convenes the functions required according to the incident level, affected activities and continuity strategies to be implemented.

FUNCTION | TITLEHOLDER | PHONE | EMAIL
─────────────────────────────────────────────────────────────────────
Team Lead / Senior Management | To be designated | To be completed | To be completed
─────────────────────────────────────────────────────────────────────
BCP Coordinator | ${coordName || 'To be designated'} | ${coordPhone} | ${coordEmail}
─────────────────────────────────────────────────────────────────────
${cellMembers.length > 0
  ? cellMembers.map((m: any) =>
      `${m.role || 'To be defined'} | ${m.firstName || ''} ${m.lastName || ''} | ${m.phone || 'To be completed'} | ${m.email || 'To be completed'}`
    ).join('\n')
  : 'Operations | To be designated | To be completed | To be completed\nInformation Technology | To be designated | To be completed | To be completed\nHuman Resources | To be designated | To be completed | To be completed\nCommunications | To be designated | To be completed | To be completed\nFinance / Insurance | To be designated | To be completed | To be completed\nFacilities | To be designated | To be completed | To be completed'}

AUTHORITY MATRIX — TO BE VALIDATED BY THE ORGANIZATION
The authorities below represent a reference structure and must be confirmed against the organization's actual delegation of authority, internal policies and responsibilities.

DECISION | REFERENCE AUTHORITY | CONSULTATION | REQUIRED RECORD
─────────────────────────────────────────────────────────────────────
BCP activation | BCP Coordinator where delegated; otherwise management or designated authority | Team Lead as required | Activation time, reason and level
─────────────────────────────────────────────────────────────────────
Exceptional expenditure | Management or authorized delegate | Finance | Amount, rationale and approval
─────────────────────────────────────────────────────────────────────
Site closure / relocation | Designated organizational authority | Facilities, Operations, HR | Decision and impacts
─────────────────────────────────────────────────────────────────────
Client / service prioritization | Management and designated operational owners | BCP Coordinator, Finance | Criteria and prioritization decision
─────────────────────────────────────────────────────────────────────
Public communication | Spokesperson or designated authority | Communications, Legal as required | Approved version and release time
─────────────────────────────────────────────────────────────────────
Return to normal operations | Management or designated authority | BCP Coordinator and functional owners | Criteria achieved and closure time`,
      },

      {
        id: 'm2_s5',
        title: 'Incident coordination',
        content: `Coordination locations and methods should be established in advance so that the incident management team can continue to operate when the primary site or normal systems are unavailable.

ELEMENT | ARRANGEMENT
─────────────────────────────────────────────────────────────────────
Primary coordination site | ${ctx.buildingAddress || cfg.buildingName || 'To be completed'}
─────────────────────────────────────────────────────────────────────
Alternate coordination site | ${cfg.coordinationLocation || 'To be defined'}
─────────────────────────────────────────────────────────────────────
Emergency conference bridge | ${cfg.emergencyBridge || 'To be defined'}
─────────────────────────────────────────────────────────────────────
Virtual coordination fallback | To be documented — where required, provide a coordination method accessible if the primary site or normal internal systems are unavailable
─────────────────────────────────────────────────────────────────────
Incident log | CORO form — offline access and retention arrangements to be confirmed`,
      },

      {
        id: 'm2_s6',
        title: 'Regulatory and contractual requirements',
        content: `Requirements applicable to business continuity vary according to the organization's sector, jurisdictions, contracts, types of information processed, permits and commitments to clients and partners.

IMPORTANT
This section does not constitute legal advice or certification of compliance. Each requirement must be validated by the organization and, where appropriate, by Legal, Compliance, IT, Occupational Health and Safety, Finance or another qualified professional.

REQUIREMENT | TYPE | OWNER | RESPONSIBLE FUNCTION | BCP IMPACT
─────────────────────────────────────────────────────────────────────
${regulatoryReqs.length > 0
  ? regulatoryReqs.map((r: string) =>
      `${r} | To be documented | To be completed | To be completed | To be assessed`
    ).join('\n─────────────────────────────────────────────────────────────────────\n')
  : 'Specific requirements not documented in the configuration | To be determined | To be designated | Analysis required | To be assessed'}

REQUIREMENTS REGISTER MAINTENANCE
The owner of each requirement should inform the BCP owner of any change that could affect a priority, timeframe, continuity strategy or notification obligation. The register should be reviewed according to the organization's maintenance cycle and whenever a relevant regulatory, contractual or organizational change is identified.

CHAPTER APPROVAL
FUNCTION | NAME / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
BCP Owner | ${coordName || ''} |
Senior Management | |`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 3 — APPRÉCIATION DU RISQUE (ARA)
  // ══════════════════════════════════════════════
  const riskTableFR = riskScenarios.length > 0
    ? riskScenarios.map((r: any) => {
        const sc = scenarioLabel(r.id);
        const co = consecLabel(r.id);

        const hasProbability = Boolean(r.probability);
        const hasImpact = Boolean(r.impact);

        const prob = hasProbability
          ? probLabel(r.probability)
          : 'À évaluer';

        const imp = hasImpact
          ? impactLabel(r.impact)
          : 'À évaluer';

        const niveau = hasProbability && hasImpact
          ? riskScore(r.probability, r.impact)
          : 'À déterminer';

        const mesures = r.existingControls || 'À documenter';
        const commentaires = r.comments || '—';

        return `${co} | ${sc} | ${imp} | ${prob} | ${niveau} | ${mesures} | ${commentaires}`;
      }).join('\n')
    : 'Aucun scénario identifié — À compléter dans le configurateur PCA (Section 3)';

  const riskTableEN = riskScenarios.length > 0
    ? riskScenarios.map((r: any) => {
        const sc = scenarioLabelEN(r.id);
        const co = consecLabelEN(r.id);

        const hasProbability = Boolean(r.probability);
        const hasImpact = Boolean(r.impact);

        const prob = hasProbability
          ? probLabelEN(r.probability)
          : 'To be assessed';

        const imp = hasImpact
          ? impactLabelEN(r.impact)
          : 'To be assessed';

        const niveau = hasProbability && hasImpact
          ? riskScoreEN(r.probability, r.impact)
          : 'To be determined';

        const mesures = r.existingControls || 'To be documented';
        const commentaires = r.comments || '—';

        return `${co} | ${sc} | ${imp} | ${prob} | ${niveau} | ${mesures} | ${commentaires}`;
      }).join('\n')
    : 'No scenarios identified — To be completed in BCP configurator (Section 3)';

  const m3fr = {
    moduleNumber: 3,
    title: 'APPRÉCIATION DU RISQUE (ARA)',
    language: 'fr',
    sections: [
      {
        id: 'm3_s1',
        title: 'Approche et méthodologie',
        content: `L'appréciation du risque complète le bilan d'impact sur les activités en recherchant les événements et les points de défaillance susceptibles de rendre indisponibles les ressources nécessaires aux activités essentielles. Elle permet de visualiser les vulnérabilités de l'organisation, de déterminer les concentrations de risques jugées inacceptables et d'orienter les mesures de contrôle ainsi que les stratégies de continuité.

APPROCHE RETENUE
L'analyse est structurée d'abord par conséquences de non-disponibilité, puis par causes potentielles. Cette approche multirisque évite de construire un PCA distinct pour chaque aléa et permet de préparer des stratégies utilisables pour plusieurs scénarios.

RISQUE, CONSÉQUENCE ET CONTINUITÉ
Dans un contexte de continuité, l'événement déclencheur n'est pas la seule information importante. Un incendie, une inondation, une cyberattaque ou un bris d'infrastructure peuvent produire des conséquences similaires. Le PCA cherche donc à comprendre quelles ressources pourraient devenir indisponibles et ce que cette indisponibilité signifie pour les activités prioritaires.

LES CINQ CONSÉQUENCES STRUCTURANTES
1 — Perte d'accès à l'emplacement : Indisponibilité totale ou partielle d'un site, d'une zone de travail ou d'une installation nécessaire aux opérations.
2 — Perte des systèmes informatiques et de communication : Indisponibilité d'équipements, applications, données, réseaux, téléphones ou services numériques nécessaires aux activités.
3 — Absentéisme anormal ou perte de personnel clé : Effectifs insuffisants, perte d'une compétence rare, indisponibilité d'un titulaire unique ou difficulté d'accès au lieu de travail.
4 — Interruption d'un fournisseur ou partenaire critique : Rupture d'un service, d'un approvisionnement, d'un sous-traitant ou d'un partenaire indispensable à la livraison des produits ou services.
5 — Perte de ressources essentielles, équipements, outils ou services : Indisponibilité d'énergie, eau, équipements spécialisés, véhicules, matières, documents, installations techniques ou autres ressources indispensables.

CHANGEMENTS CLIMATIQUES ET ÉVOLUTION DU CONTEXTE
⚠️ POINT DE VIGILANCE : Lors des révisions de l'ARA, l'organisation doit réévaluer les changements significatifs susceptibles de modifier son exposition ou ses vulnérabilités. Le changement climatique doit notamment être considéré afin de déterminer s'il constitue un enjeu pertinent pour le système de management de la continuité. Une appréciation du risque n'est pas un portrait permanent. — ISO 22301:2019/Amd 1:2024`,
      },
      {
        id: 'm3_s2',
        title: 'Échelles d\'évaluation',
        content: `ÉCHELLE DE PROBABILITÉ
VALEUR | NIVEAU | DÉFINITION
─────────────────────────────────────────────────────────────────────
3 | Élevée | Il est très probable que cette cause se matérialise.
─────────────────────────────────────────────────────────────────────
2 | Moyenne | Il est probable que cette cause se matérialise.
─────────────────────────────────────────────────────────────────────
1 | Faible | Il est peu probable que cette cause se matérialise.

ÉCHELLE D'IMPACT
VALEUR | NIVEAU | DÉFINITION
─────────────────────────────────────────────────────────────────────
3 | Sévère | Conséquences directes et majeures sur les ressources humaines ou matérielles, l'environnement ou la capacité de réaliser les activités; les activités deviennent inopérantes.
─────────────────────────────────────────────────────────────────────
2 | Modéré | Effets temporaires et réversibles ayant des conséquences directes sur le bon déroulement des activités; les activités sont ralenties.
─────────────────────────────────────────────────────────────────────
1 | Faible | Effets limités sur les ressources, l'environnement ou la capacité de réaliser les activités.

MATRICE DE NIVEAU DE RISQUE (Impact × Probabilité)
IMPACT \\ PROBABILITÉ | 3 - Élevée | 2 - Moyenne | 1 - Faible
─────────────────────────────────────────────────────────────────────
3 - Sévère | 9 - ÉLEVÉ | 6 - ÉLEVÉ | 3 - MOYEN
─────────────────────────────────────────────────────────────────────
2 - Modéré | 6 - ÉLEVÉ | 4 - MOYEN | 2 - FAIBLE
─────────────────────────────────────────────────────────────────────
1 - Faible | 3 - MOYEN | 2 - FAIBLE | 1 - FAIBLE

Interprétation : 1 ou 2 = FAIBLE | 3 ou 4 = MOYEN | 6 ou 9 = ÉLEVÉ

DISTINCTION IMPORTANTE
Le niveau de risque ne remplace pas le BIA. L'ARA aide à déterminer ce qui peut rendre une ressource indisponible; le BIA détermine quelles activités doivent être maintenues ou reprises, dans quel délai et avec quelles ressources.`,
      },
      {
        id: 'm3_s3',
        title: 'Scénarios d\'interruption identifiés',
        content: `CONSÉQUENCE | CAUSE / SCÉNARIO | IMPACT | PROBABILITÉ | NIVEAU DE RISQUE | MESURES EXISTANTES | COMMENTAIRES
─────────────────────────────────────────────────────────────────────
${riskTableFR}

LECTURE DES RÉSULTATS
L'organisation ne doit pas interpréter un risque faible comme une absence de risque. Un scénario peu probable peut tout de même exiger une stratégie si ses conséquences sont incompatibles avec les tolérances établies au BIA.

RÉSUMÉ DES CONCENTRATIONS DE RISQUES
${(() => {
  const evaluatedRisks = riskScenarios
    .filter((r: any) => r.probability && r.impact)
    .map((r: any) => {
      const p =
        r.probability === 'ELEVEE'
          ? 3
          : r.probability === 'MOYENNE'
            ? 2
            : 1;

      const i =
        r.impact === 'ELEVE'
          ? 3
          : r.impact === 'MOYEN'
            ? 2
            : 1;

      return {
        ...r,
        score: p * i,
      };
    });

  const highRisks = evaluatedRisks.filter((r: any) => r.score >= 6);
  const incompleteRisks = riskScenarios.filter((r: any) => !r.probability || !r.impact);

  if (highRisks.length > 0) {
    return `Risques ÉLEVÉS identifiés (score ≥ 6) :
${highRisks
  .map((r: any) => `• ${scenarioLabel(r.id)} — Score ${r.score}`)
  .join('\n')}

${incompleteRisks.length > 0
  ? `${incompleteRisks.length} scénario(s) supplémentaire(s) demeure(nt) à évaluer complètement avant de conclure l'appréciation du risque.`
  : 'Tous les scénarios documentés disposent d’une probabilité et d’un impact évalués.'}`;
  }

  if (incompleteRisks.length > 0) {
    return `Aucun risque de niveau ÉLEVÉ n'est actuellement calculable parmi les scénarios complètement évalués.

${incompleteRisks.length} scénario(s) demeure(nt) incomplet(s) et doivent être évalués avant de conclure qu'aucun risque élevé n'est présent.`;
  }

  return 'Aucun risque de niveau ÉLEVÉ identifié parmi les scénarios évalués — Maintenir la surveillance et réévaluer selon le cycle établi par l’organisation et lors de changements significatifs.';
})()}`,
      },
            {
        id: 'm3_s4',
        title: 'Grille des niveaux d\'incident',
        content: `La grille des niveaux d'incident soutient la décision de mobilisation et d'activation du PCA. Les niveaux doivent être adaptés aux délégations, critères et seuils réellement établis par l'organisation. Ils ne remplacent pas le jugement opérationnel et ne doivent pas retarder l'action.

NIVEAU 1 — INCIDENT LOCAL / MINEUR
- Définition : Perturbation limitée pouvant être gérée par les ressources et processus opérationnels habituels
- Portée : Une activité, une équipe ou une ressource touchée sans menace immédiate sur les objectifs de continuité
- Exemples : Incident localisé, indisponibilité ponctuelle d'une ressource ou problème résolu dans le cadre des mécanismes habituels
- Autorité : Selon les responsabilités opérationnelles établies par l'organisation
- Activation PCA : Généralement non requise — surveillance et documentation selon la situation

NIVEAU 2 — INCIDENT MAJEUR / ACTIVATION PARTIELLE
- Définition : Perturbation significative menaçant une ou plusieurs activités prioritaires ou leurs objectifs de continuité
- Portée : Plusieurs fonctions, ressources ou dépendances peuvent être touchées et une coordination renforcée devient nécessaire
- Exemples : Indisponibilité prolongée d'une ressource critique, perte partielle de capacité, fournisseur critique indisponible ou incident susceptible de compromettre un RTO, un RPO, un MAD ou un niveau minimal de service
- Autorité : Selon la matrice d'autorité et les délégations validées par l'organisation
- Activation PCA : Partielle lorsque seules certaines fonctions, stratégies ou ressources doivent être mobilisées

NIVEAU 3 — CRISE / ACTIVATION ÉLARGIE
- Définition : Perturbation majeure menaçant plusieurs activités critiques ou nécessitant des décisions stratégiques et une coordination organisationnelle élargie
- Portée : Impacts importants ou croissants sur plusieurs activités, sites, systèmes, ressources ou parties intéressées
- Exemples : Perte majeure d'un site, indisponibilité prolongée de systèmes critiques, interruption étendue de ressources essentielles ou événement compromettant plusieurs objectifs de continuité
- Autorité : Selon la matrice d'autorité et les délégations validées par l'organisation
- Activation PCA : Élargie ou complète selon la portée réelle de l'incident

CRITÈRES D'ESCALADE
- Un RTO, RPO, MAD ou niveau minimal de service risque de ne pas être respecté
- L'incident affecte plusieurs activités, fonctions, sites ou dépendances
- Une ressource minimale nécessaire à une activité prioritaire devient indisponible
- Une stratégie de continuité ou un mode dégradé doit être activé
- Des ressources externes ou des décisions extraordinaires sont nécessaires
- Des obligations légales, réglementaires, contractuelles ou de communication peuvent être déclenchées
- L'incertitude, la durée ou l'étendue de l'incident augmente de façon significative

RÈGLE D'UTILISATION
La grille soutient le jugement; elle ne doit pas retarder l'action. En cas d'incertitude, l'organisation peut mobiliser préventivement les fonctions nécessaires puis ajuster le niveau lorsque la situation est mieux comprise.

APPROBATION DE L'APPRÉCIATION DU RISQUE
FONCTION | NOM / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
Responsable du PCA | ${coordName || ''} |
Direction générale | |`,
      },
    ],
  };

    const m3en = {
    moduleNumber: 3,
    title: 'RISK ASSESSMENT',
    language: 'en',
    sections: [
      {
        id: 'm3_s1',
        title: 'Approach and methodology',
        content: `The risk assessment complements the Business Impact Analysis by identifying events and failure points that could make resources required by essential activities unavailable. It helps identify organizational vulnerabilities, highlight unacceptable risk concentrations and guide control measures and continuity strategies.

APPROACH
The analysis is structured first around the consequences of resource unavailability and then around potential causes. This all-hazards approach avoids developing a separate BCP for every hazard and supports strategies that can be used across multiple scenarios.

RISK, CONSEQUENCE AND CONTINUITY
In a continuity context, the initiating event is not the only relevant consideration. Fire, flooding, cyber incidents, infrastructure failures or other events may produce similar operational consequences. The BCP therefore focuses on which resources may become unavailable and what that unavailability means for priority activities.

THE FIVE STRUCTURING CONSEQUENCES
1 — Loss of access to premises: Total or partial unavailability of a site, workspace or facility required for operations.
2 — Loss of IT and communication systems: Unavailability of equipment, applications, data, networks, telephones or digital services required for activities.
3 — Abnormal absenteeism or loss of key personnel: Insufficient staffing, loss of rare skills, unavailability of a sole role holder or inability to access the workplace.
4 — Disruption of a critical supplier or partner: Loss of a service, supply source, subcontractor or partner required to deliver products or services.
5 — Loss of essential resources, equipment, tools or services: Unavailability of energy, water, specialized equipment, vehicles, materials, documents, technical facilities or other required resources.

CLIMATE CHANGE AND EVOLVING CONTEXT
⚠️ VIGILANCE POINT: During risk assessment reviews, the organization should reassess significant changes that may affect its exposure or vulnerabilities. Climate change must also be considered to determine whether it is a relevant issue for the business continuity management system. — ISO 22301:2019/Amd 1:2024`,
      },

      {
        id: 'm3_s2',
        title: 'Assessment scales',
        content: `PROBABILITY SCALE
VALUE | LEVEL | DEFINITION
─────────────────────────────────────────────────────────────────────
3 | High | The cause is considered highly likely to occur.
─────────────────────────────────────────────────────────────────────
2 | Medium | The cause is considered reasonably likely to occur.
─────────────────────────────────────────────────────────────────────
1 | Low | The cause is considered unlikely to occur.

IMPACT SCALE
VALUE | LEVEL | DEFINITION
─────────────────────────────────────────────────────────────────────
3 | Severe | Major direct consequences affecting people, assets, the environment or the organization's ability to perform its activities; operations may become unavailable.
─────────────────────────────────────────────────────────────────────
2 | Moderate | Temporary or reversible effects that directly disrupt normal operations; activities may be slowed or partially impaired.
─────────────────────────────────────────────────────────────────────
1 | Low | Limited effects on resources, the environment or the organization's ability to perform its activities.

RISK LEVEL MATRIX (Impact × Probability)
IMPACT \\ PROBABILITY | 3 - High | 2 - Medium | 1 - Low
─────────────────────────────────────────────────────────────────────
3 - Severe | 9 - HIGH | 6 - HIGH | 3 - MEDIUM
─────────────────────────────────────────────────────────────────────
2 - Moderate | 6 - HIGH | 4 - MEDIUM | 2 - LOW
─────────────────────────────────────────────────────────────────────
1 - Low | 3 - MEDIUM | 2 - LOW | 1 - LOW

Interpretation: 1 or 2 = LOW | 3 or 4 = MEDIUM | 6 or 9 = HIGH

IMPORTANT DISTINCTION
Risk level does not replace the BIA. The risk assessment helps determine what may make a resource unavailable; the BIA determines which activities must be maintained or recovered, within what timeframe and with which resources.`,
      },

      {
        id: 'm3_s3',
        title: 'Identified disruption scenarios',
        content: `CONSEQUENCE | CAUSE / SCENARIO | IMPACT | PROBABILITY | RISK LEVEL | EXISTING CONTROLS | COMMENTS
─────────────────────────────────────────────────────────────────────
${riskTableEN}

INTERPRETING THE RESULTS
A low risk level should not be interpreted as the absence of risk. A low-probability scenario may still require a continuity strategy when its consequences are incompatible with the tolerances established through the BIA.

RISK CONCENTRATION SUMMARY
${(() => {
  const evaluatedRisks = riskScenarios
    .filter((r: any) => r.probability && r.impact)
    .map((r: any) => {
      const p =
        r.probability === 'ELEVEE'
          ? 3
          : r.probability === 'MOYENNE'
            ? 2
            : 1;

      const i =
        r.impact === 'ELEVE'
          ? 3
          : r.impact === 'MOYEN'
            ? 2
            : 1;

      return {
        ...r,
        score: p * i,
      };
    });

  const highRisks = evaluatedRisks.filter((r: any) => r.score >= 6);
  const incompleteRisks = riskScenarios.filter((r: any) => !r.probability || !r.impact);

  if (highRisks.length > 0) {
    return `HIGH risks identified (score ≥ 6):
${highRisks
  .map((r: any) => `• ${scenarioLabelEN(r.id)} — Score ${r.score}`)
  .join('\n')}

${incompleteRisks.length > 0
  ? `${incompleteRisks.length} additional scenario(s) remain incomplete and must be fully assessed before the risk assessment can be considered complete.`
  : 'All documented scenarios include an assessed probability and impact.'}`;
  }

  if (incompleteRisks.length > 0) {
    return `No HIGH risk can currently be identified among the fully assessed scenarios.

${incompleteRisks.length} scenario(s) remain incomplete and must be assessed before concluding that no high risk exists.`;
  }

  return 'No HIGH risk identified among the assessed scenarios — Maintain monitoring and reassess according to the organization’s established review cycle and following significant changes.';
})()}`,
      },

      {
        id: 'm3_s4',
        title: 'Incident level grid',
        content: `The incident level grid supports BCP mobilization and activation decisions. Levels should be adapted to the authorities, criteria and thresholds actually established by the organization. They do not replace operational judgment and must not delay action.

LEVEL 1 — LOCAL / MINOR INCIDENT
- Definition: Limited disruption that can be managed through normal operational resources and processes
- Scope: One activity, team or resource affected without an immediate threat to continuity objectives
- Examples: Localized incident, temporary resource unavailability or issue resolved through normal operating arrangements
- Authority: According to operational responsibilities established by the organization
- BCP activation: Generally not required — monitoring and documentation as appropriate

LEVEL 2 — MAJOR INCIDENT / PARTIAL ACTIVATION
- Definition: Significant disruption threatening one or more priority activities or continuity objectives
- Scope: Multiple functions, resources or dependencies may be affected and enhanced coordination is required
- Examples: Prolonged unavailability of a critical resource, partial loss of capability, critical supplier disruption or an incident that may compromise an RTO, RPO, MAD or minimum service level
- Authority: According to the authority matrix and delegations validated by the organization
- BCP activation: Partial where only selected functions, strategies or resources need to be mobilized

LEVEL 3 — CRISIS / EXPANDED ACTIVATION
- Definition: Major disruption threatening several critical activities or requiring strategic decisions and broader organizational coordination
- Scope: Significant or increasing impacts across multiple activities, sites, systems, resources or interested parties
- Examples: Major site loss, prolonged unavailability of critical systems, widespread loss of essential resources or an event compromising multiple continuity objectives
- Authority: According to the authority matrix and delegations validated by the organization
- BCP activation: Expanded or full depending on the actual scope of the incident

ESCALATION CRITERIA
- An RTO, RPO, MAD or minimum service level is at risk of not being achieved
- The incident affects multiple activities, functions, sites or dependencies
- A minimum resource required by a priority activity becomes unavailable
- A continuity strategy or degraded mode must be activated
- External resources or extraordinary decisions are required
- Legal, regulatory, contractual or communication obligations may be triggered
- The uncertainty, duration or scope of the incident increases significantly

USE RULE
The grid supports judgment and must not delay action. Where uncertainty exists, the organization may mobilize the necessary functions preventively and adjust the incident level as the situation becomes clearer.

RISK ASSESSMENT APPROVAL
FUNCTION | NAME / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
BCP Owner | ${coordName || ''} |
Senior Management | |`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 4 — BILAN D'IMPACT SUR LES ACTIVITÉS (BIA)
  // ══════════════════════════════════════════════
  const recoveryPriorityOrder: Record<string, number> = {
  'CRITIQUE': 1,
  'ELEVEE': 2,
  'MOYENNE': 3,
  'FAIBLE': 4,
};

const rtoOrder: Record<string, number> = {
  '1h': 1,
  '2h': 2,
  '4h': 3,
  '8h': 4,
  '24h': 5,
  '48h': 6,
  '72h': 7,
  '1sem': 8,
  '2sem': 9,
  '1mois': 10,
  'plus': 11,
};

const sortedServices = criticalServices.length > 0
  ? [...criticalServices].sort((a: any, b: any) => {
      const priorityA = recoveryPriorityOrder[a.recoveryPriority] || 99;
      const priorityB = recoveryPriorityOrder[b.recoveryPriority] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return (rtoOrder[a.rto] || 99) - (rtoOrder[b.rto] || 99);
    })
  : [];

  const recoveryPriorityLabelFR = (value: string | null | undefined) => {
  switch (value) {
    case 'CRITIQUE':
      return 'Critique';
    case 'ELEVEE':
      return 'Élevée';
    case 'MOYENNE':
      return 'Moyenne';
    case 'FAIBLE':
      return 'Faible';
    default:
      return 'À déterminer';
  }
};

const recoveryPriorityLabelEN = (value: string | null | undefined) => {
  switch (value) {
    case 'CRITIQUE':
      return 'Critical';
    case 'ELEVEE':
      return 'High';
    case 'MOYENNE':
      return 'Medium';
    case 'FAIBLE':
      return 'Low';
    default:
      return 'To be determined';
  }
};

const impactLevelLabelFR = (value: string | null | undefined) => {
  switch (value) {
    case 'NEGLIGEABLE':
      return 'Négligeable';
    case 'FAIBLE':
      return 'Faible';
    case 'MODERE':
      return 'Modéré';
    case 'ELEVE':
      return 'Élevé';
    case 'CRITIQUE':
      return 'Critique';
    default:
      return 'À déterminer';
  }
};

const impactLevelLabelEN = (value: string | null | undefined) => {
  switch (value) {
    case 'NEGLIGEABLE':
      return 'Negligible';
    case 'FAIBLE':
      return 'Low';
    case 'MODERE':
      return 'Moderate';
    case 'ELEVE':
      return 'High';
    case 'CRITIQUE':
      return 'Critical';
    default:
      return 'To be determined';
  }
};

const legalImpactLabelFR = (value: boolean | null | undefined) => {
  if (value === true) return 'Oui';
  if (value === false) return 'Non';
  return 'À déterminer';
};

const legalImpactLabelEN = (value: boolean | null | undefined) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'To be determined';
};

  const biaTableFR = sortedServices.length > 0
    ? sortedServices.map((s: any, i: number) => {
        const prio = recoveryPriorityLabelFR(s.recoveryPriority);
        const owner = s.owner || 'À désigner';
        return `${s.name || `Service ${i + 1}`} | ${owner} | ${s.rto || 'N/D'} | ${s.mad || 'N/D'} | ${s.rpo || 'N/D'} | ${s.financialImpact ?? 'N/D'} | ${prio}`;
      }).join('\n')
    : 'Aucun service critique défini — À compléter dans le configurateur PCA (Section 4)';

  const biaTableEN = sortedServices.length > 0
    ? sortedServices.map((s: any, i: number) => {
        const prio = recoveryPriorityLabelEN(s.recoveryPriority);
        const owner = s.owner || 'To be designated';
        return `${s.name || `Service ${i + 1}`} | ${owner} | ${s.rto || 'N/A'} | ${s.mad || 'N/A'} | ${s.rpo || 'N/A'} | ${s.financialImpact ?? 'N/A'} | ${prio}`;
      }).join('\n')
    : 'No critical services defined — To be completed in BCP configurator (Section 4)';

  // Fiches BIA enrichies
  const biaFichesFR = sortedServices.map((s: any, i: number) => {
    const prio = recoveryPriorityLabelFR(s.recoveryPriority);
    return `
FICHE BIA — ${(s.name || `Service ${i + 1}`).toUpperCase()}
─────────────────────────────────────────────────────────────────────
Responsable | ${s.owner || 'À désigner'}
Priorité | ${prio}
Niveau minimal de service | ${s.minServiceLevel || 'À définir'}
RTO | ${s.rto || 'N/D'}
MAD / Tolérance maximale | ${s.mad || 'N/D'}
RPO | ${s.rpo || 'N/D'}
Impact financier estimé / jour | ${s.financialImpact ?? 'N/D'}
Impact réputationnel | ${s.reputationalImpact || 'N/D'}
Impact légal, réglementaire ou contractuel | ${legalImpactLabelFR(s.legalImpact)}
Impact après 4 heures | ${impactLevelLabelFR(s.impact4h)}
Impact après 24 heures | ${impactLevelLabelFR(s.impact24h)}
Impact après 72 heures | ${impactLevelLabelFR(s.impact72h)}
Impact après 7 jours | ${impactLevelLabelFR(s.impact7d)}
Périodes critiques | ${s.criticalPeriods || 'Non précisées'}
Mode dégradé | ${s.degradedMode || 'Non documenté'}
Durée soutenable du mode dégradé | ${s.degradedModeDuration || 'Non précisée'}

RESSOURCES MINIMALES
─────────────────────────────────────────────────────────────────────
Personnel | ${s.resourcePersonnel || 'À documenter'}
Systèmes TI | ${s.resourceIT || 'À documenter'}
Équipements | ${s.resourceEquipment || 'À documenter'}
Fournisseurs / partenaires | ${s.resourceSuppliers || 'À documenter'}
Site / installations | ${s.resourceSite || 'À documenter'}
Énergie | ${s.resourceEnergy || 'À documenter'}`;
  }).join('\n\n');

  const biaFichesEN = sortedServices.map((s: any, i: number) => {
  const prio = recoveryPriorityLabelEN(s.recoveryPriority);
    return `
BIA SHEET — ${(s.name || `Service ${i + 1}`).toUpperCase()}
─────────────────────────────────────────────────────────────────────
Owner | ${s.owner || 'To be designated'}
Priority | ${prio}
Minimum service level | ${s.minServiceLevel || 'To be defined'}
RTO | ${s.rto || 'N/A'}
MAD / Maximum tolerance | ${s.mad || 'N/A'}
RPO | ${s.rpo || 'N/A'}
Estimated financial impact / day | ${s.financialImpact ?? 'N/A'}
Reputational impact | ${s.reputationalImpact || 'N/A'}
Legal, regulatory or contractual impact | ${legalImpactLabelEN(s.legalImpact)}
Impact after 4 hours | ${impactLevelLabelEN(s.impact4h)}
Impact after 24 hours | ${impactLevelLabelEN(s.impact24h)}
Impact after 72 hours | ${impactLevelLabelEN(s.impact72h)}
Impact after 7 days | ${impactLevelLabelEN(s.impact7d)}
Critical periods | ${s.criticalPeriods || 'Not specified'}
Degraded mode | ${s.degradedMode || 'Not documented'}
Sustainable degraded-mode duration | ${s.degradedModeDuration || 'Not specified'}

MINIMUM RESOURCES
─────────────────────────────────────────────────────────────────────
Personnel | ${s.resourcePersonnel || 'To be documented'}
IT systems | ${s.resourceIT || 'To be documented'}
Equipment | ${s.resourceEquipment || 'To be documented'}
Suppliers / partners | ${s.resourceSuppliers || 'To be documented'}
Site / facilities | ${s.resourceSite || 'To be documented'}
Energy | ${s.resourceEnergy || 'To be documented'}`;
  }).join('\n\n');

  // Systèmes TI critiques
  const itSystemsFR = criticalITSystems.length > 0
  ? criticalITSystems.map((s: any) =>
      `${s.name || 'N/D'} | ${s.rto || 'N/D'} | ${s.rpo || 'N/D'} | ${s.degradedMode || 'À documenter'} | ${s.backupSolution || 'À documenter'}`
    ).join('\n')
  : 'À documenter — Ajouter les systèmes TI critiques dans le configurateur (Section 5)';

const itSystemsEN = criticalITSystems.length > 0
  ? criticalITSystems.map((s: any) =>
      `${s.name || 'N/A'} | ${s.rto || 'N/A'} | ${s.rpo || 'N/A'} | ${s.degradedMode || 'To be documented'} | ${s.backupSolution || 'To be documented'}`
    ).join('\n')
  : 'To be documented — Add critical IT systems in configurator (Section 5)';

  // Fournisseurs critiques
  const statusLabelFR = (s: string) => s === 'PRET' ? '✅ Prêt' : s === 'PARTIEL' ? '⚠️ Partiel' : '🔴 À confirmer';
  const statusLabelEN = (s: string) => s === 'PRET' ? '✅ Ready' : s === 'PARTIEL' ? '⚠️ Partial' : '🔴 To confirm';

  const criticalSuppliersFR = criticalSuppliers.length > 0
  ? criticalSuppliers.map((s: any) =>
      `${s.name || 'N/D'} | ${s.service || 'N/D'} | ${s.tolerance || 'N/D'} | ${s.preventiveMeasure || 'À documenter'} | ${s.backupSolution || 'À documenter'} | ${s.activationDelay || 'N/D'} | ${statusLabelFR(s.status || 'A_CONFIRMER')}`
    ).join('\n')
  : 'À documenter — Ajouter les fournisseurs critiques dans le configurateur (Section 5)';

const criticalSuppliersEN = criticalSuppliers.length > 0
  ? criticalSuppliers.map((s: any) =>
      `${s.name || 'N/A'} | ${s.service || 'N/A'} | ${s.tolerance || 'N/A'} | ${s.preventiveMeasure || 'To be documented'} | ${s.backupSolution || 'To be documented'} | ${s.activationDelay || 'N/A'} | ${statusLabelEN(s.status || 'A_CONFIRMER')}`
    ).join('\n')
  : 'To be documented — Add critical suppliers in configurator (Section 5)';

  const resourcesTableFR = sortedServices.length > 0
  ? sortedServices.flatMap((s: any, i: number) => {
      const activity = s.name || `Activité ${i + 1}`;

      return [
        `Personnel | ${s.resourcePersonnel || 'À déterminer'} | ${activity} | ${s.rto ? `Doit être disponible dans un délai compatible avec le RTO ${s.rto}` : 'Délai requis à déterminer'}`,
        `Systèmes TI / données | ${s.resourceIT || 'À déterminer'} | ${activity} | ${s.rto ? `Doit être disponible dans un délai compatible avec le RTO ${s.rto}` : 'Délai requis à déterminer'}`,
        `Équipements / outils | ${s.resourceEquipment || 'À déterminer'} | ${activity} | ${s.rto ? `Doit être disponible dans un délai compatible avec le RTO ${s.rto}` : 'Délai requis à déterminer'}`,
        `Fournisseurs / partenaires | ${s.resourceSuppliers || 'À déterminer'} | ${activity} | ${s.rto ? `Doit être disponible dans un délai compatible avec le RTO ${s.rto}` : 'Délai requis à déterminer'}`,
        `Site / installations | ${s.resourceSite || 'À déterminer'} | ${activity} | ${s.rto ? `Doit être disponible dans un délai compatible avec le RTO ${s.rto}` : 'Délai requis à déterminer'}`,
        `Énergie / services essentiels | ${s.resourceEnergy || 'À déterminer'} | ${activity} | ${s.rto ? `Doit être disponible dans un délai compatible avec le RTO ${s.rto}` : 'Délai requis à déterminer'}`,
      ];
    }).join('\n')
  : 'Aucune ressource minimale documentée — Compléter le BIA dans le configurateur PCA.';

const resourcesTableEN = sortedServices.length > 0
  ? sortedServices.flatMap((s: any, i: number) => {
      const activity = s.name || `Activity ${i + 1}`;

      return [
        `Personnel | ${s.resourcePersonnel || 'To be determined'} | ${activity} | ${s.rto ? `Must be available within a timeframe compatible with RTO ${s.rto}` : 'Required timeframe to be determined'}`,
        `IT systems / data | ${s.resourceIT || 'To be determined'} | ${activity} | ${s.rto ? `Must be available within a timeframe compatible with RTO ${s.rto}` : 'Required timeframe to be determined'}`,
        `Equipment / tools | ${s.resourceEquipment || 'To be determined'} | ${activity} | ${s.rto ? `Must be available within a timeframe compatible with RTO ${s.rto}` : 'Required timeframe to be determined'}`,
        `Suppliers / partners | ${s.resourceSuppliers || 'To be determined'} | ${activity} | ${s.rto ? `Must be available within a timeframe compatible with RTO ${s.rto}` : 'Required timeframe to be determined'}`,
        `Site / facilities | ${s.resourceSite || 'To be determined'} | ${activity} | ${s.rto ? `Must be available within a timeframe compatible with RTO ${s.rto}` : 'Required timeframe to be determined'}`,
        `Energy / essential utilities | ${s.resourceEnergy || 'To be determined'} | ${activity} | ${s.rto ? `Must be available within a timeframe compatible with RTO ${s.rto}` : 'Required timeframe to be determined'}`,
      ];
    }).join('\n')
  : 'No minimum resources documented — Complete the BIA in the BCP configurator.';

  const m4fr = {
    moduleNumber: 4,
    title: 'BILAN D\'IMPACT SUR LES ACTIVITÉS (BIA)',
    language: 'fr',
    sections: [
      {
        id: 'm4_s1',
        title: 'Logique et méthodologie du BIA',
        content: `Le bilan d'impact sur les activités (BIA) constitue le cœur analytique du Plan de continuité des activités. Il permet d'identifier les produits et services dont l'interruption deviendrait inacceptable, les activités qui les soutiennent, les délais dans lesquels ces activités doivent être maintenues ou rétablies ainsi que les ressources et dépendances nécessaires à leur fonctionnement.

Le BIA ne cherche pas à déterminer la probabilité d'un événement. Il évalue plutôt les conséquences d'une interruption dans le temps afin d'établir les priorités de continuité.

PRINCIPE DIRECTEUR
Une activité n'est pas déclarée critique uniquement parce qu'elle est importante en temps normal. Elle devient prioritaire en continuité lorsque son interruption, au-delà d'un certain délai, entraîne des conséquences que l'organisation juge inacceptables.

LOGIQUE DU BIA
ÉTAPE | QUESTION | RÉSULTAT | UTILISATION
─────────────────────────────────────────────────────────────────────
1 | Quels produits et services doivent absolument être maintenus? | Produits / services essentiels | Détermine ce que l'organisation doit protéger.
─────────────────────────────────────────────────────────────────────
2 | Quelles activités permettent de les livrer? | Activités essentielles / critiques | Établit les priorités opérationnelles.
─────────────────────────────────────────────────────────────────────
3 | Combien de temps l'interruption est-elle tolérable? | Tolérance maximale / MAD | Fixe la limite avant conséquences inacceptables.
─────────────────────────────────────────────────────────────────────
4 | Quand l'activité doit-elle être reprise? | RTO | Oriente la stratégie et la séquence de reprise.
─────────────────────────────────────────────────────────────────────
5 | Quel niveau minimal doit être assuré? | Niveau minimal de service | Définit la capacité requise en mode dégradé.
─────────────────────────────────────────────────────────────────────
6 | Quelles ressources sont indispensables? | Personnel, TI, sites, fournisseurs, équipements, données | Permet de concevoir les solutions de continuité.

NOTIONS ESSENTIELLES
- RTO (Recovery Time Objective) : Délai cible à l'intérieur duquel une activité doit être rétablie après une interruption.
- RPO (Recovery Point Objective) : Quantité maximale de données que l'organisation accepte de perdre, exprimée comme un point dans le temps avant l'incident.
- MAD / MTPD : Durée maximale d'interruption que l'organisation peut tolérer avant que les conséquences deviennent inacceptables.
- Mode dégradé : Organisation temporaire permettant de maintenir une capacité réduite ou modifiée jusqu'au rétablissement des conditions normales.
- Dépendance critique : Ressource interne ou externe dont l'indisponibilité compromet directement l'atteinte de l'objectif de continuité d'une activité.

COHÉRENCE DES OBJECTIFS
Le RTO d'une activité doit normalement être inférieur à sa tolérance maximale à l'interruption afin de conserver une marge de manœuvre. De même, une ressource indispensable à une activité ne peut avoir un délai de reprise supérieur au délai dans lequel cette activité doit fonctionner, sauf si une solution de contournement est prévue.`,
      },
      {
        id: 'm4_s2',
        title: 'Services et activités critiques',
        content: `PRODUIT / SERVICE | RESPONSABLE | RTO | MAD | RPO | IMPACT FINANCIER / JOUR | PRIORITÉ
─────────────────────────────────────────────────────────────────────
${biaTableFR}

LECTURE OPÉRATIONNELLE
La priorité de reprise exprime le niveau de priorité attribué à l'activité dans le BIA. Une priorité Critique ou Élevée indique que l'activité doit faire l'objet d'une attention rapide lors d'une interruption. La priorité ne signifie pas nécessairement que l'activité doit être pleinement rétablie : le PCA peut viser d'abord un niveau minimal de service, puis une remontée progressive de capacité.

${criticalServices.length > 0 ? `PROFIL TEMPOREL DES IMPACTS
ACTIVITÉ | 4 h | 24 h | 72 h | 7 jours | MAD
─────────────────────────────────────────────────────────────────────
${criticalServices.map((s: any) =>
  `${(s.name || 'Activité').substring(0, 30)} | ${impactLevelLabelFR(s.impact4h)} | ${impactLevelLabelFR(s.impact24h)} | ${impactLevelLabelFR(s.impact72h)} | ${impactLevelLabelFR(s.impact7d)} | ${s.mad || 'À déterminer'}`
).join('\n')}` : ''}`,
      },
            {
        id: 'm4_s3',
        title: 'Ressources critiques identifiées',
        content: `Une activité ne peut être reprise uniquement parce qu'un responsable est disponible. Il faut identifier les ressources minimales qui rendent réellement possible son fonctionnement.

CATÉGORIE | RESSOURCE MINIMALE | ACTIVITÉ DÉPENDANTE | EXIGENCE DE DISPONIBILITÉ
─────────────────────────────────────────────────────────────────────
${resourcesTableFR}

LECTURE DES RESSOURCES
Les ressources indiquées proviennent des besoins minimaux documentés pour chaque activité dans le BIA. Leur disponibilité doit être compatible avec les objectifs de reprise de l'activité concernée. Lorsqu'une ressource est elle-même assujettie à un délai de rétablissement, ce délai doit permettre l'atteinte du RTO de l'activité ou une solution de contournement doit être prévue.

${biaFichesFR ? `\nFICHES BIA DÉTAILLÉES PAR ACTIVITÉ\n${biaFichesFR}` : ''}`,
      },
      {
  id: 'm4_s4',
  title: 'Analyse des dépendances et écarts',
  content: `L'analyse des dépendances permet d'identifier les ressources internes et externes dont l'indisponibilité pourrait compromettre l'atteinte des objectifs de continuité. Elle permet également de documenter les points uniques de défaillance et les prérequis devant être satisfaits avant la reprise d'une activité.

ACTIVITÉ CRITIQUE | DÉPENDANCES INTERNES | DÉPENDANCES EXTERNES | POINTS UNIQUES DE DÉFAILLANCE | PRÉREQUIS DE REPRISE
─────────────────────────────────────────────────────────────────────
${criticalServices.length > 0
  ? criticalServices.map((s: any) =>
      `${(s.name || 'Activité').substring(0, 25)} | ${s.internalDependencies || 'À déterminer'} | ${s.externalDependencies || 'À déterminer'} | ${s.singlePointsOfFailure || 'À déterminer'} | ${s.recoveryPrerequisites || 'À déterminer'}`
    ).join('\n')
  : 'Aucune activité critique documentée — Compléter le BIA dans le configurateur PCA.'}

INTERPRÉTATION
Les dépendances documentées doivent être prises en compte lors de la conception des stratégies de continuité et de la séquence de reprise. Une activité ne doit pas être considérée comme réellement récupérable si les ressources ou prérequis indispensables à son fonctionnement demeurent indisponibles.

TRAITEMENT DES ÉCARTS
Lorsqu'une dépendance, un point unique de défaillance ou un prérequis insuffisamment maîtrisé est identifié, l'organisation doit déterminer la réponse appropriée :
- Réduire l'exposition par une redondance, une relève, une diversification ou une mesure de contrôle
- Prévoir une solution de contournement ou un mode dégradé
- Renforcer les contrats, ententes ou capacités de fournisseurs alternatifs
- Développer les compétences, la relève ou la documentation nécessaires
- Tester la capacité lorsque son efficacité n'a pas encore été démontrée
- Accepter formellement le risque résiduel lorsque celui-ci demeure compatible avec les objectifs de continuité

APPROBATION DU BIA
FONCTION | NOM / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
Responsable du PCA | ${coordName || ''} |
Responsable des opérations | |
Direction générale | |`,
},
    ],
  };

  const m4en = {
    moduleNumber: 4,
    title: 'BUSINESS IMPACT ANALYSIS (BIA)',
    language: 'en',
    sections: [
      {
        id: 'm4_s1',
        title: 'BIA logic and methodology',
        content: `The Business Impact Analysis (BIA) is the analytical core of the Business Continuity Plan. It identifies products and services whose interruption would become unacceptable, the activities that support them, the timeframes within which these activities must be maintained or restored, and the resources and dependencies required for their operation.

KEY DEFINITIONS
- RTO (Recovery Time Objective): Target time within which an activity must be restored after an interruption.
- RPO (Recovery Point Objective): Maximum amount of data the organization accepts losing, expressed as a point in time before the incident.
- MAD / MTPD: Maximum tolerable period of disruption before consequences become unacceptable.
- Degraded mode: Temporary arrangement allowing reduced or modified capacity until normal conditions are restored.`,
      },
      {
        id: 'm4_s2',
        title: 'Critical services and activities',
        content: `PRODUCT / SERVICE | CRITICAL ACTIVITY / OWNER | RTO | MAD | RPO | FINANCIAL IMPACT / DAY | PRIORITY
─────────────────────────────────────────────────────────────────────
${biaTableEN}

OPERATIONAL INTERPRETATION
The recovery priority reflects the priority level assigned to the activity in the BIA. A Critical or High priority indicates that the activity requires prompt attention following a disruption. The priority does not necessarily mean that the activity must be fully restored immediately: the BCP may first target a minimum service level, followed by a progressive restoration of capacity.

${criticalServices.length > 0 ? `TIME-BASED IMPACT PROFILE
ACTIVITY | 4 h | 24 h | 72 h | 7 days | MAD
─────────────────────────────────────────────────────────────────────
${criticalServices.map((s: any) =>
  `${(s.name || 'Activity').substring(0, 30)} | ${impactLevelLabelEN(s.impact4h)} | ${impactLevelLabelEN(s.impact24h)} | ${impactLevelLabelEN(s.impact72h)} | ${impactLevelLabelEN(s.impact7d)} | ${s.mad || 'To be determined'}`
).join('\n')}` : ''}`,
      },
      {
  id: 'm4_s3',
  title: 'Critical resources identified',
  content: `An activity cannot be resumed solely because its owner is available. The minimum resources required to operate the activity must also be available within a timeframe compatible with its continuity objectives.

CATEGORY | MINIMUM RESOURCE | DEPENDENT ACTIVITY | AVAILABILITY REQUIREMENT
─────────────────────────────────────────────────────────────────────
${resourcesTableEN}

RESOURCE INTERPRETATION
The resources shown above are derived from the minimum requirements documented for each activity in the BIA. Their availability must be compatible with the recovery objectives of the activity concerned. Where a resource has its own restoration timeframe, that timeframe must support the activity's RTO or an appropriate workaround must be available.

${biaFichesEN ? `\nDETAILED BIA SHEETS BY ACTIVITY\n${biaFichesEN}` : ''}`,
},
      {
  id: 'm4_s4',
  title: 'Dependencies and gap analysis',
  content: `Dependency analysis identifies the internal and external resources whose unavailability could compromise continuity objectives. It also documents single points of failure and the prerequisites that must be satisfied before an activity can be resumed.

CRITICAL ACTIVITY | INTERNAL DEPENDENCIES | EXTERNAL DEPENDENCIES | SINGLE POINTS OF FAILURE | RECOVERY PREREQUISITES
─────────────────────────────────────────────────────────────────────
${criticalServices.length > 0
  ? criticalServices.map((s: any) =>
      `${(s.name || 'Activity').substring(0, 25)} | ${s.internalDependencies || 'To be determined'} | ${s.externalDependencies || 'To be determined'} | ${s.singlePointsOfFailure || 'To be determined'} | ${s.recoveryPrerequisites || 'To be determined'}`
    ).join('\n')
  : 'No critical activity documented — Complete the BIA in the BCP configurator.'}

INTERPRETATION
Documented dependencies must be considered when designing continuity strategies and establishing the recovery sequence. An activity should not be considered fully recoverable if the resources or prerequisites essential to its operation remain unavailable.

GAP TREATMENT
When a dependency, single point of failure or insufficiently controlled prerequisite is identified, the organization should determine the appropriate response:
- Reduce exposure through redundancy, backup capacity, diversification or other controls
- Establish a workaround or degraded operating mode
- Strengthen contracts, agreements or alternate supplier capabilities
- Develop required skills, succession arrangements or documentation
- Test the capability when its effectiveness has not yet been demonstrated
- Formally accept residual risk when it remains compatible with continuity objectives

BIA APPROVAL
FUNCTION | NAME / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
BCP Coordinator | ${coordName || ''} |
Operations Manager | |
Senior Management | |`,
},
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 5 — STRATÉGIES DE CONTINUITÉ
  // ══════════════════════════════════════════════

  const m5fr = {
    moduleNumber: 5,
    title: 'STRATÉGIES DE CONTINUITÉ',
    language: 'fr',
    sections: [
      {
        id: 'm5_s1',
        title: 'Principes de conception des stratégies',
        content: `Les stratégies de continuité sont les solutions préparées à l'avance pour maintenir les activités essentielles lorsque les ressources habituelles deviennent indisponibles. Elles découlent directement des résultats du BIA (chapitre 4) et des vulnérabilités identifiées dans l'ARA (chapitre 3).

UNE STRATÉGIE N'EST PAS UN PLAN DE RÉPONSE
Une stratégie est une décision préalable indiquant comment l'organisation entend maintenir ou rétablir une capacité minimale. Les détails opérationnels de la mise en œuvre figurent dans les procédures de continuité (chapitre 7) et les fiches spécialisées.

TYPES DE STRATÉGIES PAR CONSÉQUENCE
Les stratégies sont organisées selon les cinq conséquences structurantes de l'ARA afin d'assurer une couverture cohérente :
1. Perte d'accès à l'emplacement → Relocalisation, télétravail, site alternatif
2. Perte des systèmes TI et communications → Relève TI, procédures manuelles, accès distants
3. Absentéisme / perte de personnel clé → Formation croisée, personnel temporaire, documentation
4. Interruption d'un fournisseur critique → Fournisseurs alternatifs, stocks tampon, substitution
5. Perte de ressources essentielles → Génératrice, UPS, équipements de secours`,
      },
      {
        id: 'm5_s2',
        title: 'Stratégies par conséquence — Perte d\'accès à l\'emplacement',
        content: `CONSÉQUENCE : Perte d'accès au bâtiment ou au site principal

STRATÉGIE | DISPONIBILITÉ | DÉTAILS | ACTIVITÉS COUVERTES
─────────────────────────────────────────────────────────────────────
Télétravail | ${cfg.teleworkPossible || 'Non documenté'} | ${cfg.teleworkPossible === 'Oui' ? 'Capacité de télétravail déclarée disponible — périmètre et capacité à valider selon les activités du BIA' : cfg.teleworkPossible === 'Partiel' ? 'Capacité de télétravail partielle déclarée — activités couvertes et capacité à préciser' : 'Applicabilité à évaluer selon les activités et les ressources requises'} | Activités dont les exigences permettent un fonctionnement à distance
─────────────────────────────────────────────────────────────────────
Site alternatif | ${cfg.alternativeSite ? 'Déclaré' : 'Non documenté'} | ${cfg.alternativeSiteAddress || 'À définir'} | Fonctions nécessitant un lieu physique
─────────────────────────────────────────────────────────────────────
Entente de partage | ${cfg.sharingAgreement ? 'Déclarée' : 'Non documentée'} | ${cfg.sharingAgreement ? 'Entente déclarée — modalités opérationnelles et capacité réelle à valider avec l’organisation partenaire' : 'Aucune entente de partage documentée'} | Selon entente
─────────────────────────────────────────────────────────────────────
Procédures d'urgence | Lien PMU | ${cfg.linkedPmuId ? 'PMU lié — voir document' : 'Aucun PMU lié'} | Évacuation, sécurité des personnes`,
      },
      {
        id: 'm5_s3',
        title: 'Stratégies par conséquence — Perte des systèmes TI',
        content: `CONSÉQUENCE : Perte des systèmes informatiques et de communication

STRATÉGIE | DISPONIBILITÉ | DÉTAILS
─────────────────────────────────────────────────────────────────────
Relève / redondance TI | ${cfg.itRedundancy ? 'Déclarée disponible' : 'Non documentée'} | ${cfg.itRedundancy ? 'Capacité de relève ou de redondance déclarée — couverture, capacité et délais réels à valider selon les systèmes critiques' : 'Aucune capacité de relève ou de redondance documentée'}
─────────────────────────────────────────────────────────────────────
Sauvegardes hors site | ${cfg.offSiteBackup ? 'Déclarées disponibles' : 'Non documentées'} | ${cfg.offSiteBackup ? `Fréquence déclarée : ${cfg.backupFrequency || 'À documenter'} — capacité de restauration et compatibilité avec les RPO à valider` : 'Aucune sauvegarde hors site documentée — besoin à évaluer selon les RPO des systèmes et activités'}
─────────────────────────────────────────────────────────────────────
Procédures manuelles | ${cfg.processDocumented ? 'Documentation déclarée disponible' : 'Non documentées'} | ${cfg.processDocumented ? 'Des processus sont déclarés documentés — vérifier les activités pouvant réellement fonctionner manuellement ou en mode dégradé' : 'Identifier les activités nécessitant une procédure manuelle ou un mode dégradé'}
─────────────────────────────────────────────────────────────────────
Accès mobiles / alternatifs | À déterminer | Moyens alternatifs de communication et d'accès à documenter selon les besoins du BIA | Activités nécessitant un accès distant ou des communications en mode dégradé

SYSTÈMES TI CRITIQUES — INVENTAIRE ET OBJECTIFS DE REPRISE
SYSTÈME / APPLICATION | RTO | RPO | MODE DÉGRADÉ | SOLUTION DE RELÈVE
─────────────────────────────────────────────────────────────────────
${itSystemsFR}`,
      },
      {
        id: 'm5_s4',
        title: 'Stratégies par conséquence — Personnel et fournisseurs',
        content: `CONSÉQUENCE : Absentéisme anormal ou perte de personnel clé

STRATÉGIE | DISPONIBILITÉ | DÉTAILS
─────────────────────────────────────────────────────────────────────
Formation croisée | ${cfg.crossTraining ? 'Déclarée en place' : 'Non documentée'} | ${cfg.crossTraining ? 'Une capacité de formation croisée est déclarée — couverture des activités critiques et niveau de compétence à valider' : 'Évaluer les besoins de relève et de formation croisée pour les activités critiques'}
─────────────────────────────────────────────────────────────────────
Documentation des processus | ${cfg.processDocumented ? 'Déclarée disponible' : 'Non documentée'} | ${cfg.processDocumented ? 'Documentation des processus déclarée disponible — couverture des activités critiques et accessibilité à valider' : 'Documenter les processus critiques concentrés chez les employés clés'}
─────────────────────────────────────────────────────────────────────
Personnel temporaire | ${cfg.tempStaffAccess ? 'Accès déclaré disponible' : 'Non documenté'} | ${cfg.tempStaffAccess ? 'Une capacité d\'accès à du personnel temporaire est déclarée — modalités, délais et compétences disponibles à confirmer' : 'Évaluer si du personnel temporaire peut soutenir certaines activités critiques'}
─────────────────────────────────────────────────────────────────────
Seuil d'activation absentéisme | ${cfg.absenteeismThreshold ? (cfg.absenteeismThreshold === 'cle' ? 'Perte d\'un employé clé' : `≥ ${cfg.absenteeismThreshold}% du personnel absent`) : 'Non défini'} | ${cfg.absenteeismThreshold ? 'Déclenche la procédure PC013 — Pandémie / absentéisme massif' : 'À définir dans le configurateur PCA (Section 5)'}

CONSÉQUENCE : Interruption d'un fournisseur ou partenaire critique

STRATÉGIE | DISPONIBILITÉ | DÉTAILS
─────────────────────────────────────────────────────────────────────
Fournisseurs alternatifs | ${cfg.alternativeSuppliers ? 'Déclarés identifiés' : 'Non documentés'} | ${cfg.alternativeSuppliers ? 'Des fournisseurs alternatifs sont déclarés identifiés — disponibilité, capacité, délais d\'activation et conditions contractuelles à confirmer' : 'Évaluer le besoin de fournisseurs alternatifs selon les dépendances externes du BIA'}
─────────────────────────────────────────────────────────────────────
Stock de sécurité | ${cfg.safetyStock ? 'Déclaré' : 'Non documenté'} | ${cfg.safetyStock ? `Durée déclarée : ${cfg.safetyStockDuration || 'À documenter'} — niveau réel, conditions de maintien et couverture à valider` : 'Évaluer la faisabilité d\'un stock tampon pour les intrants critiques'}

FOURNISSEURS CRITIQUES — MATRICE DE CONTINUITÉ
FOURNISSEUR | SERVICE | TOLÉRANCE | MESURE PRÉVENTIVE | SOLUTION DE RELÈVE | DÉLAI ACTIVATION | ÉTAT
─────────────────────────────────────────────────────────────────────
${criticalSuppliersFR}`,
      },
      {
        id: 'm5_s5',
        title: 'Stratégies par conséquence — Énergie et couverture d\'assurance',
        content: `CONSÉQUENCE : Perte de ressources essentielles — Énergie

STRATÉGIE | DISPONIBILITÉ | DÉTAILS
─────────────────────────────────────────────────────────────────────
Génératrice de secours | ${cfg.generator ? 'Déclarée disponible' : 'Non documentée'} | ${cfg.generator ? 'Présence d\'une génératrice déclarée — autonomie, capacité, charges alimentées, entretien et essais à documenter' : 'Évaluer le besoin d\'une alimentation de relève selon les ressources minimales identifiées au BIA'}
─────────────────────────────────────────────────────────────────────
Alimentation sans coupure (UPS) | ${cfg.ups ? 'Déclarée disponible' : 'Non documentée'} | ${cfg.ups ? 'Présence d\'UPS déclarée — équipements protégés, capacité et autonomie à documenter' : 'Évaluer le besoin d\'UPS selon les systèmes et équipements critiques'}
─────────────────────────────────────────────────────────────────────
Contact utilitaires d'urgence | Hydro-Québec — pannes : 1 800 790-2424 | Utiliser selon les besoins associés aux activités dépendantes de l'alimentation électrique

COUVERTURE D'ASSURANCE
COUVERTURE | DISPONIBILITÉ | DERNIÈRE RÉVISION
─────────────────────────────────────────────────────────────────────
Assurance interruption des affaires | ${cfg.insuranceBI ? 'Déclarée en place' : 'Non documentée'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA') : 'À vérifier'}
─────────────────────────────────────────────────────────────────────
Assurance dommages matériels | ${cfg.insuranceProperty ? 'Déclarée en place' : 'Non documentée'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA') : 'À vérifier'}
─────────────────────────────────────────────────────────────────────
Assurance cyber | ${cfg.insuranceCyber ? 'Déclarée en place' : 'Non documentée'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA') : 'À vérifier'}

⚠️ La présence d'une couverture d'assurance déclarée ne constitue pas une validation de l'étendue réelle de la protection. Les garanties, exclusions, franchises, limites et conditions applicables doivent être vérifiées auprès de l'assureur ou du courtier. L'assurance complète le PCA, mais ne remplace pas la capacité opérationnelle de maintenir ou reprendre les activités essentielles.

PROCÉDURES DE CONTINUITÉ APPLICABLES
Les procédures suivantes sont intégrées au présent PCA en fonction des scénarios de risque identifiés et peuvent être utilisées lorsque leurs conditions de déclenchement sont rencontrées :
${procedureListFR || '• Aucune procédure activée — Compléter l\'appréciation du risque (Section 3)'}

APPROBATION DES STRATÉGIES
FONCTION | NOM / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
Responsable du PCA | ${coordName || ''} |
Responsable des opérations | |
Direction générale | |`,
      },
    ],
  };

  const m5en = {
    moduleNumber: 5,
    title: 'CONTINUITY STRATEGIES',
    language: 'en',
    sections: [
      {
        id: 'm5_s1',
        title: 'Strategy design principles',
        content: `Continuity strategies are solutions prepared in advance to maintain essential activities when normal resources become unavailable. They flow directly from the BIA results (Chapter 4) and the vulnerabilities identified through the risk assessment (Chapter 3).

A STRATEGY IS NOT A RESPONSE PLAN
A strategy is a prior decision describing how the organization intends to maintain or restore a minimum level of capability. Operational implementation details are addressed through continuity procedures (Chapter 7) and specialized response sheets.

STRATEGY TYPES BY CONSEQUENCE
Continuity strategies are organized according to the five structural consequences considered in the risk assessment:
1. Loss of access to premises → Relocation, telework, alternate site
2. Loss of IT systems and communications → IT recovery, manual procedures, alternate access
3. Absenteeism / loss of key personnel → Cross-training, temporary staff, process documentation
4. Critical supplier disruption → Alternate suppliers, safety stock, substitution
5. Loss of essential resources → Backup generator, UPS, emergency equipment`,
      },

      {
        id: 'm5_s2',
        title: 'Strategies by consequence — Loss of access to premises',
        content: `CONSEQUENCE: Loss of access to the building or primary site

STRATEGY | AVAILABILITY | DETAILS | ACTIVITIES COVERED
─────────────────────────────────────────────────────────────────────
Telework | ${cfg.teleworkPossible || 'Not documented'} | ${cfg.teleworkPossible === 'Oui' ? 'Telework capability declared available — scope and actual capacity to be validated against BIA activities' : cfg.teleworkPossible === 'Partiel' ? 'Partial telework capability declared — covered activities and available capacity to be specified' : 'Applicability to be assessed according to activity and resource requirements'} | Activities whose requirements allow remote operation
─────────────────────────────────────────────────────────────────────
Alternate site | ${cfg.alternativeSite ? 'Declared' : 'Not documented'} | ${cfg.alternativeSiteAddress || 'To be defined'} | Activities requiring a physical work location
─────────────────────────────────────────────────────────────────────
Premises sharing agreement | ${cfg.sharingAgreement ? 'Declared' : 'Not documented'} | ${cfg.sharingAgreement ? 'Agreement declared — operational arrangements and actual capacity to be validated' : 'No premises sharing arrangement documented'} | According to agreement
─────────────────────────────────────────────────────────────────────
Emergency procedures | ERP linkage | ${cfg.linkedPmuId ? 'ERP linked — refer to applicable document' : 'No ERP linked'} | Life safety and emergency response`,
      },

      {
        id: 'm5_s3',
        title: 'Strategies by consequence — Loss of IT systems',
        content: `CONSEQUENCE: Loss of information technology and communication systems

STRATEGY | AVAILABILITY | DETAILS
─────────────────────────────────────────────────────────────────────
IT recovery / redundancy | ${cfg.itRedundancy ? 'Declared available' : 'Not documented'} | ${cfg.itRedundancy ? 'Recovery or redundancy capability declared — actual coverage, capacity and restoration times to be validated against critical systems' : 'No IT recovery or redundancy capability documented'}
─────────────────────────────────────────────────────────────────────
Off-site backups | ${cfg.offSiteBackup ? 'Declared available' : 'Not documented'} | ${cfg.offSiteBackup ? `Declared frequency: ${cfg.backupFrequency || 'To be documented'} — restoration capability and compatibility with RPOs to be validated` : 'No off-site backup capability documented — requirements should be assessed against system and activity RPOs'}
─────────────────────────────────────────────────────────────────────
Manual procedures | ${cfg.processDocumented ? 'Documentation declared available' : 'Not documented'} | ${cfg.processDocumented ? 'Processes are declared documented — identify which activities can actually operate manually or in degraded mode' : 'Identify activities requiring manual procedures or degraded operating arrangements'}
─────────────────────────────────────────────────────────────────────
Mobile / alternate access | To be determined | Alternate communication and access methods should be documented according to BIA requirements | Activities requiring remote access or degraded-mode communications

CRITICAL IT SYSTEMS — INVENTORY AND RECOVERY OBJECTIVES
SYSTEM / APPLICATION | RTO | RPO | DEGRADED MODE | RECOVERY SOLUTION
─────────────────────────────────────────────────────────────────────
${itSystemsEN}`,
      },

      {
        id: 'm5_s4',
        title: 'Strategies by consequence — Personnel and suppliers',
        content: `CONSEQUENCE: Abnormal absenteeism or loss of key personnel

STRATEGY | AVAILABILITY | DETAILS
─────────────────────────────────────────────────────────────────────
Cross-training | ${cfg.crossTraining ? 'Declared in place' : 'Not documented'} | ${cfg.crossTraining ? 'Cross-training capability declared — coverage of critical activities and competency levels to be validated' : 'Assess succession and cross-training requirements for critical activities'}
─────────────────────────────────────────────────────────────────────
Process documentation | ${cfg.processDocumented ? 'Declared available' : 'Not documented'} | ${cfg.processDocumented ? 'Process documentation is declared available — coverage of critical activities should be validated' : 'Document critical processes concentrated among key personnel'}
─────────────────────────────────────────────────────────────────────
Temporary staff | ${cfg.tempStaffAccess ? 'Access declared available' : 'Not documented'} | ${cfg.tempStaffAccess ? 'Access to temporary personnel is declared — arrangements, lead times and available competencies to be confirmed' : 'Assess whether temporary personnel could support specific critical activities'}
─────────────────────────────────────────────────────────────────────
Absenteeism activation threshold | ${cfg.absenteeismThreshold ? (cfg.absenteeismThreshold === 'cle' ? 'Loss of one key employee' : `≥ ${cfg.absenteeismThreshold}% of personnel absent`) : 'Not defined'} | ${cfg.absenteeismThreshold ? 'Triggers procedure PC013 — Pandemic / mass absenteeism' : 'To be defined in the BCP configurator (Section 5)'}

CONSEQUENCE: Critical supplier or partner disruption

STRATEGY | AVAILABILITY | DETAILS
─────────────────────────────────────────────────────────────────────
Alternate suppliers | ${cfg.alternativeSuppliers ? 'Declared identified' : 'Not documented'} | ${cfg.alternativeSuppliers ? 'Alternate suppliers are declared identified — availability, capacity, activation lead times and contractual conditions to be confirmed' : 'Assess the need for alternate suppliers based on external BIA dependencies'}
─────────────────────────────────────────────────────────────────────
Safety stock | ${cfg.safetyStock ? 'Declared' : 'Not documented'} | ${cfg.safetyStock ? `Declared duration: ${cfg.safetyStockDuration || 'To be documented'} — minimum levels and actual coverage to be validated` : 'Assess the feasibility and relevance of buffer inventory for critical inputs'}

CRITICAL SUPPLIERS — CONTINUITY MATRIX
SUPPLIER | SERVICE | TOLERANCE | PREVENTIVE MEASURE | BACKUP SOLUTION | ACTIVATION TIME | STATUS
─────────────────────────────────────────────────────────────────────
${criticalSuppliersEN}`,
      },

      {
        id: 'm5_s5',
        title: 'Strategies by consequence — Energy and insurance coverage',
        content: `CONSEQUENCE: Loss of essential resources — Energy

STRATEGY | AVAILABILITY | DETAILS
─────────────────────────────────────────────────────────────────────
Backup generator | ${cfg.generator ? 'Declared available' : 'Not documented'} | ${cfg.generator ? 'A backup generator is declared — autonomy, capacity, supported loads, maintenance and testing should be documented' : 'Assess backup power requirements against the minimum resources identified in the BIA'}
─────────────────────────────────────────────────────────────────────
Uninterruptible power supply (UPS) | ${cfg.ups ? 'Declared available' : 'Not documented'} | ${cfg.ups ? 'UPS capability is declared — protected equipment, capacity and autonomy should be documented' : 'Assess UPS requirements for critical systems and equipment'}
─────────────────────────────────────────────────────────────────────
Emergency utility contact | Hydro-Québec outages: 1 800 790-2424 | Use as applicable to activities dependent on electrical power

INSURANCE COVERAGE
COVERAGE | AVAILABILITY | LAST REVIEW
─────────────────────────────────────────────────────────────────────
Business interruption insurance | ${cfg.insuranceBI ? 'Declared in place' : 'Not documented'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('en-CA') : 'To be verified'}
─────────────────────────────────────────────────────────────────────
Property damage insurance | ${cfg.insuranceProperty ? 'Declared in place' : 'Not documented'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('en-CA') : 'To be verified'}
─────────────────────────────────────────────────────────────────────
Cyber insurance | ${cfg.insuranceCyber ? 'Declared in place' : 'Not documented'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('en-CA') : 'To be verified'}

⚠️ The presence of declared insurance coverage does not constitute validation of the actual scope of protection. Applicable coverage, exclusions, deductibles, limits and conditions should be verified with the insurer or broker. Insurance complements the BCP but does not replace the organization's operational capability to maintain or restore essential activities.

APPLICABLE CONTINUITY PROCEDURES
The following procedures are included in this BCP based on the identified risk scenarios and may be used when their activation conditions are met:
${procedureListEN || '• No applicable procedure documented — Complete the risk assessment (Section 3)'}

STRATEGY APPROVAL
FUNCTION | NAME / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
BCP Coordinator | ${coordName || ''} |
Operations Manager | |
Senior Management | |`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 6 — COMMUNICATION DE CRISE
  // ══════════════════════════════════════════════
  const authoritiesFR = authoritiesToNotify.length > 0
  ? authoritiesToNotify.map((a: string) => `• ${a}`).join('\n')
  : '• À documenter selon les scénarios applicables';

  const mobilisationMatrix = `NIVEAU | COORDINATION | CELLULE | EMPLOYÉS | PARTIES EXTERNES
─────────────────────────────────────────────────────────────────────
1 - Local | Selon les mécanismes opérationnels habituels | Fonctions spécialisées au besoin | Personnes directement concernées | Selon les besoins de l'incident
─────────────────────────────────────────────────────────────────────
2 - Majeur | Coordonnateur PCA ou fonction désignée mobilisée selon les critères établis | Fonctions requises selon les impacts et dépendances touchés | Employés et gestionnaires concernés | Clients, fournisseurs, assureurs ou autorités selon les impacts et obligations
─────────────────────────────────────────────────────────────────────
3 - Crise | Coordination organisationnelle élargie selon la structure et les délégations établies | Fonctions requises et direction selon la portée de l'incident | Communications adaptées aux groupes concernés | Parties externes avisées selon les besoins, obligations et décisions de communication`;

  const m6fr = {
    moduleNumber: 6,
    title: 'COMMUNICATION DE CRISE',
    language: 'fr',
    sections: [
      {
        id: 'm6_s1',
        title: 'Principes de communication en continuité',
        content: `La communication en situation d'interruption doit être rapide, précise, cohérente et adaptée au public visé. Une mauvaise gestion des communications peut aggraver les impacts opérationnels, réputationnels et relationnels d'un incident, même lorsque la réponse opérationnelle est efficace.

PRINCIPES DIRECTEURS
- Communiquer sur les faits confirmés, non sur les hypothèses
- Adapter le message au public : ce que l'interlocuteur a besoin de savoir pour agir ou décider
- Maintenir la cohérence entre les messages internes et externes
- Respecter les obligations de confidentialité et les restrictions légales
- Documenter chaque communication : contenu, canal, heure, destinataires et approbation
- Prévoir un canal alternatif si le canal principal est affecté par l'incident

RESPONSABILITÉ DES COMMUNICATIONS
- Porte-parole désigné : ${cfg.spokesperson || 'À désigner'}
- Responsable suivi médias sociaux : ${cfg.socialMediaMonitor || 'À désigner'}
- Canal de communication interne principal : ${cfg.internalChannel || 'À définir'}
- Système d'alerte de masse : ${cfg.massAlertSystem === true ? 'Déclaré disponible' : cfg.massAlertSystem === false ? 'Déclaré non disponible' : 'À documenter'}
- Canal de communication externe : ${cfg.externalChannel || 'À définir'}`,
      },
      {
        id: 'm6_s2',
        title: 'Processus d\'alerte et de mobilisation',
        content: `ÉTAPE 1 — DÉTECTION ET ÉVALUATION INITIALE
Toute personne ayant connaissance d'un incident potentiellement significatif doit utiliser le mécanisme de signalement ou d'escalade établi par l'organisation. Une première évaluation permet de déterminer les activités, ressources ou objectifs de continuité susceptibles d'être touchés et les fonctions devant être avisées.

ÉTAPE 2 — NOTIFICATION DE LA FONCTION DE COORDINATION
Lorsque l'incident menace les objectifs de continuité ou nécessite une coordination au-delà des mécanismes opérationnels habituels, le coordonnateur PCA ou son substitut est avisé selon le processus établi.
- Coordonnateur PCA : ${coordName || 'À désigner'} — Tél. : ${coordPhone}
- Si injoignable, substitut : ${substName || 'À désigner'} — Tél. : ${substPhone}

ÉTAPE 3 — DÉCISION D'ACTIVATION
L'autorité désignée évalue le niveau de mobilisation requis et décide de l'activation partielle, élargie ou complète du PCA selon les critères établis et les délégations applicables. Le journal de bord est ouvert lorsque requis.

ÉTAPE 4 — MOBILISATION DE LA CELLULE
Les fonctions requises sont mobilisées selon la nature, la portée et l'évolution de l'incident.
- Lieu de coordination : ${cfg.coordinationLocation || 'À définir'}
- Pont téléphonique : ${cfg.emergencyBridge || 'À définir'}
- Mode virtuel de relève : À documenter — prévoir un moyen de coordination alternatif si le site principal ou les systèmes habituels sont indisponibles

ÉTAPE 5 — PREMIÈRE SITUATION COMMUNE
La cellule confirme les faits, activités touchées, RTO menacés, ressources disponibles, stratégies à activer et décisions immédiates.

ÉTAPE 6 — COMMUNICATION INTERNE
Les employés et gestionnaires concernés reçoivent les consignes et les modalités de fonctionnement temporaire via ${cfg.internalChannel || 'le canal interne désigné'}.

ÉTAPE 7 — COMMUNICATION EXTERNE
Les clients prioritaires, fournisseurs, autorités, assureurs ou médias sont avisés selon les besoins et les obligations.

ÉTAPE 8 — CYCLE DE MISE À JOUR
Les communications sont révisées à partir des rapports de situation et diffusées à la fréquence approuvée jusqu'à la stabilisation.

MATRICE DE MOBILISATION SELON LE NIVEAU
${mobilisationMatrix}`,
      },
      {
        id: 'm6_s3',
        title: 'Répertoire de contacts opérationnels',
        content: `CONTACTS INTERNES — CELLULE DE GESTION D'INCIDENT
─────────────────────────────────────────────────────────────────────
Coordonnateur PCA : ${coordName || 'À compléter'}
  Tél. : ${coordPhone} | Courriel : ${coordEmail}

Substitut : ${substName || 'À compléter'}
  Tél. : ${substPhone} | Courriel : ${substEmail}

${cellMembers.length > 0
  ? cellMembers.map((m: any) => `${m.role || 'Membre'} : ${m.firstName || ''} ${m.lastName || ''}\n  Tél. : ${m.phone || 'À compléter'} | Courriel : ${m.email || 'À compléter'}`).join('\n\n')
  : 'Membres de la cellule : À documenter dans le configurateur PCA (Section 2)'}

Porte-parole : ${cfg.spokesperson || 'À désigner'}
Responsable médias sociaux : ${cfg.socialMediaMonitor || 'À désigner'}

CONTACTS EXTERNES — SERVICES D'URGENCE
─────────────────────────────────────────────────────────────────────
- Services d'urgence (Police / Pompiers / Ambulance) : 9-1-1
- Police locale (non-urgence) : À compléter
- Pompiers (non-urgence) : À compléter

CONTACTS EXTERNES — SERVICES PUBLICS
─────────────────────────────────────────────────────────────────────
- Hydro-Québec (pannes) : 1 800 790-2424
- Énergir / Gaz Métro : 1 800 361-8003
- Service des eaux municipal : À compléter
- Fournisseur télécom principal : À compléter

CONTACTS EXTERNES — ASSURANCES
─────────────────────────────────────────────────────────────────────
- Courtier d'assurance : À compléter
- Ligne sinistres 24h/7j : À compléter
- Numéro de police d'assurance : À compléter
- Dernière révision couverture : ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA') : 'À compléter'}

AUTORITÉS RÉGLEMENTAIRES À AVISER SELON LE SCÉNARIO
─────────────────────────────────────────────────────────────────────
- CNESST (accidents de travail) : 1 844 838-0808
- Commission d'accès à l'information (incidents de données) : 1 888 528-7741
${authoritiesFR}`,
      },
      {
        id: 'm6_s4',
        title: 'Clients prioritaires et communication externe',
        content: `CLIENTS PRIORITAIRES À AVISER
${cfg.priorityClients || 'À documenter — Identifier les clients dont la notification prioritaire est requise en cas d\'incident, notamment ceux avec des SLA contractuels, des obligations de délai ou des commandes urgentes en cours.'}

LIGNE DE COMMUNICATION APPROUVÉE
${cfg.mediaContact || 'À documenter — Définir avec la direction le message approuvé pour les communications externes en cas d\'incident. Ce message doit être factuel, sobre et préserver la confidentialité des informations opérationnelles sensibles.'}

GESTION DES MÉDIAS SOCIAUX ET INFORMATION ERRONÉE
Une perturbation visible peut générer rapidement des commentaires, images, hypothèses ou informations inexactes. La surveillance ne vise pas à répondre à chaque publication, mais à détecter les informations susceptibles d'affecter la sécurité, la réputation, les clients ou la gestion de l'incident.

Responsable : ${cfg.socialMediaMonitor || 'À désigner'}
Fréquence de surveillance : Selon l'évolution de l'incident, l'exposition médiatique et les besoins établis par la cellule
Canal de réponse officiel : ${cfg.externalChannel || 'À définir'}`,
      },
      {
        id: 'm6_s5',
        title: 'Schéma d\'alerte et liste de vérification — Première communication',
        content: `LISTE DE VÉRIFICATION — PREMIÈRE COMMUNICATION
☐ Les faits essentiels ont été confirmés par une source responsable
☐ Le niveau d'incident et l'état d'activation du PCA sont connus
☐ Les personnes en danger ont reçu les consignes prioritaires
☐ Les activités ou services touchés sont identifiés
☐ Le message a été approuvé par l'autorité requise
☐ Les obligations de notification ont été vérifiées
☐ Le canal principal fonctionne et un canal alternatif est disponible
☐ La prochaine mise à jour a été annoncée
☐ La version diffusée, l'heure et les destinataires ont été consignés au journal de bord

CADENCE DES COMMUNICATIONS
- La fréquence des mises à jour est établie selon l'évolution de l'incident, les besoins des destinataires et les obligations applicables
- Les groupes prioritaires reçoivent une mise à jour lorsqu'une information nouvelle modifie leurs actions, leurs décisions ou leur compréhension de la situation
- La cellule de gestion d'incident détermine la cadence de communication et peut l'ajuster au cours de l'événement
- Lorsqu'une prochaine mise à jour est annoncée, son échéance doit être respectée ou un avis doit être transmis si l'information n'est pas encore disponible`,
      },
    ],
  };

  const m6en = {
    moduleNumber: 6,
    title: 'CRISIS COMMUNICATION',
    language: 'en',
    sections: [
      {
        id: 'm6_s1',
        title: 'Continuity communication principles',
        content: `Communication during a disruption should be timely, accurate, consistent and appropriate to the intended audience. Poor communication can increase operational, reputational and stakeholder impacts even when the operational response itself is effective.

GUIDING PRINCIPLES
- Communicate confirmed facts rather than assumptions
- Tailor messages to what recipients need to know in order to act or make decisions
- Maintain consistency between internal and external communications
- Respect confidentiality obligations and applicable legal restrictions
- Document significant communications, including content, channel, time, recipients and approval
- Provide an alternate communication method if the primary channel is affected by the incident

COMMUNICATION RESPONSIBILITIES
- Designated spokesperson: ${cfg.spokesperson || 'To be designated'}
- Social media monitoring lead: ${cfg.socialMediaMonitor || 'To be designated'}
- Primary internal communication channel: ${cfg.internalChannel || 'To be defined'}
- Mass alert system: ${cfg.massAlertSystem === true ? 'Declared available' : cfg.massAlertSystem === false ? 'Declared unavailable' : 'To be documented'}
- External communication channel: ${cfg.externalChannel || 'To be defined'}`,
      },

      {
        id: 'm6_s2',
        title: 'Alert and mobilization process',
        content: `STEP 1 — DETECTION AND INITIAL ASSESSMENT
Any person becoming aware of a potentially significant incident should use the reporting or escalation mechanism established by the organization. An initial assessment identifies the activities, resources or continuity objectives that may be affected and the functions that should be notified.

STEP 2 — NOTIFICATION OF THE COORDINATION FUNCTION
When an incident threatens continuity objectives or requires coordination beyond normal operating arrangements, the BCP Coordinator or alternate is notified according to the established process.
- BCP Coordinator: ${coordName || 'To be designated'} — Phone: ${coordPhone}
- If unavailable, alternate: ${substName || 'To be designated'} — Phone: ${substPhone}

STEP 3 — ACTIVATION DECISION
The designated authority assesses the required level of mobilization and determines whether the BCP should be partially, broadly or fully activated according to established criteria and applicable delegations. The incident log is opened where required.

STEP 4 — INCIDENT MANAGEMENT TEAM MOBILIZATION
Required functions are mobilized according to the nature, scope and evolution of the incident.
- Coordination location: ${cfg.coordinationLocation || 'To be defined'}
- Conference bridge: ${cfg.emergencyBridge || 'To be defined'}
- Virtual coordination fallback: To be documented — provide an alternate coordination method where the primary site or normal systems are unavailable

STEP 5 — INITIAL COMMON OPERATING PICTURE
The incident management team confirms the known facts, affected activities, threatened continuity objectives, available resources, strategies that may be required and immediate decisions.

STEP 6 — INTERNAL COMMUNICATION
Affected employees and managers receive relevant instructions and temporary operating arrangements through ${cfg.internalChannel || 'the designated internal communication channel'}.

STEP 7 — EXTERNAL COMMUNICATION
Priority clients, suppliers, authorities, insurers, media or other external parties are notified according to operational needs, legal or contractual obligations and approved communication decisions.

STEP 8 — UPDATE CYCLE
Communications are updated based on the evolving situation and situation reports. The incident management team establishes and adjusts the communication cadence according to stakeholder needs and incident conditions.

MOBILIZATION MATRIX BY LEVEL
LEVEL | COORDINATION | TEAM | EMPLOYEES | EXTERNAL PARTIES
─────────────────────────────────────────────────────────────────────
1 - Local | According to normal operational arrangements | Specialized functions as required | Directly affected persons | According to incident needs
─────────────────────────────────────────────────────────────────────
2 - Major | BCP Coordinator or designated function mobilized according to established criteria | Required functions based on affected impacts and dependencies | Affected employees and managers | Clients, suppliers, insurers or authorities according to impacts and obligations
─────────────────────────────────────────────────────────────────────
3 - Crisis | Expanded organizational coordination according to the established structure and delegations | Required functions and management according to incident scope | Communications tailored to affected groups | External parties notified according to needs, obligations and communication decisions`,
      },

      {
        id: 'm6_s3',
        title: 'Operational contact directory',
        content: `INTERNAL CONTACTS — INCIDENT MANAGEMENT TEAM
─────────────────────────────────────────────────────────────────────
BCP Coordinator: ${coordName || 'To be completed'}
  Phone: ${coordPhone} | Email: ${coordEmail}

Alternate: ${substName || 'To be completed'}
  Phone: ${substPhone} | Email: ${substEmail}

${cellMembers.length > 0
  ? cellMembers.map((m: any) =>
      `${m.role || 'Member'}: ${m.firstName || ''} ${m.lastName || ''}\n  Phone: ${m.phone || 'To be completed'} | Email: ${m.email || 'To be completed'}`
    ).join('\n\n')
  : 'Incident management team members: To be documented in BCP configurator (Section 2)'}

Spokesperson: ${cfg.spokesperson || 'To be designated'}
Social media monitoring lead: ${cfg.socialMediaMonitor || 'To be designated'}

EXTERNAL CONTACTS — EMERGENCY SERVICES
─────────────────────────────────────────────────────────────────────
- Emergency services (Police / Fire / Ambulance): 9-1-1
- Local police non-emergency: To be completed
- Fire department non-emergency: To be completed

EXTERNAL CONTACTS — EMERGENCY SERVICES
─────────────────────────────────────────────────────────────────────
- Emergency services (Police / Fire / Ambulance): 9-1-1
- Hydro-Québec (outages): 1 800 790-2424
- CNESST (workplace accidents): 1 844 838-0808
- Commission d'accès à l'information (data incidents): 1 888 528-7741`,
      },
      {
        id: 'm6_s4',
        title: 'Priority clients and external communication',
        content: `PRIORITY CLIENTS TO NOTIFY
${cfg.priorityClients || 'To be documented — Identify clients requiring priority notification in case of incident.'}

APPROVED EXTERNAL COMMUNICATION
${cfg.mediaContact || 'To be documented — Establish with management the messaging to be used for external communications during an incident. Communications should remain factual, concise and protect confidential or operationally sensitive information.'}

SOCIAL MEDIA AND MISINFORMATION MANAGEMENT
A visible disruption may quickly generate comments, images, assumptions or inaccurate information. Monitoring is not intended to respond to every publication but to identify information that may affect safety, reputation, clients or incident management.

Lead: ${cfg.socialMediaMonitor || 'To be designated'}
Monitoring frequency: According to incident evolution, media exposure and the needs established by the incident management team
Official response channel: ${cfg.externalChannel || 'To be defined'}`,
      },

      {
        id: 'm6_s5',
        title: 'Alert flow and first communication checklist',
        content: `FIRST COMMUNICATION CHECKLIST
☐ Essential facts have been confirmed by a responsible source
☐ The incident level and BCP activation status are understood
☐ People at risk have received priority instructions
☐ Affected activities or services have been identified
☐ The message has been approved by the required authority
☐ Notification obligations have been reviewed
☐ The primary channel is operational and an alternate method is available where required
☐ The next update has been announced when appropriate
☐ The distributed version, time and recipients have been recorded in the incident log

COMMUNICATION CADENCE
- Update frequency is established according to incident evolution, recipient needs and applicable obligations
- Priority groups receive an update when new information changes their required actions, decisions or understanding of the situation
- The incident management team establishes the communication cadence and may adjust it during the event
- When a next update time is announced, that commitment should be met or an advisory should be issued if the expected information is not yet available`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 7 — ACTIVATION ET PROCÉDURES DE REPRISE
  // ══════════════════════════════════════════════
  const resumptionSeq = sortedServices.length > 0
  ? sortedServices
      .map(
        (s: any, i: number) =>
          `${recoveryPriorityLabelFR(s.recoveryPriority)} | ${s.name || `Activité ${i + 1}`} | ${s.rto || 'À déterminer'} | ${s.minServiceLevel || 'À définir'} | ${s.owner || 'À désigner'}`
      )
      .join('\n')
  : 'À déterminer | À définir une fois le BIA complété (chapitre 4) | — | — | —';

  const m7fr = {
    moduleNumber: 7,
    title: 'ACTIVATION ET PROCÉDURES DE REPRISE',
    language: 'fr',
    sections: [
      {
        id: 'm7_s1',
        title: 'Critères d\'activation du PCA',
        content: `L'activation du PCA doit être déclenchée lorsqu'une perturbation menace de dépasser la capacité de gestion courante ou de compromettre les objectifs de continuité définis au BIA.

CRITÈRES D'ACTIVATION
${cfg.activationCriteria || `Le PCA est activé par le coordonnateur PCA ou la direction générale lorsqu'une ou plusieurs des conditions suivantes sont atteintes :
- L'interruption d'une activité critique menace de dépasser son RTO défini au BIA
- Un incident de niveau 2 ou 3 est déclaré selon la grille du chapitre 3
- Une ressource critique (site, système TI, personnel, fournisseur, énergie) est indisponible et aucune solution courante ne peut être appliquée dans les délais
- Les autorités publiques émettent une directive affectant la capacité opérationnelle de l'organisation
- L'organisation reçoit un avis de sinistre, cyberattaque confirmée ou pandémie officielle`}

AUTORITÉ D'ACTIVATION
- Décision principale : ${coordName || 'Coordonnateur PCA'} — selon critères et délégation
- Consultation requise : Direction générale pour activation de niveau 3
- En l'absence du coordonnateur : ${substName || 'Substitut désigné'} assume le rôle

INDICATEURS D'ACTIVATION PAR TYPE D'INCIDENT
TYPE D'INCIDENT | INDICATEUR D'ESCALADE | INDICATEUR D'ACTIVATION MAJEURE
─────────────────────────────────────────────────────────────────────
Perte de site / bâtiment | L'accès au site compromet le maintien ou la reprise d'une activité critique | Le site demeure indisponible au-delà des objectifs de continuité applicables ou aucune solution de rechange adéquate n'est disponible
─────────────────────────────────────────────────────────────────────
Perte des systèmes TI | Un système critique devient indisponible et menace l'atteinte de son RTO ou de son RPO | Plusieurs systèmes critiques sont touchés, les données sont compromises ou les objectifs de reprise ne peuvent plus être respectés
─────────────────────────────────────────────────────────────────────
Absentéisme | Les effectifs disponibles deviennent insuffisants pour maintenir une activité critique ou un rôle clé | Les ressources humaines disponibles ne permettent plus d'atteindre le niveau minimal de service défini au BIA
─────────────────────────────────────────────────────────────────────
Panne électrique | L'alimentation électrique compromet une ressource minimale requise par une activité critique | Les solutions de relève disponibles ne permettent plus de maintenir ou reprendre les activités dans les objectifs prévus
─────────────────────────────────────────────────────────────────────
Fournisseur critique | Un fournisseur ne peut plus respecter les besoins minimaux d'une activité critique | Aucune solution de relève ou mesure de contournement ne permet de respecter les objectifs de continuité`,
      },
      {
        id: 'm7_s2',
        title: 'Lieux et moyens de coordination',
        content: `Les lieux et moyens de coordination doivent être confirmés dès l'activation afin que la cellule puisse fonctionner même lorsque le site principal ou les systèmes habituels sont indisponibles.

BUREAU DE COORDINATION PRINCIPAL
${ctx.buildingAddress || 'À documenter'}

BUREAU DE COORDINATION ALTERNATIF
${cfg.coordinationLocation || 'À définir — Prévoir un lieu alternatif accessible même en cas d\'indisponibilité du site principal'}

PONT TÉLÉPHONIQUE D'URGENCE
${cfg.emergencyBridge || 'À définir — Numéro de conférence préconfiguré et accessible sans dépendre des systèmes habituels'}

MODE VIRTUEL DE RELÈVE
À documenter — Prévoir, lorsque requis, un moyen de coordination accessible même lorsque le site principal ou les systèmes internes habituels sont indisponibles

LIEN AVEC LE PMU / PSI
${cfg.linkedPmuId
  ? 'Ce PCA est lié à un Plan de mesures d\'urgence (PMU) existant. Les mesures d\'urgence immédiates applicables sont documentées dans ce plan complémentaire.'
  : 'Aucun PMU lié n\'est documenté dans la configuration. Les mesures d\'urgence immédiates applicables doivent être documentées dans le plan ou les procédures complémentaires appropriés.'}`,
      },
      {
        id: 'm7_s3',
        title: 'Liste de vérification d\'activation',
        content: `La liste de vérification doit être complétée lors de chaque activation du PCA. Conserver une copie papier accessible en tout temps.

DATE D'ACTIVATION : _______________  HEURE : _______________
TYPE D'INCIDENT : _______________________________________________
NIVEAU D'INCIDENT : ☐ Niveau 1  ☐ Niveau 2  ☐ Niveau 3
ACTIVÉ PAR : ___________________________________________________

PHASE 1 — ÉVALUATION IMMÉDIATE
☐ Incident détecté et évalué — faits confirmés par une source responsable
☐ Niveau d'incident déterminé selon la grille du chapitre 3
☐ Coordonnateur PCA contacté — heure : _______________
☐ Sécurité des personnes vérifiée
☐ Autorités d'urgence contactées si requis (9-1-1)

PHASE 2 — MOBILISATION
☐ Cellule de gestion d'incident convoquée selon le niveau
☐ Lieu de coordination établi : ${cfg.coordinationLocation || '_______________'}
☐ Pont téléphonique activé : ${cfg.emergencyBridge || '_______________'}
☐ Journal de bord d'incident ouvert
☐ Coordonnateur PCA : ${coordName || '_______________'} — Confirmé présent / joint
☐ Substitut : ${substName || '_______________'} — Informé / en attente
${cellMembers.slice(0, 5).map((m: any) => `☐ ${m.firstName || ''} ${m.lastName || ''} (${m.role || 'Membre'}) — Tél. : ${m.phone || 'À compléter'}`).join('\n')}

PHASE 3 — ACTIVATION DES STRATÉGIES
☐ Situation commune établie avec la cellule — activités touchées et RTO menacés identifiés
☐ Stratégies de continuité activées selon le type d'incident
${criticalServices.slice(0, 5).map((s: any, i: number) => `☐ ${s.name || `Service ${i + 1}`} — RTO : ${s.rto || 'N/D'} — Statut : _______________`).join('\n')}
☐ Site alternatif activé si requis : ${cfg.alternativeSiteAddress || 'N/A'}
☐ Télétravail activé si applicable : ${cfg.teleworkPossible || 'N/A'}
☐ Fournisseurs alternatifs contactés si requis

PHASE 4 — COMMUNICATION
☐ Communication interne envoyée via ${cfg.internalChannel || 'canal désigné'}
☐ Clients prioritaires avisés selon la liste du chapitre 6
☐ Autorités réglementaires avisées si applicable
☐ Communication externe approuvée par ${cfg.spokesperson || 'porte-parole désigné'}
☐ Assureur avisé si sinistre déclaré

PHASE 5 — SUIVI ET DOCUMENTATION
☐ Journal de bord mis à jour en continu
☐ Rapports de situation (SITREP) diffusés selon la fréquence établie par la cellule en fonction de l'évolution de l'incident
☐ Coûts et dépenses extraordinaires documentés
☐ Prochaine réunion de cellule planifiée

PHASE 6 — RETOUR À LA NORMALE
☐ Critères de stabilisation atteints — activités prioritaires revenues à une capacité acceptable
☐ Données et transactions du mode dégradé réconciliées
☐ Mesures temporaires retirées de façon contrôlée
☐ Communication de rétablissement approuvée et diffusée
☐ Heure de désactivation / clôture consignée : _______________
☐ Rapport post-incident initié`,
      },
      {
        id: 'm7_s4',
        title: 'Séquence de reprise des activités',
        content: `La séquence de reprise est établie à partir des priorités du BIA. Elle donne l'ordre dans lequel les activités essentielles doivent être rétablies lorsque les ressources sont limitées.

PRIORITÉ | ACTIVITÉ / SERVICE | RTO | NIVEAU MINIMAL | RESPONSABLE
─────────────────────────────────────────────────────────────────────
${resumptionSeq}

PRINCIPES DE LA SÉQUENCE DE REPRISE
- L’ordre de reprise tient compte de la priorité de reprise définie dans le BIA, puis des objectifs de temps de reprise (RTO). Les contraintes techniques, les dépendances et les prérequis de reprise doivent également être considérés avant l’exécution.
- Le niveau minimal de service doit être atteint avant de passer à la priorité suivante
- La séquence peut être ajustée par le coordonnateur PCA si la situation réelle l'exige
- Les dépendances critiques (TI, énergie, personnel) doivent être rétablies avant les activités qui en dépendent

GESTION DE LA SITUATION ET RAPPORTS DE SITUATION (SITREP)
Pendant une activation prolongée, la cellule doit disposer d'une situation commune et actualisée. Le rapport de situation synthétise les faits, l'état des activités, les décisions prises, les ressources engagées et les prochaines étapes.

CONTENU MINIMAL D'UN SITREP
- Heure d'émission et numéro du rapport
- Description synthétique de l'incident et de son évolution
- Statut des activités critiques (Normal / Dégradé / Suspendu)
- Coûts et dépenses engagés à ce jour
- Décisions et actions complétées depuis le dernier rapport
- Actions en cours et responsables
- Prochaines décisions requises et échéances
- Heure du prochain rapport`,
      },
      {
        id: 'm7_s5',
        title: 'Procédures de continuité par scénario',
        content: `Les procédures spécialisées constituent des fiches opérationnelles distinctes pouvant être activées selon la conséquence observée. Elles complètent les stratégies du chapitre 5 et sont accessibles directement depuis le Module 4 — Procédures du présent PCA.

CODE | PROCÉDURE | DÉCLENCHEUR PRINCIPAL | RESPONSABLE
─────────────────────────────────────────────────────────────────────
PC001 | Activation du Plan de continuité des activités | Critères de la section 7.1 atteints | Coordonnateur PCA
─────────────────────────────────────────────────────────────────────
PC002 | Déclenchement de la cellule de gestion d'incident | Activation niveau 2 ou 3 | Coordonnateur PCA
─────────────────────────────────────────────────────────────────────
PC003 | Journal de bord d'incident | Dès l'activation du PCA | Coordonnateur / Responsable journal
─────────────────────────────────────────────────────────────────────
PC004 | Rapport de situation (SITREP) | Selon la fréquence de rapport établie par la cellule en fonction de l'évolution de l'incident | Coordonnateur PCA
─────────────────────────────────────────────────────────────────────
PC005 | Rapport post-incident et leçons apprises | Après la clôture de l'incident, selon l'échéance établie par l'organisation | Coordonnateur PCA
─────────────────────────────────────────────────────────────────────
PC011 | Sinistre bâtiment — Procédure de continuité | Site inaccessible ou inutilisable | Installations / Opérations
─────────────────────────────────────────────────────────────────────
PC012 | Cyberincident — Procédure de continuité | Application, réseau ou données critiques indisponibles | TI
─────────────────────────────────────────────────────────────────────
PC013 | Pandémie / absentéisme massif | Effectifs sous les minimums du BIA | RH / Opérations
─────────────────────────────────────────────────────────────────────
PC014 | Panne électrique prolongée | Autonomie normale insuffisante ou RTO menacé | Installations
─────────────────────────────────────────────────────────────────────
PC015 | Perte d'un fournisseur critique | Fournisseur incapable de respecter la tolérance | Approvisionnement
─────────────────────────────────────────────────────────────────────
PC016 | Perte d'un employé clé | Compétence unique indisponible | Gestionnaire / RH
─────────────────────────────────────────────────────────────────────
PC021 | Retour aux activités normales | Conditions de stabilisation atteintes | Coordonnateur / Direction
─────────────────────────────────────────────────────────────────────
PC022 | Vérification post-incident des systèmes TI | Avant fermeture d'une reprise technologique | TI
─────────────────────────────────────────────────────────────────────
PC023 | Communication post-incident aux parties prenantes | Après stabilisation ou résolution | Communications

STRUCTURE MINIMALE D'UNE PROCÉDURE CORO
BLOC | CONTENU | SOURCE DE DONNÉES
─────────────────────────────────────────────────────────────────────
Déclencheur | Condition précise justifiant l'utilisation | ARA / BIA / configuration
─────────────────────────────────────────────────────────────────────
Objectif | Résultat à atteindre et délai | BIA / stratégie
─────────────────────────────────────────────────────────────────────
Responsable et substitut | Personnes autorisées à piloter | Gouvernance
─────────────────────────────────────────────────────────────────────
Actions immédiates | Premières actions dans l'ordre | Procédure + configuration
─────────────────────────────────────────────────────────────────────
Ressources requises | Personnel, accès, documents, équipements | BIA / inventaires
─────────────────────────────────────────────────────────────────────
Communication | Publics et messages associés | Chapitre 6
─────────────────────────────────────────────────────────────────────
Escalade | Conditions imposant une décision supérieure | Grille niveaux / matrice autorité
─────────────────────────────────────────────────────────────────────
Retour | Critères de fin et contrôles | Procédure PC021`,
      },
    ],
  };

  const m7en = {
    moduleNumber: 7,
    title: 'ACTIVATION AND RECOVERY PROCEDURES',
    language: 'en',
    sections: [
      {
        id: 'm7_s1',
        title: 'BCP activation criteria',
        content: `The BCP should be activated when a disruption threatens to exceed normal management capacity or compromise the continuity objectives established in the BIA.

ACTIVATION CRITERIA
${cfg.activationCriteria || `The BCP is activated by the BCP Coordinator or senior management when one or more of the following conditions are met:
- A critical activity is at risk of exceeding its recovery objective defined in the BIA
- A Level 2 or 3 incident is declared according to the Chapter 3 assessment framework
- A critical resource such as premises, IT systems, personnel, suppliers or energy becomes unavailable and no adequate workaround can be implemented within the required timeframe
- Public authorities issue a directive affecting the organization's operational capacity`}

ACTIVATION AUTHORITY
- Primary decision: ${coordName || 'BCP Coordinator'} — according to established criteria and delegation
- If unavailable: ${substName || 'Designated alternate'} assumes the role`,
      },
      {
        id: 'm7_s2',
        title: 'Coordination locations and means',
        content: `PRIMARY COORDINATION SITE: ${ctx.buildingAddress || 'To be documented'}
ALTERNATE COORDINATION SITE: ${cfg.coordinationLocation || 'To be defined'}
EMERGENCY CONFERENCE BRIDGE: ${cfg.emergencyBridge || 'To be defined'}

LINK WITH ERP
${cfg.linkedPmuId
  ? 'This BCP is linked to an existing Emergency Response Plan (ERP). Applicable immediate emergency response measures are documented in that complementary plan.'
  : 'No linked ERP is documented in the configuration. Applicable immediate emergency response measures should be documented in the appropriate complementary plan or procedures.'}`,
      },
      {
        id: 'm7_s3',
        title: 'Activation checklist',
        content: `The following checklist should be completed whenever the BCP is activated. A paper copy should remain available if normal systems are inaccessible.

ACTIVATION DATE: _______________  TIME: _______________
INCIDENT TYPE: _______________________________________________
INCIDENT LEVEL: ☐ Level 1  ☐ Level 2  ☐ Level 3
ACTIVATED BY: ___________________________________________________

PHASE 1 — IMMEDIATE ASSESSMENT
☐ Incident detected and assessed — facts confirmed by a responsible source
☐ Incident level determined according to the Chapter 3 assessment framework
☐ BCP Coordinator contacted — time: _______________
☐ Personnel safety verified
☐ Emergency services contacted if required (9-1-1)

PHASE 2 — MOBILIZATION
☐ Incident management team convened according to incident level
☐ Coordination location established: ${cfg.coordinationLocation || '_______________'}
☐ Emergency conference bridge activated: ${cfg.emergencyBridge || '_______________'}
☐ Incident log opened
☐ BCP Coordinator: ${coordName || '_______________'} — Confirmed available / contacted
☐ Alternate: ${substName || '_______________'} — Informed / on standby
${cellMembers.slice(0, 5).map((m: any) => `☐ ${m.firstName || ''} ${m.lastName || ''} (${m.role || 'Member'}) — Phone: ${m.phone || 'To be completed'}`).join('\n')}

PHASE 3 — STRATEGY ACTIVATION
☐ Common operating picture established — affected activities and threatened recovery objectives identified
☐ Continuity strategies activated according to the incident consequences
${criticalServices.slice(0, 5).map((s: any, i: number) => `☐ ${s.name || `Activity ${i + 1}`} — RTO: ${s.rto || 'N/A'} — Status: _______________`).join('\n')}
☐ Alternate site activated if required: ${cfg.alternativeSiteAddress || 'N/A'}
☐ Telework activated if applicable: ${cfg.teleworkPossible || 'N/A'}
☐ Alternate suppliers contacted if required

PHASE 4 — COMMUNICATION
☐ Internal communication issued through ${cfg.internalChannel || 'designated channel'}
☐ Priority clients notified according to Chapter 6
☐ Regulatory authorities notified where applicable
☐ External communication approved by ${cfg.spokesperson || 'designated spokesperson'}
☐ Insurer notified if a covered loss is declared

PHASE 5 — MONITORING AND DOCUMENTATION
☐ Incident log updated continuously
☐ Situation reports (SITREP) distributed according to the reporting frequency established by the incident management team
☐ Extraordinary costs and expenses documented
☐ Next incident management team meeting scheduled

PHASE 6 — RETURN TO NORMAL
☐ Stabilization criteria achieved — priority activities restored to an acceptable operating level
☐ Data and transactions from degraded operations reconciled
☐ Temporary measures withdrawn in a controlled manner
☐ Recovery communication approved and distributed
☐ Deactivation / closure time recorded: _______________
☐ Post-incident report initiated`,
      },
      {
  id: 'm7_s4',
  title: 'Activity recovery sequence',
  content: `The recovery sequence is established from the priorities defined in the BIA. It provides the order in which essential activities should be restored when resources are limited.

PRIORITY | ACTIVITY / SERVICE | RTO | MINIMUM LEVEL | OWNER
─────────────────────────────────────────────────────────────────────
${sortedServices.length > 0
  ? sortedServices
      .map(
        (s: any, i: number) =>
          `${recoveryPriorityLabelEN(s.recoveryPriority)} | ${s.name || `Activity ${i + 1}`} | ${s.rto || 'To be determined'} | ${s.minServiceLevel || 'To be defined'} | ${s.owner || 'To be designated'}`
      )
      .join('\n')
  : 'To be determined | To be defined once BIA is completed (Chapter 4) | — | — | —'}

RECOVERY SEQUENCE PRINCIPLES
- The recovery sequence considers the recovery priority established in the BIA, followed by the recovery time objectives (RTO). Technical constraints, dependencies and recovery prerequisites must also be considered before execution.
- The minimum service level should be achieved before moving to the next priority.
- The sequence may be adjusted by the BCP Coordinator if the actual situation requires it.
- Critical dependencies such as IT, energy and personnel must be restored before the activities that depend on them.`,
},
      {
        id: 'm7_s5',
        title: 'Continuity procedures by scenario',
        content: `CODE | PROCEDURE | PRIMARY TRIGGER | OWNER
─────────────────────────────────────────────────────────────────────
PC001 | BCP Activation | Section 7.1 criteria met | BCP Coordinator
PC002 | Incident Management Team Activation | Level 2 or 3 declared | BCP Coordinator
PC003 | Incident Log | Upon BCP activation | Coordinator / Log keeper
PC004 | Situation Report (SITREP) | According to the reporting frequency established by the incident management team | BCP Coordinator
PC005 | Post-Incident Report and Lessons Learned | Following incident closure, according to the timeframe established by the organization | BCP Coordinator
PC011 | Building Disaster — Continuity | Site inaccessible or unusable | Facilities / Operations
PC012 | Cyber Incident — Continuity | Critical app, network or data unavailable | IT
PC013 | Pandemic / Mass Absenteeism | Staffing below BIA minimums | HR / Operations
PC014 | Extended Power Outage | Normal autonomy insufficient or RTO threatened | Facilities
PC015 | Loss of Critical Supplier | Supplier unable to meet tolerance | Procurement
PC016 | Loss of Key Employee | Unique competency unavailable | Manager / HR
PC021 | Return to Normal Operations | Stabilization conditions met | Coordinator / Management
PC022 | Post-Incident IT Verification | Before closing a technology recovery | IT
PC023 | Post-Incident Stakeholder Communication | After stabilization or resolution | Communications`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 8 — EXERCICES, REGISTRES ET MAINTIEN
  // ══════════════════════════════════════════════
  const m8fr = {
    moduleNumber: 8,
    title: 'EXERCICES, REGISTRES ET MAINTIEN DU PLAN',
    language: 'fr',
    sections: [
      {
        id: 'm8_s1',
        title: 'Programme d\'exercices',
        content: `Le programme d'exercices doit progresser du simple au complexe et couvrir, sur un cycle raisonnable, les principales activités, stratégies, rôles et dépendances du PCA. Le niveau de réalisme doit être adapté à l'objectif recherché et aux risques associés à l'exercice.

EXERCER LES CAPACITÉS, PAS SEULEMENT LES SCÉNARIOS
Un scénario sert de contexte. L'objectif réel est de vérifier des capacités : mobiliser la cellule, fonctionner sans ERP, joindre les employés, transférer les opérations, restaurer des données ou atteindre un niveau minimal de service.

TYPE | OBJECTIF | PARTICIPANTS | FRÉQUENCE | EXEMPLES DE VALIDATION
─────────────────────────────────────────────────────────────────────
Exercice formatif / discussion | Parcourir le PCA, clarifier les rôles et identifier les lacunes | Responsables PCA et fonctions concernées | ${cfg.exerciseFormative || '1 fois par année — fréquence de référence du Guide du Québec'} | Contacts, responsabilités, procédures, documents
─────────────────────────────────────────────────────────────────────
Exercice sur table | Simuler un scénario et faire prendre les décisions par les participants | Cellule de gestion d'incident | ${cfg.exerciseTable || '1 fois par année — fréquence de référence du Guide du Québec'} | Activation, BIA, stratégies, communications, SITREP
─────────────────────────────────────────────────────────────────────
Test TI / essai technique | Démontrer une capacité technologique précise | TI + fournisseurs + utilisateurs clés | ${cfg.exerciseIT || '1 fois par année — fréquence de référence du Guide du Québec'} | Restauration, RPO/RTO réels, accès distant, télécommunications
─────────────────────────────────────────────────────────────────────
Test fonctionnel | Faire fonctionner une activité en mode de continuité | Équipe opérationnelle concernée | Selon le programme établi par l'organisation | Mode manuel, télétravail, fournisseur secondaire
─────────────────────────────────────────────────────────────────────
Simulation en temps réel | Déployer plusieurs ressources et fonctions dans des conditions réalistes | Cellule + équipes opérationnelles | ${cfg.exerciseSimulation || 'Tous les 3 ans — fréquence de référence du Guide du Québec'} | Mobilisation, site de relève, coordination, reprise

⚠️ RAPPEL FONDAMENTAL
La capacité d'une entreprise à maintenir ses activités ne peut être démontrée tant que son plan de continuité des activités n'a pas été exercé. — Guide de gestion de la continuité des activités, Gouvernement du Québec`,
      },
      {
        id: 'm8_s2',
        title: 'Responsable de la mise à jour',
        content: `RESPONSABLE DU PLAN | ${cfg.planOwner || coordName || 'À désigner'}
─────────────────────────────────────────────────────────────────────
SUBSTITUT | ${substName || 'À désigner'}
FRÉQUENCE DE RÉVISION GÉNÉRALE | ${cfg.reviewFrequency || 'Annuelle — fréquence de référence du programme de mise à jour du Guide du Québec'}
PROCHAINE RÉVISION PLANIFIÉE | ${cfg.nextReviewDate ? new Date(cfg.nextReviewDate).toLocaleDateString('fr-CA') : 'À planifier'}
APPROBATEUR | Direction générale

DÉCLENCHEURS DE RÉVISION HORS CYCLE
- Incident réel ayant entraîné une activation du PCA
- Exercice révélant des lacunes significatives
- Changement organisationnel majeur (fusion, acquisition, restructuration)
- Nouveau site, fermeture ou relocalisation
- Changement TI majeur (nouveau système, migration, fournisseur)
- Nouveau fournisseur critique ou perte d'un fournisseur important
- Modification réglementaire ou contractuelle pertinente
- Nomination d'un nouveau coordonnateur PCA ou changement dans la cellule

RESPONSABILITÉS DE MAINTIEN
- Coordonner la révision périodique du PCA et solliciter les validations des propriétaires de données
- Vérifier les coordonnées, titulaires, substituts, sites et moyens de communication
- Faire réviser les données du BIA, de l'ARA et les stratégies lors de changements significatifs
- Maintenir le programme d'exercices et s'assurer que les résultats sont documentés
- Suivre les actions correctives jusqu'à leur fermeture ou acceptation formelle
- Contrôler les versions et s'assurer que les copies disponibles sont à jour`,
      },
      {
        id: 'm8_s3',
        title: 'Programme de mise à jour',
        content: `COMPOSANTES DU PROGRAMME DE CONTINUITÉ | CYCLE DE RÉVISION
─────────────────────────────────────────────────────────────────────
Bilan d'impact sur les activités (BIA) — Analyse complète | Lors de changements significatifs apportés aux produits, services et activités
─────────────────────────────────────────────────────────────────────
Bilan d'impact sur les activités (BIA) — Besoins en ressources | Annuel ou lors de changements significatifs
─────────────────────────────────────────────────────────────────────
Appréciation du risque (ARA) | Lors de changements significatifs — Toujours considérer l'augmentation des événements météorologiques extrêmes
─────────────────────────────────────────────────────────────────────
Stratégies de continuité | Annuel ou lors de changements significatifs
─────────────────────────────────────────────────────────────────────
Structure de réponse — Rôles et responsabilités | Annuel
─────────────────────────────────────────────────────────────────────
Structure de réponse — Coordonnées des membres | Si nécessaire
─────────────────────────────────────────────────────────────────────
Structure de réponse — Processus d'alerte et de mobilisation | Annuel
─────────────────────────────────────────────────────────────────────
Structure de réponse — Stratégies de communication | Annuel ou lors de changements significatifs
─────────────────────────────────────────────────────────────────────
Plan de continuité des activités — Activités de continuité | Annuel
─────────────────────────────────────────────────────────────────────
Plan de continuité des activités — Annexes | Si nécessaire
─────────────────────────────────────────────────────────────────────
Programme de formation et d'exercices | Annuel

CONTRÔLE DES VERSIONS
TYPE DE CHANGEMENT | ACTION REQUISE
─────────────────────────────────────────────────────────────────────
Mise à jour des coordonnées | Mise à jour directe — sans nouvelle version
─────────────────────────────────────────────────────────────────────
Ajout ou modification de stratégie | Nouvelle version mineure (ex. : 1.0 → 1.1)
─────────────────────────────────────────────────────────────────────
Révision annuelle complète | Nouvelle version majeure (ex. : 1.0 → 2.0)
─────────────────────────────────────────────────────────────────────
Révision post-incident significatif | Nouvelle version contrôlée`,
      },
      {
        id: 'm8_s4',
        title: 'Registre des exercices',
        content: `Le registre fournit la preuve du programme d'exercices et permet de suivre la couverture du PCA dans le temps.

DATE | TYPE | SCÉNARIO / CAPACITÉ | PARTICIPANTS | RÉSULTAT | ÉCARTS | ACTIONS / RÉFÉRENCE
─────────────────────────────────────────────────────────────────────
[Premier exercice à planifier] | ${cfg.exerciseTable || 'Sur table'} | Scénario à définir | Cellule de gestion d'incident | À réaliser | — | —
─────────────────────────────────────────────────────────────────────
[Test TI à planifier] | ${cfg.exerciseIT || 'Test technique'} | Restauration systèmes critiques | TI + fournisseurs | À réaliser | — | —

Les champs doivent être complétés après chaque exercice réalisé et reliés aux rapports d'évaluation ainsi qu'aux actions correctives.`,
      },
      {
        id: 'm8_s5',
        title: 'Registre des incidents',
        content: `Les incidents réels constituent une source de validation aussi importante que les exercices. Le registre doit inclure les événements ayant entraîné une activation du PCA, mais aussi les perturbations significatives gérées sans activation lorsqu'elles révèlent une leçon utile.

DATE | INCIDENT | IMPACT | PCA ACTIVÉ | NIVEAU | ACTIONS PRINCIPALES | LEÇONS / RAPPORT
─────────────────────────────────────────────────────────────────────
[À compléter lors du premier incident] | — | — | — | — | — | —

RÈGLE D'UTILISATION
- Consigner tout incident ayant entraîné une activation, même partielle
- Consigner les perturbations significatives gérées en mode dégradé même sans activation formelle
- Documenter les leçons apprises et les relier aux actions correctives`,
      },
      {
        id: 'm8_s6',
        title: 'Journal de bord d\'incident',
        content: `Le journal de bord doit être ouvert dès l'activation du PCA et maintenu jusqu'à la fermeture formelle. Il constitue la chronologie de référence de l'incident.

RÈGLES DE TENUE DU JOURNAL
- Utiliser l'heure locale et une chronologie continue
- Consigner les faits de façon objective et distinguer les informations non confirmées
- Identifier l'auteur ou la source lorsque cela est pertinent
- Documenter les décisions importantes, leur autorité et leur justification
- Ne pas supprimer une entrée : toute correction doit demeurer traçable
- Conserver les pièces liées aux décisions importantes, communications, dépenses et notifications
- Prévoir une copie papier accessible si les systèmes informatiques sont indisponibles

DATE D'OUVERTURE : _______________  HEURE : _______________
TYPE D'INCIDENT : _____________________________________________
NIVEAU : ☐ Niveau 1  ☐ Niveau 2  ☐ Niveau 3
RESPONSABLE DU JOURNAL : _____________________________________

CHRONOLOGIE DES ACTIONS
HEURE | ACTION / DÉCISION | RESPONSABLE | RÉSULTAT
─────────────────────────────────────────────────────────────────────
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________

STATUT DES ACTIVITÉS CRITIQUES
${criticalServices.length > 0
  ? criticalServices.map((s: any) => `${(s.name || 'Activité').substring(0, 40).padEnd(40)} | ☐ Normal  ☐ Dégradé  ☐ Suspendu`).join('\n')
  : 'Activité 1 : _________________________________ | ☐ Normal  ☐ Dégradé  ☐ Suspendu\nActivité 2 : _________________________________ | ☐ Normal  ☐ Dégradé  ☐ Suspendu\nActivité 3 : _________________________________ | ☐ Normal  ☐ Dégradé  ☐ Suspendu'}

FERMETURE DU JOURNAL
Date de fermeture : _______________  Heure : _______________
Critères de retour à la normale atteints : ☐ Oui  ☐ Non
Signature du coordonnateur PCA : _____________________________`,
      },
      {
        id: 'm8_s7',
        title: 'Rapport post-incident',
        content: `Le rapport post-incident doit être complété dans un délai établi par l'organisation après la résolution ou la clôture de l'incident. Il sert à documenter les leçons apprises et à améliorer le PCA.

STRUCTURE DU RAPPORT POST-INCIDENT
1. Résumé exécutif — Description synthétique de l'événement, des impacts, de la réponse et de l'état final.
2. Chronologie — Principaux jalons depuis la détection jusqu'à la désactivation.
3. Performance du PCA — Activation, mobilisation, communications, stratégies et procédures utilisées.
4. Performance des activités — RTO réels, niveaux de service obtenus, volumes en retard et durée des modes dégradés.
5. Dépendances et fournisseurs — Comportement des ressources externes et internes critiques.
6. Santé, sécurité et conformité — Éléments pertinents et obligations de notification, lorsque applicables.
7. Points forts — Capacités ayant fonctionné comme prévu ou mieux que prévu.
8. Écarts et causes — Lacunes observées, hypothèses invalidées et facteurs contributifs.
9. Actions correctives — Action, priorité, propriétaire, échéance et preuve attendue.
10. Changements au PCA — Sections, procédures, données ou stratégies devant être révisées.

COMPARAISON DES OBJECTIFS ET RÉSULTATS
ACTIVITÉ / CAPACITÉ | OBJECTIF | RÉSULTAT RÉEL | ÉCART | CONCLUSION
─────────────────────────────────────────────────────────────────────
Activation PCA | Selon les critères et l'objectif de mobilisation établis par l'organisation | _____ | _____ | Atteint / Partiel / Non atteint
─────────────────────────────────────────────────────────────────────
${criticalServices.slice(0, 5).map((s: any) =>
  `${(s.name || 'Activité').substring(0, 25)} | RTO ${s.rto || 'N/D'} | _____ | _____ | Atteint / Partiel / Non atteint`
).join('\n')}

RÉDIGER PAR : _________________________  DATE : _______________
APPROUVÉ PAR (Direction) : __________________________________`,
      },
      {
        id: 'm8_s8',
        title: 'Formulaire d\'évaluation des exercices',
        content: `DATE DE L'EXERCICE : _______________
TYPE : ☐ Formatif/Discussion  ☐ Sur table  ☐ Test TI  ☐ Fonctionnel  ☐ Simulation
SCÉNARIO : _____________________________________________
ANIMATEUR : ___________________________________________________
ÉVALUATEUR PRINCIPAL : ________________________________________
PARTICIPANTS : ${cellMembers.length > 0 ? cellMembers.map((m: any) => `${m.firstName || ''} ${m.lastName || ''} (${m.role || ''})`).join(', ') : 'À documenter'}

GRILLE D'ÉVALUATION
CRITÈRE | ATTENTE | RÉSULTAT | ÉVALUATION | OBSERVATION
─────────────────────────────────────────────────────────────────────
Détection / escalade | Incident qualifié correctement | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Activation | PCA activé dans le délai cible | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Mobilisation | Rôles clés joints et présents | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Situation commune | Impacts et priorités compris | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
BIA / priorisation | RTO et activités critiques utilisés | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Stratégies | Solutions activées efficacement | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Communications | Messages cohérents et approuvés | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Documentation | Journal / décisions tenus | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Retour | Critères de stabilisation appliqués | ________ | ☐ A  ☐ P  ☐ NA | ________________

Légende : A = atteint; P = partiellement atteint; NA = non atteint

SYNTHÈSE DE L'ÉVALUATEUR
Principaux points forts : ____________________________________________________________
Principaux écarts : _________________________________________________________________
Améliorations prioritaires : _________________________________________________________
Recommandation de nouvel exercice : ________________________________________________

NOTE GLOBALE : ☐ Excellent  ☐ Bon  ☐ À améliorer  ☐ Insuffisant
Signature de l'animateur : ________________________________________`,
      },
      {
        id: 'm8_s9',
        title: 'Formation et sensibilisation',
        content: `La formation soutient directement l'efficacité du PCA. Les personnes n'ont pas toutes besoin du même niveau de connaissance.

PUBLIC | CONTENU | OBJECTIF | FRÉQUENCE | APPROCHE
─────────────────────────────────────────────────────────────────────
Tous les employés | Alerte, consignes, continuité générale, moyens de communication | Comprendre quoi faire et où obtenir l'information | Annuel + accueil | Capsule / mémo / séance courte
─────────────────────────────────────────────────────────────────────
Gestionnaires | Escalade, activités critiques, responsabilités | Reconnaître quand le PCA peut être requis | Annuel | Atelier
─────────────────────────────────────────────────────────────────────
Cellule de gestion d'incident | Rôles, mobilisation, SITREP, décisions, communications | Être capable d'exécuter le PCA | Annuel | Formation + exercice
─────────────────────────────────────────────────────────────────────
Responsables d'activités critiques | BIA, mode dégradé, ressources, reprise | Maintenir le niveau minimal et valider la reprise | Annuel | Atelier fonctionnel
─────────────────────────────────────────────────────────────────────
TI / spécialistes | Procédures techniques et objectifs RTO/RPO | Démontrer les capacités techniques | Selon programme | Test technique
─────────────────────────────────────────────────────────────────────
Nouveaux titulaires / substituts | Rôle spécifique et outils | Assumer immédiatement la fonction désignée | À la nomination | Briefing ciblé`,
      },
      {
        id: 'm8_s10',
        title: 'Plan d\'amélioration continue',
        content: `Les constats provenant des exercices, incidents, audits et révisions doivent converger vers un seul registre d'amélioration. Une action n'est considérée comme fermée que lorsqu'une preuve suffisante démontre que l'écart a été corrigé ou qu'un risque résiduel a été accepté par l'autorité compétente.

ID | SOURCE | ÉCART / CONSTAT | PRIORITÉ | ACTION | RESPONSABLE | ÉCHÉANCE | PREUVE / STATUT
─────────────────────────────────────────────────────────────────────
AC-${year}-01 | [Premier exercice / incident] | À documenter | À définir | À définir | À désigner | À définir | Ouvert

APPROBATION DU PROGRAMME DE MAINTIEN
FONCTION | NOM / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
Responsable du PCA | ${cfg.planOwner || coordName || ''} |
Responsable des opérations | |
Direction générale | |`,
      },
    ],
  };

    const m8en = {
    moduleNumber: 8,
    title: 'EXERCISES, RECORDS AND PLAN MAINTENANCE',
    language: 'en',
    sections: [
      {
        id: 'm8_s1',
        title: 'Exercise program',
        content: `The exercise program should progress from simple to complex and cover, over a reasonable cycle, the main activities, strategies, roles and dependencies of the BCP. The level of realism should be appropriate to the objective of the exercise and the risks associated with its execution.

EXERCISE CAPABILITIES, NOT ONLY SCENARIOS
A scenario provides context. The actual objective is to validate capabilities such as mobilizing the incident management team, operating without normal systems, contacting employees, transferring operations, restoring data or achieving a minimum service level.

TYPE | OBJECTIVE | PARTICIPANTS | FREQUENCY | EXAMPLES OF VALIDATION
─────────────────────────────────────────────────────────────────────
Formative / discussion exercise | Review the BCP, clarify roles and identify gaps | BCP managers and relevant functions | ${cfg.exerciseFormative || 'Once per year — reference frequency from the Government of Quebec guide'} | Contacts, responsibilities, procedures, documentation
─────────────────────────────────────────────────────────────────────
Tabletop exercise | Simulate a scenario and require participants to make decisions | Incident management team | ${cfg.exerciseTable || 'Once per year — reference frequency from the Government of Quebec guide'} | Activation, BIA, strategies, communications, SITREP
─────────────────────────────────────────────────────────────────────
IT / technical test | Demonstrate a specific technological capability | IT + suppliers + key users | ${cfg.exerciseIT || 'Once per year — reference frequency from the Government of Quebec guide'} | Restoration, actual RPO/RTO, remote access, telecommunications
─────────────────────────────────────────────────────────────────────
Functional test | Operate an activity under continuity arrangements | Relevant operational team | According to the program established by the organization | Manual mode, telework, alternate supplier
─────────────────────────────────────────────────────────────────────
Real-time simulation | Deploy multiple resources and functions under realistic conditions | Incident management team + operational teams | ${cfg.exerciseSimulation || 'Every 3 years — reference frequency from the Government of Quebec guide'} | Mobilization, alternate site, coordination, recovery

⚠️ FUNDAMENTAL REMINDER
An organization's ability to maintain its activities cannot be demonstrated until its business continuity plan has been exercised. — Government of Quebec Business Continuity Management Guide`,
      },

      {
        id: 'm8_s2',
        title: 'Plan owner and review schedule',
        content: `PLAN OWNER | ${cfg.planOwner || coordName || 'To be designated'}
─────────────────────────────────────────────────────────────────────
ALTERNATE | ${substName || 'To be designated'}
GENERAL REVIEW FREQUENCY | ${cfg.reviewFrequency || 'Annual — reference frequency from the Government of Quebec maintenance program'}
NEXT SCHEDULED REVIEW | ${cfg.nextReviewDate ? new Date(cfg.nextReviewDate).toLocaleDateString('en-CA') : 'To be scheduled'}
APPROVER | Senior Management

OUT-OF-CYCLE REVIEW TRIGGERS
- Actual incident resulting in BCP activation
- Exercise revealing significant gaps
- Major organizational change such as a merger, acquisition or restructuring
- New site, site closure or relocation
- Major IT change such as a new system, migration or supplier change
- New critical supplier or loss of an important supplier
- Relevant regulatory or contractual change
- Appointment of a new BCP Coordinator or changes to the incident management team

MAINTENANCE RESPONSIBILITIES
- Coordinate periodic BCP reviews and obtain validation from information owners
- Verify contact information, role holders, alternates, sites and communication methods
- Review BIA, risk assessment and continuity strategies following significant changes
- Maintain the exercise program and ensure results are documented
- Track corrective actions until closure or formal acceptance
- Maintain version control and ensure available copies remain current`,
      },

      {
        id: 'm8_s3',
        title: 'Update program',
        content: `BUSINESS CONTINUITY PROGRAM COMPONENT | REVIEW CYCLE
─────────────────────────────────────────────────────────────────────
Business Impact Analysis (BIA) — Full analysis | Following significant changes to products, services or activities
─────────────────────────────────────────────────────────────────────
Business Impact Analysis (BIA) — Resource requirements | Annual or following significant changes
─────────────────────────────────────────────────────────────────────
Risk assessment | Following significant changes — Consider changes in exposure to extreme weather and other relevant risks
─────────────────────────────────────────────────────────────────────
Continuity strategies | Annual or following significant changes
─────────────────────────────────────────────────────────────────────
Response structure — Roles and responsibilities | Annual
─────────────────────────────────────────────────────────────────────
Response structure — Member contact information | As required
─────────────────────────────────────────────────────────────────────
Response structure — Alert and mobilization process | Annual
─────────────────────────────────────────────────────────────────────
Response structure — Communication strategies | Annual or following significant changes
─────────────────────────────────────────────────────────────────────
Business Continuity Plan — Continuity activities | Annual
─────────────────────────────────────────────────────────────────────
Business Continuity Plan — Appendices | As required
─────────────────────────────────────────────────────────────────────
Training and exercise program | Annual

VERSION CONTROL
CHANGE TYPE | REQUIRED ACTION
─────────────────────────────────────────────────────────────────────
Contact information update | Direct update — no new version required
─────────────────────────────────────────────────────────────────────
Addition or modification of a strategy | New minor version (e.g. 1.0 → 1.1)
─────────────────────────────────────────────────────────────────────
Complete periodic review | New major version (e.g. 1.0 → 2.0)
─────────────────────────────────────────────────────────────────────
Review following a significant incident | New controlled version`,
      },

      {
        id: 'm8_s4',
        title: 'Exercise log',
        content: `The exercise log provides evidence of the exercise program and allows the organization to track BCP coverage over time.

DATE | TYPE | SCENARIO / CAPABILITY | PARTICIPANTS | RESULT | GAPS | ACTIONS / REFERENCE
─────────────────────────────────────────────────────────────────────
[First exercise to be scheduled] | ${cfg.exerciseTable || 'Tabletop'} | Scenario to be defined | Incident management team | To be conducted | — | —
─────────────────────────────────────────────────────────────────────
[IT test to be scheduled] | ${cfg.exerciseIT || 'Technical test'} | Restoration of critical systems | IT + suppliers | To be conducted | — | —

The fields should be completed after each exercise and linked to evaluation reports and corrective actions.`,
      },

      {
        id: 'm8_s5',
        title: 'Incident log',
        content: `Actual incidents are an important source of validation. The register should include events that resulted in BCP activation as well as significant disruptions managed without formal activation when they provide useful lessons.

DATE | INCIDENT | IMPACT | BCP ACTIVATED | LEVEL | MAIN ACTIONS | LESSONS / REPORT
─────────────────────────────────────────────────────────────────────
[To be completed upon the first incident] | — | — | — | — | — | —

USE RULES
- Record every incident resulting in full or partial BCP activation
- Record significant disruptions managed in degraded mode even when formal activation was not required
- Document lessons learned and link them to corrective actions`,
      },

      {
        id: 'm8_s6',
        title: 'Incident logbook',
        content: `The incident logbook should be opened when the BCP is activated and maintained until formal closure. It provides the reference chronology for the incident.

LOGBOOK RULES
- Use local time and maintain a continuous chronology
- Record facts objectively and distinguish unconfirmed information
- Identify the author or source when relevant
- Record significant decisions, decision authority and rationale
- Do not delete entries: corrections should remain traceable
- Retain records supporting significant decisions, communications, expenses and notifications
- Maintain access to a paper copy when information systems are unavailable

OPENING DATE: _______________  TIME: _______________
INCIDENT TYPE: _______________________________________________
LEVEL: ☐ Level 1  ☐ Level 2  ☐ Level 3
LOG KEEPER: __________________________________________________

ACTION CHRONOLOGY
TIME | ACTION / DECISION | OWNER | RESULT
─────────────────────────────────────────────────────────────────────
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________
___:___ | _________________________________ | _____________ | _____________

STATUS OF CRITICAL ACTIVITIES
${criticalServices.length > 0
  ? criticalServices.map((s: any) =>
      `${(s.name || 'Activity').substring(0, 40).padEnd(40)} | ☐ Normal  ☐ Degraded  ☐ Suspended`
    ).join('\n')
  : 'Activity 1: ________________________________ | ☐ Normal  ☐ Degraded  ☐ Suspended\nActivity 2: ________________________________ | ☐ Normal  ☐ Degraded  ☐ Suspended\nActivity 3: ________________________________ | ☐ Normal  ☐ Degraded  ☐ Suspended'}

LOGBOOK CLOSURE
Closure date: _______________  Time: _______________
Return-to-normal criteria achieved: ☐ Yes  ☐ No
BCP Coordinator signature: _________________________________`,
      },

      {
        id: 'm8_s7',
        title: 'Post-incident report',
        content: `The post-incident report should be completed within a timeframe established by the organization following incident resolution or closure. It documents lessons learned and supports improvement of the BCP.

POST-INCIDENT REPORT STRUCTURE
1. Executive summary — Concise description of the event, impacts, response and final status.
2. Timeline — Key milestones from detection through deactivation.
3. BCP performance — Activation, mobilization, communications, strategies and procedures used.
4. Activity performance — Actual recovery times, service levels achieved, backlog and duration of degraded operations.
5. Dependencies and suppliers — Performance of critical internal and external resources.
6. Health, safety and compliance — Relevant issues and notification obligations, where applicable.
7. Strengths — Capabilities that performed as intended or better than expected.
8. Gaps and causes — Observed deficiencies, invalidated assumptions and contributing factors.
9. Corrective actions — Action, priority, owner, deadline and required evidence.
10. BCP changes — Sections, procedures, information or strategies requiring revision.

OBJECTIVES AND ACTUAL RESULTS
ACTIVITY / CAPABILITY | OBJECTIVE | ACTUAL RESULT | GAP | CONCLUSION
─────────────────────────────────────────────────────────────────────
BCP activation | According to the criteria and mobilization objective established by the organization | _____ | _____ | Achieved / Partial / Not achieved
─────────────────────────────────────────────────────────────────────
${criticalServices.slice(0, 5).map((s: any) =>
  `${(s.name || 'Activity').substring(0, 25)} | RTO ${s.rto || 'N/A'} | _____ | _____ | Achieved / Partial / Not achieved`
).join('\n')}

PREPARED BY: _________________________  DATE: _______________
APPROVED BY (Management): __________________________________`,
      },

      {
        id: 'm8_s8',
        title: 'Exercise evaluation form',
        content: `EXERCISE DATE: _______________
TYPE: ☐ Formative / Discussion  ☐ Tabletop  ☐ IT Test  ☐ Functional  ☐ Simulation
SCENARIO: ____________________________________________________
FACILITATOR: __________________________________________________
LEAD EVALUATOR: _______________________________________________
PARTICIPANTS: ${cellMembers.length > 0
  ? cellMembers.map((m: any) =>
      `${m.firstName || ''} ${m.lastName || ''} (${m.role || ''})`
    ).join(', ')
  : 'To be documented'}

EVALUATION GRID
CRITERION | EXPECTATION | RESULT | EVALUATION | OBSERVATION
─────────────────────────────────────────────────────────────────────
Detection / escalation | Incident correctly assessed and escalated | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Activation | BCP activated according to established criteria and objectives | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Mobilization | Key roles contacted and available | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Common operating picture | Impacts and priorities understood | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
BIA / prioritization | RTOs and critical activities used appropriately | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Strategies | Continuity solutions applied effectively | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Communications | Messages consistent and appropriately approved | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Documentation | Incident log and decisions properly maintained | ________ | ☐ A  ☐ P  ☐ NA | ________________
─────────────────────────────────────────────────────────────────────
Return to normal | Stabilization criteria appropriately applied | ________ | ☐ A  ☐ P  ☐ NA | ________________

Legend: A = achieved; P = partially achieved; NA = not achieved

EVALUATOR SUMMARY
Main strengths: ______________________________________________________________
Main gaps: ___________________________________________________________________
Priority improvements: _______________________________________________________
Recommended follow-up exercise: _______________________________________________

OVERALL RATING: ☐ Excellent  ☐ Good  ☐ Needs improvement  ☐ Unsatisfactory
Facilitator signature: __________________________________________`,
      },

      {
        id: 'm8_s9',
        title: 'Training and awareness',
        content: `Training directly supports BCP effectiveness. Different groups do not require the same level of knowledge.

AUDIENCE | CONTENT | OBJECTIVE | FREQUENCY | APPROACH
─────────────────────────────────────────────────────────────────────
All employees | Alerts, instructions, general continuity awareness, communication methods | Understand what to do and where to obtain information | Annual + onboarding | Briefing / memo / short session
─────────────────────────────────────────────────────────────────────
Managers | Escalation, critical activities, responsibilities | Recognize when the BCP may be required | Annual | Workshop
─────────────────────────────────────────────────────────────────────
Incident management team | Roles, mobilization, SITREP, decisions, communications | Be capable of executing the BCP | Annual | Training + exercise
─────────────────────────────────────────────────────────────────────
Critical activity owners | BIA, degraded mode, resources, recovery | Maintain minimum service and validate recovery | Annual | Functional workshop
─────────────────────────────────────────────────────────────────────
IT / specialists | Technical procedures and RTO/RPO objectives | Demonstrate technical recovery capabilities | According to program | Technical test
─────────────────────────────────────────────────────────────────────
New role holders / alternates | Specific role and tools | Be ready to assume the designated function | Upon appointment | Targeted briefing`,
      },

      {
        id: 'm8_s10',
        title: 'Continuous improvement plan',
        content: `Findings from exercises, incidents, audits and reviews should feed a single improvement register. An action should only be considered closed when sufficient evidence demonstrates that the gap has been corrected or that the residual risk has been formally accepted by the appropriate authority.

ID | SOURCE | GAP / FINDING | PRIORITY | ACTION | OWNER | DEADLINE | EVIDENCE / STATUS
─────────────────────────────────────────────────────────────────────
AC-${year}-01 | [First exercise / incident] | To be documented | To be defined | To be defined | To be designated | To be defined | Open

MAINTENANCE PROGRAM APPROVAL
FUNCTION | NAME / SIGNATURE | DATE
─────────────────────────────────────────────────────────────────────
BCP Owner | ${cfg.planOwner || coordName || ''} |
Operations Manager | |
Senior Management | |`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // RETOUR FINAL
  // ══════════════════════════════════════════════
  return {
    fr: [m1fr, m2fr, m3fr, m4fr, m5fr, m6fr, m7fr, m8fr],
    en: [m1en, m2en, m3en, m4en, m5en, m6en, m7en, m8en],
  };
}