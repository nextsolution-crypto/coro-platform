import { DocumentContext } from './module1/module1.index';
import { getAllPcaProcedures, getActivePcaProcedures } from './procedures/pca/index';

export function generatePcaModules(ctx: DocumentContext, pcaConfig: any) {

  const cfg = pcaConfig || {};
  const clientName = ctx.clientName || '';
  const year = ctx.year || new Date().getFullYear();
  const isFr = true; // Bilingue géré par la langue d'export

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

  const riskScenarios = cfg.riskScenarios || [];
  const criticalServices = cfg.criticalServices || [];
  const cellMembers = cfg.cellMembers || [];

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
Portée : ${cfg.scope === 'ORGANIZATION' ? 'Organisation entière' : cfg.scope === 'BUILDING' ? 'Bâtiment spécifique' : 'Plusieurs bâtiments'}
Secteur d'activité : ${cfg.sector || 'Non précisé'}
Nombre d'employés : ${cfg.employeeCount || 'Non précisé'}
Heures d'opération : ${cfg.operatingHours || 'Non précisé'}
Année d'émission : ${year}

Le présent Plan de continuité des activités (PCA) a pour objectif de permettre à ${clientName} de maintenir ses activités essentielles et de reprendre ses opérations dans les meilleurs délais suivant un incident perturbateur. Il établit les priorités de continuité, les stratégies approuvées, les responsabilités, les critères d'activation et les mécanismes de suivi nécessaires à une réponse coordonnée.

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
${cfg.regulatoryReqs?.length > 0 ? cfg.regulatoryReqs.map((r: string) => `${r} | Exigence applicable | À documenter selon le secteur et les activités de l'organisation.`).join('\n─────────────────────────────────────────────────────────────────────\n') : 'Exigences légales, réglementaires et contractuelles propres à l\'organisation | Exigences applicables | À documenter selon le secteur, les activités, les clients et les territoires concernés.'}

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

Le PCA est révisé au minimum annuellement et lors de tout changement significatif dans les activités, la structure, les systèmes ou l'environnement de l'organisation.`,
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
Scope: ${cfg.scope === 'ORGANIZATION' ? 'Entire organization' : cfg.scope === 'BUILDING' ? 'Specific building' : 'Multiple buildings'}
Business sector: ${cfg.sector || 'Not specified'}
Number of employees: ${cfg.employeeCount || 'Not specified'}
Operating hours: ${cfg.operatingHours || 'Not specified'}
Year of issue: ${year}

This Business Continuity Plan (BCP) aims to enable ${clientName} to maintain its essential activities and resume operations as quickly as possible following a disruptive incident. It establishes continuity priorities, approved strategies, responsibilities, activation criteria and monitoring mechanisms necessary for a coordinated response.`,
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
ISO 22301:2019/Amd 1:2024 — Climate change amendment | Normative amendment | Adds climate change consideration as a risk to evaluate during reviews.`,
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

The BCP is reviewed at minimum annually and upon any significant change in the organization's activities, structure, systems or environment.`,
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

  const regsTable = cfg.regulatoryReqs?.length > 0
    ? cfg.regulatoryReqs.map((r: string) => `${r} | À documenter | À compléter | À compléter`).join('\n')
    : 'Aucune exigence réglementaire spécifique identifiée — À compléter lors de la révision annuelle';

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

Dans le cadre du présent PCA, la direction conserve l'autorité stratégique. Le coordonnateur PCA assure la coordination générale du dispositif, tandis que les responsables fonctionnels évaluent les impacts dans leur domaine, activent les stratégies approuvées et rendent compte de la situation à la cellule de gestion d'incident.

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
Nombre d'employés : ${cfg.employeeCount || cfg.clientEmployeeCount || 'Non précisé'}
Heures d'opération : ${cfg.operatingHours || 'Non précisé'}
Portée du plan : ${cfg.scope === 'ORGANIZATION' ? 'Organisation entière' : cfg.scope === 'BUILDING' ? 'Bâtiment spécifique' : 'Plusieurs bâtiments'}

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

MATRICE D'AUTORITÉ EN SITUATION DE CONTINUITÉ
DÉCISION | AUTORITÉ PRINCIPALE | CONSULTATION | TRACE REQUISE
─────────────────────────────────────────────────────────────────────
Activation du PCA | Coordonnateur PCA selon critères / délégation | Chef de cellule au besoin | Heure, motif et niveau d'activation
─────────────────────────────────────────────────────────────────────
Dépense exceptionnelle | Direction ou délégataire autorisé | Finances | Montant, motif, approbation
─────────────────────────────────────────────────────────────────────
Fermeture / relocalisation d'un site | Direction / chef de cellule | Installations, opérations, RH | Décision et impacts
─────────────────────────────────────────────────────────────────────
Priorisation des clients / services | Direction et opérations | Coordonnateur PCA, finances | Critères et arbitrage
─────────────────────────────────────────────────────────────────────
Communication publique | Porte-parole / direction | Communications, juridique au besoin | Version approuvée et heure de diffusion
─────────────────────────────────────────────────────────────────────
Retour aux activités normales | Direction générale | Coordonnateur et responsables fonctionnels | Critères atteints et heure de clôture`,
      },
      {
        id: 'm2_s5',
        title: 'Coordination de l\'incident',
        content: `Les lieux et moyens de coordination doivent être prédéterminés afin que la cellule puisse fonctionner même lorsque le site principal ou les systèmes habituels sont indisponibles.

ÉLÉMENT | DISPOSITION
─────────────────────────────────────────────────────────────────────
Bureau de coordination principal | ${cfg.buildingName || ctx.buildingAddress || 'À compléter'}
─────────────────────────────────────────────────────────────────────
Bureau de coordination alternatif | ${cfg.coordinationLocation || 'À définir'}
─────────────────────────────────────────────────────────────────────
Pont téléphonique d'urgence | ${cfg.emergencyBridge || 'À définir'}
─────────────────────────────────────────────────────────────────────
Mode virtuel de relève | Plateforme de collaboration avec accès sécurisé
─────────────────────────────────────────────────────────────────────
Journal de bord | Formulaire CORO + copie hors ligne disponible`,
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
Le propriétaire de chaque exigence doit signaler au responsable du PCA tout changement susceptible de modifier une priorité, un délai, une stratégie ou une obligation de notification. Le registre doit être revu au minimum lors de la révision annuelle du PCA.

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
An effective response requires known responsibilities before the incident. People expected to lead or support continuity must be designated, know their mandate and have an alternate when their function is critical.

Continuity governance connects the strategic decisions of management to the tactical and operational actions required during a disruption. It prevents a crisis from relying on uncoordinated individual initiatives and clarifies who has authority to mobilize resources, modify priorities, incur expenses, communicate and declare return to normal.`,
      },
      {
        id: 'm2_s2',
        title: 'Organization description',
        content: `Organization: ${clientName}
Business sector: ${cfg.sector || 'Not specified'}
Number of employees: ${cfg.employeeCount || 'Not specified'}
Operating hours: ${cfg.operatingHours || 'Not specified'}
Plan scope: ${cfg.scope === 'ORGANIZATION' ? 'Entire organization' : cfg.scope === 'BUILDING' ? 'Specific building' : 'Multiple buildings'}`,
      },
      {
        id: 'm2_s3',
        title: 'BCP Coordinator',
        content: `FUNCTION | Business Continuity Plan Coordinator
─────────────────────────────────────────────────────────────────────
TITLEHOLDER | ${coordName || 'To be designated'}
TITLE | ${coordTitle}
PHONE | ${coordPhone}
EMAIL | ${coordEmail}
─────────────────────────────────────────────────────────────────────
ALTERNATE | ${substName || 'To be designated'}
ALTERNATE PHONE | ${substPhone}
ALTERNATE EMAIL | ${substEmail}

BCP COORDINATOR MANDATE
- Receive and qualify information related to an actual or potential interruption
- Recommend or declare BCP activation according to delegated authority
- Convene the incident management team and confirm coordination mode
- Ensure the BCP is applied and adapted to the actual situation
- Maintain a common operating picture and recovery priorities
- Coordinate situation reports, decisions and action follow-up`,
      },
      {
        id: 'm2_s4',
        title: 'Incident management team',
        content: `The incident management team is the tactical coordination structure of the BCP. It brings together the functions needed to assess incident consequences, maintain essential activities, coordinate resources, support recovery and prepare decisions to be submitted to management.

FUNCTION | TITLEHOLDER | PHONE | EMAIL
─────────────────────────────────────────────────────────────────────
Team Lead / Senior Management | To be designated | To be completed | To be completed
─────────────────────────────────────────────────────────────────────
BCP Coordinator | ${coordName || 'To be designated'} | ${coordPhone} | ${coordEmail}
─────────────────────────────────────────────────────────────────────
${cellMembers.map((m: any) => `${m.role || 'To be defined'} | ${m.firstName || ''} ${m.lastName || ''} | ${m.phone || 'To be completed'} | ${m.email || 'To be completed'}`).join('\n')}`,
      },
      {
        id: 'm2_s5',
        title: 'Incident coordination',
        content: `ELEMENT | ARRANGEMENT
─────────────────────────────────────────────────────────────────────
Primary coordination site | ${ctx.buildingAddress || 'To be completed'}
─────────────────────────────────────────────────────────────────────
Alternate coordination site | ${cfg.coordinationLocation || 'To be defined'}
─────────────────────────────────────────────────────────────────────
Emergency conference bridge | ${cfg.emergencyBridge || 'To be defined'}`,
      },
      {
        id: 'm2_s6',
        title: 'Regulatory and contractual requirements',
        content: cfg.regulatoryReqs?.length > 0
          ? `Applicable requirements:\n\n${cfg.regulatoryReqs.map((r: string) => `• ${r}`).join('\n')}`
          : 'No specific regulatory or contractual requirements identified — To be completed during annual review.',
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
        const prob = probLabel(r.probability || 'MOYENNE');
        const imp = impactLabel(r.impact || 'MOYEN');
        const niveau = riskScore(r.probability || 'MOYENNE', r.impact || 'MOYEN');
        const mesures = r.existingControls || 'À documenter';
        const commentaires = r.comments || '—';
        return `${co} | ${sc} | ${imp} | ${prob} | ${niveau} | ${mesures} | ${commentaires}`;
      }).join('\n')
    : 'Aucun scénario identifié — À compléter dans le configurateur PCA (Section 3)';

  const riskTableEN = riskScenarios.length > 0
    ? riskScenarios.map((r: any) => {
        const sc = scenarioLabelEN(r.id);
        const prob = probLabelEN(r.probability || 'MOYENNE');
        const imp = impactLabelEN(r.impact || 'MOYEN');
        const niveau = riskScoreEN(r.probability || 'MOYENNE', r.impact || 'MOYEN');
        const mesures = r.existingControls || 'To be documented';
        const commentaires = r.comments || '—';
        return `${sc} | ${imp} | ${prob} | ${niveau} | ${mesures} | ${commentaires}`;
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
⚠️ POINT DE VIGILANCE : Lors des révisions de l'ARA, les changements significatifs apportés aux activités et l'évolution des phénomènes météorologiques extrêmes doivent être réévalués. Une appréciation du risque n'est pas un portrait permanent. — ISO 22301:2019/Amd 1:2024`,
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
${riskScenarios.filter((r: any) => {
  const p = r.probability === 'ELEVEE' ? 3 : r.probability === 'MOYENNE' ? 2 : 1;
  const i = r.impact === 'ELEVE' ? 3 : r.impact === 'MOYEN' ? 2 : 1;
  return (p * i) >= 6;
}).length > 0
  ? `Risques ÉLEVÉS identifiés (score ≥ 6) :\n${riskScenarios.filter((r: any) => {
      const p = r.probability === 'ELEVEE' ? 3 : r.probability === 'MOYENNE' ? 2 : 1;
      const i = r.impact === 'ELEVE' ? 3 : r.impact === 'MOYEN' ? 2 : 1;
      return (p * i) >= 6;
    }).map((r: any) => `• ${scenarioLabel(r.id)} — Score ${(r.probability === 'ELEVEE' ? 3 : r.probability === 'MOYENNE' ? 2 : 1) * (r.impact === 'ELEVE' ? 3 : r.impact === 'MOYEN' ? 2 : 1)}`).join('\n')}`
  : 'Aucun risque de niveau ÉLEVÉ identifié — Maintenir la surveillance et réévaluer annuellement.'}`,
      },
      {
        id: 'm3_s4',
        title: 'Grille des niveaux d\'incident',
        content: `La grille des niveaux d'incident soutient la décision d'activation du PCA. Elle doit être utilisée avec jugement et ne doit pas retarder l'action.

NIVEAU 1 — INCIDENT LOCAL / MINEUR
- Définition : Perturbation limitée, gérée localement sans activation du PCA
- Portée : Une fonction ou équipe; impact gérable avec les ressources courantes
- Exemples : Panne de poste de travail isolée, absence non critique, problème TI mineur résolu rapidement, panne électrique < 2h avec bascule normale
- Autorité : Gestionnaire local
- Activation PCA : Non requise — surveillance et documentation

NIVEAU 2 — INCIDENT MAJEUR / ACTIVATION PARTIELLE
- Définition : Perturbation significative affectant plusieurs fonctions ou un RTO critique
- Portée : Plusieurs activités ou fonctions touchées; coordination nécessaire
- Exemples : Panne Internet prolongée, cyberincident modéré, absentéisme > 25%, panne électrique > 4h
- Autorité : Coordonnateur PCA + membres clés de la cellule
- Activation PCA : Partielle — modules et fonctions touchées seulement

NIVEAU 3 — CRISE / ACTIVATION COMPLÈTE
- Définition : Perturbation majeure exigeant la mobilisation complète du PCA
- Portée : Plusieurs activités critiques menacées ou interrompues; décisions stratégiques requises
- Exemples : Sinistre bâtiment, cyberattaque majeure (rançongiciel), pandémie, perte d'accès prolongée
- Autorité : Direction générale + cellule complète de gestion d'incident
- Activation PCA : Complète

CRITÈRES DE PASSAGE AU NIVEAU SUPÉRIEUR
- Le RTO d'une activité critique est menacé d'être dépassé
- L'incident s'étend à plus d'un département ou site
- Des ressources externes ou des décisions extraordinaires sont nécessaires
- Des impacts légaux, réglementaires ou réputationnels significatifs sont possibles

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
        content: `The risk assessment complements the Business Impact Analysis by identifying events and failure points that could make essential resources unavailable. It helps visualize the organization's vulnerabilities, identify unacceptable risk concentrations and guide control measures and continuity strategies.

THE FIVE STRUCTURING CONSEQUENCES
1 — Loss of access to premises: Total or partial unavailability of a site, workspace or facility needed for operations.
2 — Loss of IT and communication systems: Unavailability of equipment, applications, data, networks, phones or digital services needed for activities.
3 — Abnormal absenteeism or loss of key personnel: Insufficient staffing, loss of rare competency, unavailability of a sole titleholder or difficulty accessing the workplace.
4 — Disruption of a critical supplier or partner: Breakdown of a service, supply, subcontractor or partner indispensable to delivering products or services.
5 — Loss of essential resources, equipment, tools or services: Unavailability of energy, water, specialized equipment, vehicles, materials, documents, technical facilities or other indispensable resources.

⚠️ VIGILANCE POINT: Climate change is increasing the frequency and severity of extreme weather events. This must be considered during ARA reviews. — ISO 22301:2019/Amd 1:2024`,
      },
      {
        id: 'm3_s2',
        title: 'Assessment scales',
        content: `RISK LEVEL MATRIX (Impact × Probability)
IMPACT \\ PROBABILITY | 3 - High | 2 - Medium | 1 - Low
─────────────────────────────────────────────────────────────────────
3 - Severe | 9 - HIGH | 6 - HIGH | 3 - MEDIUM
─────────────────────────────────────────────────────────────────────
2 - Moderate | 6 - HIGH | 4 - MEDIUM | 2 - LOW
─────────────────────────────────────────────────────────────────────
1 - Low | 3 - MEDIUM | 2 - LOW | 1 - LOW`,
      },
      {
        id: 'm3_s3',
        title: 'Identified disruption scenarios',
        content: `CONSEQUENCE | CAUSE / SCENARIO | IMPACT | PROBABILITY | LEVEL | EXISTING MEASURES | COMMENTS
─────────────────────────────────────────────────────────────────────
${riskTableEN}`,
      },
      {
        id: 'm3_s4',
        title: 'Incident level grid',
        content: `LEVEL 1 — LOCAL / MINOR INCIDENT
- Definition: Limited disruption managed locally without BCP activation
- BCP Activation: Not required — monitoring and documentation

LEVEL 2 — MAJOR INCIDENT / PARTIAL ACTIVATION
- Definition: Significant disruption affecting multiple functions or a critical RTO
- BCP Activation: Partial — affected modules and functions only

LEVEL 3 — CRISIS / FULL ACTIVATION
- Definition: Major disruption requiring full BCP mobilization
- BCP Activation: Full

ESCALATION CRITERIA
- RTO of a critical activity is at risk of being exceeded
- Incident spreads to more than one department or site
- External resources or extraordinary decisions are required
- Significant legal, regulatory or reputational impacts are possible`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 4 — BILAN D'IMPACT SUR LES ACTIVITÉS (BIA)
  // ══════════════════════════════════════════════
  const sortedServices = criticalServices.length > 0
    ? [...criticalServices].sort((a: any, b: any) => {
        const order: Record<string, number> = { '1h': 1, '4h': 2, '8h': 3, '24h': 4, '48h': 5, '72h': 6, '1sem': 7, 'plus': 8 };
        return (order[a.rto] || 9) - (order[b.rto] || 9);
      })
    : [];

  const biaTableFR = sortedServices.length > 0
    ? sortedServices.map((s: any, i: number) => {
        const prio = i <= 1 ? 'P1' : i <= 3 ? 'P2' : 'P3';
        const owner = s.owner || 'À désigner';
        return `${s.name || `Service ${i + 1}`} | ${owner} | ${s.rto || 'N/D'} | ${s.mad || 'N/D'} | ${s.rpo || 'N/D'} | ${s.financialImpact || 'N/D'} | ${prio}`;
      }).join('\n')
    : 'Aucun service critique défini — À compléter dans le configurateur PCA (Section 4)';

  const biaTableEN = sortedServices.length > 0
    ? sortedServices.map((s: any, i: number) => {
        const prio = i <= 1 ? 'P1' : i <= 3 ? 'P2' : 'P3';
        const owner = s.owner || 'To be designated';
        return `${s.name || `Service ${i + 1}`} | ${owner} | ${s.rto || 'N/A'} | ${s.mad || 'N/A'} | ${s.rpo || 'N/A'} | ${s.financialImpact || 'N/A'} | ${prio}`;
      }).join('\n')
    : 'No critical services defined — To be completed in BCP configurator (Section 4)';

  // Fiches BIA enrichies
  const biaFichesFR = sortedServices.map((s: any, i: number) => {
    const prio = i <= 1 ? 'P1' : i <= 3 ? 'P2' : 'P3';
    return `
FICHE BIA — ${(s.name || `Service ${i + 1}`).toUpperCase()}
─────────────────────────────────────────────────────────────────────
Responsable | ${s.owner || 'À désigner'}
Priorité | ${prio}
Niveau minimal de service | ${s.minServiceLevel || 'À définir'}
RTO | ${s.rto || 'N/D'}
MAD / Tolérance maximale | ${s.mad || 'N/D'}
RPO | ${s.rpo || 'N/D'}
Impact financier estimé / jour | ${s.financialImpact || 'N/D'}
Impact réputationnel | ${s.reputationalImpact || 'N/D'}
Impact légal | ${s.legalImpact ? 'Oui' : 'Non'}
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
    const prio = i <= 1 ? 'P1' : i <= 3 ? 'P2' : 'P3';
    return `
BIA SHEET — ${(s.name || `Service ${i + 1}`).toUpperCase()}
─────────────────────────────────────────────────────────────────────
Owner | ${s.owner || 'To be designated'}
Priority | ${prio}
Minimum service level | ${s.minServiceLevel || 'To be defined'}
RTO | ${s.rto || 'N/A'}
MAD / Maximum tolerance | ${s.mad || 'N/A'}
RPO | ${s.rpo || 'N/A'}
Estimated financial impact / day | ${s.financialImpact || 'N/A'}
Reputational impact | ${s.reputationalImpact || 'N/A'}
Legal impact | ${s.legalImpact ? 'Yes' : 'No'}
Critical periods | ${s.criticalPeriods || 'Not specified'}
Degraded mode | ${s.degradedMode || 'Not documented'}
Sustainable duration of degraded mode | ${s.degradedModeDuration || 'Not specified'}

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
  const itSystemsFR = (cfg.criticalITSystems || []).length > 0
    ? (cfg.criticalITSystems || []).map((s: any) =>
        `${s.name || 'N/D'} | ${s.rto || 'N/D'} | ${s.rpo || 'N/D'} | ${s.degradedMode || 'À documenter'} | ${s.backupSolution || 'À documenter'}`
      ).join('\n')
    : 'À documenter — Ajouter les systèmes TI critiques dans le configurateur (Section 5)';

  const itSystemsEN = (cfg.criticalITSystems || []).length > 0
    ? (cfg.criticalITSystems || []).map((s: any) =>
        `${s.name || 'N/A'} | ${s.rto || 'N/A'} | ${s.rpo || 'N/A'} | ${s.degradedMode || 'To be documented'} | ${s.backupSolution || 'To be documented'}`
      ).join('\n')
    : 'To be documented — Add critical IT systems in configurator (Section 5)';

  // Fournisseurs critiques
  const statusLabelFR = (s: string) => s === 'PRET' ? '✅ Prêt' : s === 'PARTIEL' ? '⚠️ Partiel' : '🔴 À confirmer';
  const statusLabelEN = (s: string) => s === 'PRET' ? '✅ Ready' : s === 'PARTIEL' ? '⚠️ Partial' : '🔴 To confirm';

  const criticalSuppliersFR = (cfg.criticalSuppliers || []).length > 0
    ? (cfg.criticalSuppliers || []).map((s: any) =>
        `${s.name || 'N/D'} | ${s.service || 'N/D'} | ${s.tolerance || 'N/D'} | ${s.preventiveMeasure || 'À documenter'} | ${s.backupSolution || 'À documenter'} | ${s.activationDelay || 'N/D'} | ${statusLabelFR(s.status || 'A_CONFIRMER')}`
      ).join('\n')
    : 'À documenter — Ajouter les fournisseurs critiques dans le configurateur (Section 5)';

  const criticalSuppliersEN = (cfg.criticalSuppliers || []).length > 0
    ? (cfg.criticalSuppliers || []).map((s: any) =>
        `${s.name || 'N/A'} | ${s.service || 'N/A'} | ${s.tolerance || 'N/A'} | ${s.preventiveMeasure || 'To be documented'} | ${s.backupSolution || 'To be documented'} | ${s.activationDelay || 'N/A'} | ${statusLabelEN(s.status || 'A_CONFIRMER')}`
      ).join('\n')
    : 'To be documented — Add critical suppliers in configurator (Section 5)';

  const resourcesTableFR = sortedServices.length > 0
    ? sortedServices.map((s: any) =>
        `Personnel | ${s.resourcePersonnel || 'À documenter'} | ${s.name || 'À documenter'} | Minimum requis selon RTO ${s.rto || 'N/D'}`
      ).join('\n')
    : 'Personnel | À documenter | À documenter | À documenter selon le BIA\nTI | Applications critiques | À documenter | Selon RTO défini\nFournisseurs | À documenter | À documenter | À documenter';

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
Une priorité P1 signifie que l'activité doit faire l'objet d'une attention immédiate lors d'une interruption. La priorité ne signifie pas nécessairement que l'activité doit être pleinement rétablie : le PCA peut viser d'abord un niveau minimal de service, puis une remontée progressive de capacité.

${criticalServices.length > 0 ? `PROFIL TEMPOREL DES IMPACTS
ACTIVITÉ | 0-4 h | 4-8 h | 8-24 h | 24-48 h | 48-72 h | > 72 h | SEUIL CRITIQUE
─────────────────────────────────────────────────────────────────────
${criticalServices.map((s: any) => {
  const rtoHours = s.rto === '1h' ? 1 : s.rto === '4h' ? 4 : s.rto === '8h' ? 8 : s.rto === '24h' ? 24 : s.rto === '48h' ? 48 : 72;
  return `${(s.name || 'Activité').substring(0, 30)} | ${rtoHours <= 4 ? 'Important' : 'Faible'} | ${rtoHours <= 8 ? 'Critique' : 'Modéré'} | ${rtoHours <= 24 ? 'Critique' : 'Important'} | Critique | Critique | Critique | ${s.mad || 'À définir'}`;
}).join('\n')}` : ''}`,
      },
            {
        id: 'm4_s3',
        title: 'Ressources critiques identifiées',
        content: `Une activité ne peut être reprise uniquement parce qu'un responsable est disponible. Il faut identifier les ressources minimales qui rendent réellement possible son fonctionnement.

CATÉGORIE | RESSOURCE CRITIQUE | ACTIVITÉS DÉPENDANTES | EXIGENCE MINIMALE
─────────────────────────────────────────────────────────────────────
${resourcesTableFR}
─────────────────────────────────────────────────────────────────────
Installations | ${cfg.alternativeSiteAddress ? `Site alternatif disponible : ${cfg.alternativeSiteAddress}` : 'Site alternatif : À identifier'} | Toutes les activités en cas de perte de site | Minimum capacité définie au BIA
─────────────────────────────────────────────────────────────────────
Énergie | ${cfg.generator ? 'Génératrice disponible' : 'Génératrice : Non disponible'} | Activités nécessitant alimentation électrique | ${cfg.generator ? 'Charges prioritaires à documenter' : 'Solution de relève à prévoir'}
─────────────────────────────────────────────────────────────────────
Données / TI | Sauvegardes hors site : ${cfg.offSiteBackup ? 'Disponibles' : 'Non disponibles'} | Toutes les activités TI | RPO défini par activité au BIA

${biaFichesFR ? `\nFICHES DE RESSOURCES CRITIQUES PAR ACTIVITÉ\n${biaFichesFR}` : ''}`,
      },
      {
        id: 'm4_s4',
        title: 'Analyse des dépendances et écarts',
        content: `L'analyse des dépendances identifie les ressources dont l'indisponibilité compromet directement l'atteinte des objectifs de continuité.

ACTIVITÉ CRITIQUE | DÉPENDANCE | SOLUTION DE RELÈVE | LACUNE IDENTIFIÉE | NIVEAU | ACTION REQUISE | PROPRIÉTAIRE
─────────────────────────────────────────────────────────────────────
${criticalServices.length > 0
  ? criticalServices.map((s: any) =>
      `${(s.name || 'Activité').substring(0, 25)} | TI / Personnel / Énergie | ${cfg.alternativeSiteAddress || 'À définir'} | Capacité non testée | ${s.legalImpact ? 'Critique' : 'Élevée'} | Valider par exercice | Coordonnateur PCA`
    ).join('\n')
  : 'À compléter une fois les services critiques définis dans le configurateur PCA'}

TRAITEMENT DES ÉCARTS
- Accepter formellement l'écart lorsque le risque résiduel est jugé tolérable par l'autorité appropriée
- Réduire l'écart par une nouvelle stratégie, une redondance, une formation, un contrat, un stock ou un investissement
- Transférer une partie du risque lorsque cela est possible, notamment par contrat ou assurance
- Mettre en place une mesure compensatoire temporaire en attendant une solution permanente
- Tester la capacité lorsque l'écart résulte d'une stratégie existante mais non démontrée

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
${biaTableEN}`,
      },
      {
        id: 'm4_s3',
        title: 'Critical resources identified',
        content: `CATEGORY | CRITICAL RESOURCE | DEPENDENT ACTIVITIES | MINIMUM REQUIREMENT
─────────────────────────────────────────────────────────────────────
Facilities | ${cfg.alternativeSiteAddress ? `Alternate site available: ${cfg.alternativeSiteAddress}` : 'Alternate site: To be identified'} | All activities in case of site loss | Minimum capacity defined in BIA
─────────────────────────────────────────────────────────────────────
Energy | ${cfg.generator ? 'Generator available' : 'Generator: Not available'} | Activities requiring electrical power | ${cfg.generator ? 'Priority loads to be documented' : 'Backup solution to be planned'}
─────────────────────────────────────────────────────────────────────
Data / IT | Off-site backups: ${cfg.offSiteBackup ? 'Available' : 'Not available'} | All IT-dependent activities | RPO defined per activity in BIA`,
      },
      {
        id: 'm4_s4',
        title: 'Dependencies and gap analysis',
        content: `BIA APPROVAL
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
  const strategiesFR: string[] = [];
  const strategiesEN: string[] = [];

  if (cfg.teleworkPossible === 'Oui') { strategiesFR.push('✓ Télétravail généralisé possible'); strategiesEN.push('✓ Full telework possible'); }
  if (cfg.teleworkPossible === 'Partiel') { strategiesFR.push('◐ Télétravail partiel possible'); strategiesEN.push('◐ Partial telework possible'); }
  if (cfg.alternativeSite) { strategiesFR.push(`✓ Site alternatif disponible${cfg.alternativeSiteAddress ? ` : ${cfg.alternativeSiteAddress}` : ''}`); strategiesEN.push(`✓ Alternate site available${cfg.alternativeSiteAddress ? `: ${cfg.alternativeSiteAddress}` : ''}`); }
  if (cfg.sharingAgreement) { strategiesFR.push('✓ Entente de partage de locaux en place'); strategiesEN.push('✓ Premises sharing agreement in place'); }
  if (cfg.itRedundancy) { strategiesFR.push('✓ Relève ou redondance des systèmes informatiques'); strategiesEN.push('✓ IT redundancy or backup systems'); }
  if (cfg.offSiteBackup) { strategiesFR.push(`✓ Sauvegardes hors site disponibles${cfg.backupFrequency ? ` (${cfg.backupFrequency})` : ''}`); strategiesEN.push(`✓ Off-site backups available${cfg.backupFrequency ? ` (${cfg.backupFrequency})` : ''}`); }
  if (cfg.crossTraining) { strategiesFR.push('✓ Formation croisée des employés en place'); strategiesEN.push('✓ Employee cross-training in place'); }
  if (cfg.processDocumented) { strategiesFR.push('✓ Processus clés documentés et accessibles'); strategiesEN.push('✓ Key processes documented and accessible'); }
  if (cfg.tempStaffAccess) { strategiesFR.push('✓ Accès à du personnel temporaire (agences de placement)'); strategiesEN.push('✓ Access to temporary staff (staffing agencies)'); }
  if (cfg.alternativeSuppliers) { strategiesFR.push('✓ Fournisseurs alternatifs identifiés'); strategiesEN.push('✓ Alternative suppliers identified'); }
  if (cfg.safetyStock) { strategiesFR.push(`✓ Stock de sécurité maintenu${cfg.safetyStockDuration ? ` (${cfg.safetyStockDuration})` : ''}`); strategiesEN.push(`✓ Safety stock maintained${cfg.safetyStockDuration ? ` (${cfg.safetyStockDuration})` : ''}`); }
  if (cfg.generator) { strategiesFR.push('✓ Génératrice de secours disponible'); strategiesEN.push('✓ Backup generator available'); }
  if (cfg.ups) { strategiesFR.push('✓ Alimentation sans coupure (UPS) installée'); strategiesEN.push('✓ Uninterruptible power supply (UPS) installed'); }

  const assurancesFR: string[] = [];
  if (cfg.insuranceBI) assurancesFR.push('✓ Assurance interruption des affaires');
  if (cfg.insuranceProperty) assurancesFR.push('✓ Assurance dommages matériels');
  if (cfg.insuranceCyber) assurancesFR.push('✓ Assurance cyber');

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
Télétravail | ${cfg.teleworkPossible || 'Non documenté'} | ${cfg.teleworkPossible === 'Oui' ? 'Applicable à toutes les fonctions supportées par les systèmes TI' : cfg.teleworkPossible === 'Partiel' ? 'Applicable aux fonctions administratives et de service' : 'À évaluer selon les fonctions'} | Fonctions pouvant être exercées à distance
─────────────────────────────────────────────────────────────────────
Site alternatif | ${cfg.alternativeSite ? 'Disponible' : 'Non disponible'} | ${cfg.alternativeSiteAddress || 'À définir'} | Fonctions nécessitant un lieu physique
─────────────────────────────────────────────────────────────────────
Entente de partage | ${cfg.sharingAgreement ? 'En place' : 'Non disponible'} | À documenter avec l'organisation partenaire | Selon entente
─────────────────────────────────────────────────────────────────────
Procédures d'urgence | Lien PMU/PSI | ${cfg.linkedPmuId ? 'PMU/PSI lié — voir document' : 'Créer un PMU/PSI complémentaire'} | Évacuation, sécurité des personnes`,
      },
      {
        id: 'm5_s3',
        title: 'Stratégies par conséquence — Perte des systèmes TI',
        content: `CONSÉQUENCE : Perte des systèmes informatiques et de communication

STRATÉGIE | DISPONIBILITÉ | DÉTAILS
─────────────────────────────────────────────────────────────────────
Relève / redondance TI | ${cfg.itRedundancy ? 'Disponible' : 'Non disponible'} | ${cfg.itRedundancy ? 'Systèmes de relève opérationnels — RTO à valider' : 'Solution de relève à prévoir'}
─────────────────────────────────────────────────────────────────────
Sauvegardes hors site | ${cfg.offSiteBackup ? 'Disponibles' : 'Non disponibles'} | ${cfg.offSiteBackup ? `Fréquence : ${cfg.backupFrequency || 'À documenter'} — RPO à valider par activité` : 'Sauvegardes hors site à mettre en place'}
─────────────────────────────────────────────────────────────────────
Procédures manuelles | ${cfg.processDocumented ? 'Documentées' : 'À documenter'} | ${cfg.processDocumented ? 'Procédures manuelles disponibles pour les activités critiques' : 'À documenter pour chaque activité critique'}
─────────────────────────────────────────────────────────────────────
Accès mobiles / alternatifs | À confirmer | Téléphones mobiles, connexions cellulaires, accès VPN | Fonctions critiques en mode dégradé

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
Formation croisée | ${cfg.crossTraining ? 'En place' : 'À mettre en place'} | ${cfg.crossTraining ? 'Employés formés pour assumer les fonctions critiques de leurs collègues' : 'Former les remplaçants pour les postes critiques identifiés au BIA'}
─────────────────────────────────────────────────────────────────────
Documentation des processus | ${cfg.processDocumented ? 'Disponible' : 'À compléter'} | ${cfg.processDocumented ? 'Procédures opérationnelles documentées et accessibles' : 'Documenter les processus critiques concentrés chez les employés clés'}
─────────────────────────────────────────────────────────────────────
Personnel temporaire | ${cfg.tempStaffAccess ? 'Accessible' : 'À prévoir'} | ${cfg.tempStaffAccess ? 'Ententes avec agences de placement — contacts à jour' : 'Identifier des agences de placement spécialisées'}
─────────────────────────────────────────────────────────────────────
Seuil d'activation absentéisme | ${cfg.absenteeismThreshold ? (cfg.absenteeismThreshold === 'cle' ? 'Perte d\'un employé clé' : `≥ ${cfg.absenteeismThreshold}% du personnel absent`) : 'Non défini'} | ${cfg.absenteeismThreshold ? 'Déclenche la procédure PC013 — Pandémie / absentéisme massif' : 'À définir dans le configurateur PCA (Section 5)'}

CONSÉQUENCE : Interruption d'un fournisseur ou partenaire critique

STRATÉGIE | DISPONIBILITÉ | DÉTAILS
─────────────────────────────────────────────────────────────────────
Fournisseurs alternatifs | ${cfg.alternativeSuppliers ? 'Identifiés' : 'À identifier'} | ${cfg.alternativeSuppliers ? 'Fournisseurs de remplacement confirmés pour les approvisionnements critiques' : 'Identifier et valider des fournisseurs alternatifs pour chaque intrant critique'}
─────────────────────────────────────────────────────────────────────
Stock de sécurité | ${cfg.safetyStock ? 'Maintenu' : 'Non disponible'} | ${cfg.safetyStock ? `Durée : ${cfg.safetyStockDuration || 'À documenter'} — Niveau minimal à maintenir` : 'Évaluer la faisabilité d\'un stock tampon pour les intrants critiques'}

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
Génératrice de secours | ${cfg.generator ? 'Disponible' : 'Non disponible'} | ${cfg.generator ? 'Génératrice opérationnelle — autonomie et charges prioritaires à documenter et tester' : 'Évaluer l\'acquisition ou la location d\'une génératrice selon les activités critiques'}
─────────────────────────────────────────────────────────────────────
Alimentation sans coupure (UPS) | ${cfg.ups ? 'Installée' : 'Non installée'} | ${cfg.ups ? 'UPS protège les équipements TI critiques — autonomie à valider' : 'Prévoir des UPS pour les équipements TI prioritaires'}
─────────────────────────────────────────────────────────────────────
Contact utilitaires d'urgence | Hydro-Québec pannes : 1 800 790-2424 | Établir un contact prioritaire en cas de panne prolongée | Toutes les activités

COUVERTURE D'ASSURANCE
COUVERTURE | DISPONIBILITÉ | DERNIÈRE RÉVISION
─────────────────────────────────────────────────────────────────────
Assurance interruption des affaires | ${cfg.insuranceBI ? 'En place' : 'Non documentée'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA') : 'À vérifier'}
─────────────────────────────────────────────────────────────────────
Assurance dommages matériels | ${cfg.insuranceProperty ? 'En place' : 'Non documentée'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA') : 'À vérifier'}
─────────────────────────────────────────────────────────────────────
Assurance cyber | ${cfg.insuranceCyber ? 'En place' : 'Non documentée'} | ${cfg.insuranceLastReview ? new Date(cfg.insuranceLastReview).toLocaleDateString('fr-CA') : 'À vérifier'}

⚠️ L'assurance complète mais ne remplace pas le PCA. Même avec une couverture adéquate, l'organisation doit démontrer sa capacité à maintenir ou reprendre ses activités essentielles.

PROCÉDURES DE CONTINUITÉ ACTIVÉES
Les procédures suivantes sont intégrées au présent PCA en fonction des scénarios de risque identifiés :
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
        content: `Continuity strategies are solutions prepared in advance to maintain essential activities when usual resources become unavailable. They flow directly from the BIA results (Chapter 4) and vulnerabilities identified in the risk assessment (Chapter 3).

STRATEGIES BY CONSEQUENCE TYPE
1. Loss of premises access → Relocation, telework, alternate site
2. Loss of IT and communications → IT redundancy, manual procedures, remote access
3. Absenteeism / loss of key personnel → Cross-training, temporary staff, documentation
4. Critical supplier disruption → Alternative suppliers, safety stock, substitution
5. Loss of essential resources → Generator, UPS, backup equipment`,
      },
      {
        id: 'm5_s2',
        title: 'Strategies summary',
        content: `STRATEGIES IN PLACE
${strategiesEN.length > 0 ? strategiesEN.join('\n') : '• No strategies documented — Complete configurator Section 5'}

INSURANCE COVERAGE
- Business interruption insurance: ${cfg.insuranceBI ? 'In place' : 'Not documented'}
- Property damage insurance: ${cfg.insuranceProperty ? 'In place' : 'Not documented'}
- Cyber insurance: ${cfg.insuranceCyber ? 'In place' : 'Not documented'}

ACTIVATED CONTINUITY PROCEDURES
${procedureListEN || '• No procedures activated — Complete risk assessment (Section 3)'}`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 6 — COMMUNICATION DE CRISE
  // ══════════════════════════════════════════════
  const authoritiesFR = (cfg.authoritiesToNotify || []).length > 0
    ? cfg.authoritiesToNotify.map((a: string) => `• ${a}`).join('\n')
    : '• À documenter selon les scénarios applicables';

  const mobilisationMatrix = `NIVEAU | COORDONNATEUR | CELLULE | EMPLOYÉS | EXTERNE
─────────────────────────────────────────────────────────────────────
1 - Local | Informé si évolution possible | Non, sauf besoin spécialisé | Équipe locale seulement | Généralement non
─────────────────────────────────────────────────────────────────────
2 - Majeur | Mobilisé | Partielle — fonctions touchées | Employés concernés / gestionnaires | Clients ou partenaires touchés selon besoin
─────────────────────────────────────────────────────────────────────
3 - Crise | Mobilisé immédiatement | Complète + direction | Communication organisationnelle | Clients prioritaires, fournisseurs, autorités et médias selon situation`;

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
- Système d'alerte de masse : ${cfg.massAlertSystem ? 'Disponible' : 'Non disponible'}
- Canal de communication externe : ${cfg.externalChannel || 'À définir'}`,
      },
      {
        id: 'm6_s2',
        title: 'Processus d\'alerte et de mobilisation',
        content: `ÉTAPE 1 — DÉTECTION ET ÉVALUATION INITIALE
Tout employé ayant connaissance d'un incident potentiellement significatif doit en aviser son gestionnaire immédiat. Le gestionnaire évalue le niveau d'incident selon la grille du chapitre 3 et détermine si une escalade vers le coordonnateur PCA est requise.

ÉTAPE 2 — NOTIFICATION DU COORDONNATEUR PCA
Pour un incident de niveau 2 ou 3, le coordonnateur PCA est contacté immédiatement.
- Coordonnateur PCA : ${coordName || 'À désigner'} — Tél. : ${coordPhone}
- Si injoignable, substitut : ${substName || 'À désigner'} — Tél. : ${substPhone}

ÉTAPE 3 — DÉCISION D'ACTIVATION
Le coordonnateur confirme le niveau, déclare l'activation partielle ou complète selon les critères du chapitre 7 et ouvre le journal de bord.

ÉTAPE 4 — MOBILISATION DE LA CELLULE
Les membres requis sont convoqués selon la nature de l'incident.
- Lieu de coordination : ${cfg.coordinationLocation || 'À définir'}
- Pont téléphonique : ${cfg.emergencyBridge || 'À définir'}
- Mode virtuel de relève disponible si le site est inaccessible

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
Fréquence de surveillance : Continue lors d'une activation de niveau 2 ou 3
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

FRÉQUENCE DES COMMUNICATIONS SELON LE NIVEAU
- Niveau 1 : Communication au besoin — Gestionnaire local
- Niveau 2 : Mise à jour toutes les 2 à 4 heures — Coordonnateur PCA + parties touchées
- Niveau 3 : Mise à jour toutes les heures en phase aiguë — Cellule complète + direction`,
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
        title: 'Communication principles',
        content: `Crisis communication must be fast, accurate, consistent and tailored to the target audience.

KEY RESPONSIBILITIES
- Designated spokesperson: ${cfg.spokesperson || 'To be designated'}
- Social media monitoring: ${cfg.socialMediaMonitor || 'To be designated'}
- Primary internal channel: ${cfg.internalChannel || 'To be defined'}
- Mass alert system: ${cfg.massAlertSystem ? 'Available' : 'Not available'}
- Primary external channel: ${cfg.externalChannel || 'To be defined'}`,
      },
      {
        id: 'm6_s2',
        title: 'Alert and mobilization process',
        content: `STEP 1 — DETECTION AND INITIAL ASSESSMENT
Any employee aware of a potentially significant incident must notify their immediate manager.

STEP 2 — BCP COORDINATOR NOTIFICATION
- BCP Coordinator: ${coordName || 'To be designated'} — Phone: ${coordPhone}
- If unavailable, alternate: ${substName || 'To be designated'} — Phone: ${substPhone}

STEP 3 — ACTIVATION DECISION
Coordinator confirms level, declares partial or full activation and opens incident log.

STEP 4 — TEAM MOBILIZATION
- Coordination location: ${cfg.coordinationLocation || 'To be defined'}
- Conference bridge: ${cfg.emergencyBridge || 'To be defined'}

MOBILIZATION MATRIX BY LEVEL
Level 1 - Local: Coordinator informed if escalation possible | No team | Local staff only | Generally no
Level 2 - Major: Coordinator mobilized | Partial — affected functions | Concerned employees/managers | Affected clients or partners
Level 3 - Crisis: Immediately mobilized | Full + management | Org-wide communication | Priority clients, suppliers, authorities, media`,
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
  ? cellMembers.map((m: any) => `${m.role || 'Member'}: ${m.firstName || ''} ${m.lastName || ''}\n  Phone: ${m.phone || 'To be completed'} | Email: ${m.email || 'To be completed'}`).join('\n\n')
  : 'Team members: To be documented in BCP configurator (Section 2)'}

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

APPROVED COMMUNICATION LINE
${cfg.mediaContact || 'To be documented — Define management-approved messaging for external communications during an incident.'}`,
      },
    ],
  };

  // ══════════════════════════════════════════════
  // MODULE 7 — ACTIVATION ET PROCÉDURES DE REPRISE
  // ══════════════════════════════════════════════
  const resumptionSeq = criticalServices.length > 0
    ? criticalServices
        .sort((a: any, b: any) => {
          const order: Record<string, number> = { '1h': 1, '4h': 2, '8h': 3, '24h': 4, '48h': 5, '72h': 6, '1sem': 7, 'plus': 8 };
          return (order[a.rto] || 9) - (order[b.rto] || 9);
        })
        .map((s: any, i: number) => `${i + 1} | ${s.name || `Service ${i + 1}`} | ${s.rto || 'N/D'} | ${s.minServiceLevel || 'À définir'} | À désigner`)
        .join('\n')
    : '1 | À définir une fois le BIA complété (chapitre 4) | — | — | —';

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

SEUILS INDICATIFS D'ACTIVATION PAR TYPE D'INCIDENT
TYPE D'INCIDENT | SEUIL INDICATIF DE NIVEAU 2 | SEUIL INDICATIF DE NIVEAU 3
─────────────────────────────────────────────────────────────────────
Perte de site / bâtiment | Accès impossible > 4 heures | Perte confirmée > 24 heures ou irrémédiable
─────────────────────────────────────────────────────────────────────
Perte systèmes TI | Système critique indisponible > 2 heures | Multisystèmes ou données compromises / RTO menacé
─────────────────────────────────────────────────────────────────────
Absentéisme | > 25 % du personnel ou poste clé critique | > 40 % ou plusieurs postes clés simultanément
─────────────────────────────────────────────────────────────────────
Panne électrique | > 4 heures et génératrice insuffisante | > 8 heures ou RTO critique menacé
─────────────────────────────────────────────────────────────────────
Fournisseur critique | Incapable de respecter délais minimaux | Rupture totale sans alternative confirmée`,
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
Plateforme de collaboration infonuagique avec authentification renforcée — accès possible hors réseau interne

LIEN AVEC LE PMU / PSI
${cfg.linkedPmuId
  ? 'Ce PCA est lié à un Plan de mesures d\'urgence (PMU/PSI) existant. Les procédures d\'évacuation, de sécurisation du bâtiment et d\'intervention immédiate sont couvertes par ce plan complémentaire. La cellule PCA prend le relais une fois la phase d\'urgence immédiate stabilisée.'
  : 'Aucun PMU/PSI lié pour ce bâtiment. Il est recommandé de créer un PMU ou PSI complémentaire qui couvrira les procédures d\'évacuation et d\'intervention immédiate. Le PCA prend le relais une fois l\'urgence immédiate stabilisée.'}`,
      },
      {
        id: 'm7_s3',
        title: 'Liste de vérification d\'activation',
        content: `La liste de vérification doit être complétée lors de chaque activation du PCA. Conserver une copie papier accessible en tout temps.

DATE D'ACTIVATION : _______________  HEURE : _______________
TYPE D'INCIDENT : _______________________________________________
NIVEAU D'INCIDENT : ☐ Niveau 1  ☐ Niveau 2  ☐ Niveau 3
ACTIVÉ PAR : ___________________________________________________

PHASE 1 — ÉVALUATION IMMÉDIATE (0-30 minutes)
☐ Incident détecté et évalué — faits confirmés par une source responsable
☐ Niveau d'incident déterminé selon la grille du chapitre 3
☐ Coordonnateur PCA contacté — heure : _______________
☐ Sécurité des personnes vérifiée
☐ Autorités d'urgence contactées si requis (9-1-1)

PHASE 2 — MOBILISATION (30-60 minutes)
☐ Cellule de gestion d'incident convoquée selon le niveau
☐ Lieu de coordination établi : ${cfg.coordinationLocation || '_______________'}
☐ Pont téléphonique activé : ${cfg.emergencyBridge || '_______________'}
☐ Journal de bord d'incident ouvert
☐ Coordonnateur PCA : ${coordName || '_______________'} — Confirmé présent / joint
☐ Substitut : ${substName || '_______________'} — Informé / en attente
${cellMembers.slice(0, 5).map((m: any) => `☐ ${m.firstName || ''} ${m.lastName || ''} (${m.role || 'Membre'}) — Tél. : ${m.phone || 'À compléter'}`).join('\n')}

PHASE 3 — ACTIVATION DES STRATÉGIES (1-4 heures)
☐ Situation commune établie avec la cellule — activités touchées et RTO menacés identifiés
☐ Stratégies de continuité activées selon le type d'incident
${criticalServices.slice(0, 5).map((s: any, i: number) => `☐ ${s.name || `Service ${i + 1}`} — RTO : ${s.rto || 'N/D'} — Statut : _______________`).join('\n')}
☐ Site alternatif activé si requis : ${cfg.alternativeSiteAddress || 'N/A'}
☐ Télétravail activé si applicable : ${cfg.teleworkPossible || 'N/A'}
☐ Fournisseurs alternatifs contactés si requis

PHASE 4 — COMMUNICATION (dans les 2 premières heures)
☐ Communication interne envoyée via ${cfg.internalChannel || 'canal désigné'}
☐ Clients prioritaires avisés selon la liste du chapitre 6
☐ Autorités réglementaires avisées si applicable
☐ Communication externe approuvée par ${cfg.spokesperson || 'porte-parole désigné'}
☐ Assureur avisé si sinistre déclaré

PHASE 5 — SUIVI ET DOCUMENTATION
☐ Journal de bord mis à jour en continu
☐ Rapports de situation (SITREP) envoyés — fréquence : toutes les 2-4 heures (niveau 2) ou toutes les heures (niveau 3)
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
- Les activités P1 (RTO le plus court) sont rétablies en premier, indépendamment de la difficulté
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
PC004 | Rapport de situation (SITREP) | Toutes les 2-4 heures en activation | Coordonnateur PCA
─────────────────────────────────────────────────────────────────────
PC005 | Rapport post-incident et leçons apprises | Dans les 72 heures suivant la clôture | Coordonnateur PCA
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
        content: `${cfg.activationCriteria || `The BCP is activated by the BCP Coordinator or senior management when one or more of the following conditions are met:
- A critical activity's RTO is at risk of being exceeded
- A Level 2 or 3 incident is declared according to the Chapter 3 grid
- A critical resource is unavailable and no immediate alternative can be applied within the required timeframe
- Public authorities issue a directive affecting the organization's operational capacity`}

ACTIVATION AUTHORITY
- Primary decision: ${coordName || 'BCP Coordinator'} — according to criteria and delegation
- If unavailable: ${substName || 'Designated alternate'} assumes the role`,
      },
      {
        id: 'm7_s2',
        title: 'Coordination locations and means',
        content: `PRIMARY COORDINATION SITE: ${ctx.buildingAddress || 'To be documented'}
ALTERNATE COORDINATION SITE: ${cfg.coordinationLocation || 'To be defined'}
EMERGENCY CONFERENCE BRIDGE: ${cfg.emergencyBridge || 'To be defined'}

LINK WITH ERP / FSP
${cfg.linkedPmuId
  ? 'This BCP is linked to an existing Emergency Response Plan (ERP/FSP). Evacuation, building security and immediate response procedures are covered by that complementary plan.'
  : 'No ERP/FSP linked. It is recommended to create a complementary ERP or FSP covering evacuation and immediate response procedures.'}`,
      },
      {
        id: 'm7_s3',
        title: 'Activation checklist',
        content: `PHASE 1 — IMMEDIATE ASSESSMENT (0-30 minutes)
☐ Incident detected and assessed — facts confirmed by responsible source
☐ Incident level determined per Chapter 3 grid
☐ BCP Coordinator contacted — time: _______________
☐ Personnel safety verified
☐ Emergency services contacted if required (9-1-1)

PHASE 2 — MOBILIZATION (30-60 minutes)
☐ Incident management team convened per incident level
☐ Coordination location established: ${cfg.coordinationLocation || '_______________'}
☐ Conference bridge activated: ${cfg.emergencyBridge || '_______________'}
☐ Incident log opened

PHASE 3 — STRATEGY ACTIVATION (1-4 hours)
☐ Common operating picture established with team
☐ Continuity strategies activated per incident type
☐ Alternate site activated if required: ${cfg.alternativeSiteAddress || 'N/A'}

PHASE 6 — RETURN TO NORMAL
☐ Stabilization criteria met
☐ Temporary measures removed in controlled manner
☐ Recovery communication approved and distributed
☐ Deactivation time recorded: _______________
☐ Post-incident report initiated`,
      },
      {
        id: 'm7_s4',
        title: 'Activity recovery sequence',
        content: `PRIORITY | ACTIVITY / SERVICE | RTO | MINIMUM LEVEL | OWNER
─────────────────────────────────────────────────────────────────────
${criticalServices.length > 0
  ? criticalServices
      .sort((a: any, b: any) => {
        const order: Record<string, number> = { '1h': 1, '4h': 2, '8h': 3, '24h': 4, '48h': 5, '72h': 6, '1sem': 7, 'plus': 8 };
        return (order[a.rto] || 9) - (order[b.rto] || 9);
      })
      .map((s: any, i: number) => `${i + 1} | ${s.name || `Service ${i + 1}`} | ${s.rto || 'N/A'} | ${s.minServiceLevel || 'To be defined'} | To be designated`)
      .join('\n')
  : '1 | To be defined once BIA is completed (Chapter 4) | — | — | —'}`,
      },
      {
        id: 'm7_s5',
        title: 'Continuity procedures by scenario',
        content: `CODE | PROCEDURE | PRIMARY TRIGGER | OWNER
─────────────────────────────────────────────────────────────────────
PC001 | BCP Activation | Section 7.1 criteria met | BCP Coordinator
PC002 | Incident Management Team Activation | Level 2 or 3 declared | BCP Coordinator
PC003 | Incident Log | Upon BCP activation | Coordinator / Log keeper
PC004 | Situation Report (SITREP) | Every 2-4 hours during activation | BCP Coordinator
PC005 | Post-Incident Report and Lessons Learned | Within 72h of closure | BCP Coordinator
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
Exercice formatif / discussion | Parcourir le PCA, clarifier les rôles et identifier les lacunes | Responsables PCA et fonctions concernées | ${cfg.exerciseFormative || 'Annuel'} | Contacts, responsabilités, procédures, documents
─────────────────────────────────────────────────────────────────────
Exercice sur table | Simuler un scénario et faire prendre les décisions par les participants | Cellule de gestion d'incident | ${cfg.exerciseTable || 'Annuel'} | Activation, BIA, stratégies, communications, SITREP
─────────────────────────────────────────────────────────────────────
Test TI / essai technique | Démontrer une capacité technologique précise | TI + fournisseurs + utilisateurs clés | ${cfg.exerciseIT || 'Annuel'} | Restauration, RPO/RTO réels, accès distant, télécommunications
─────────────────────────────────────────────────────────────────────
Test fonctionnel | Faire fonctionner une activité en mode de continuité | Équipe opérationnelle concernée | Selon programme | Mode manuel, télétravail, fournisseur secondaire
─────────────────────────────────────────────────────────────────────
Simulation en temps réel | Déployer plusieurs ressources et fonctions dans des conditions réalistes | Cellule + équipes opérationnelles | ${cfg.exerciseSimulation || 'Tous les 3 ans'} | Mobilisation, site de relève, coordination, reprise

⚠️ RAPPEL FONDAMENTAL
La capacité d'une entreprise à maintenir ses activités ne peut être démontrée tant que son plan de continuité des activités n'a pas été exercé. — Guide de gestion de la continuité des activités, Gouvernement du Québec`,
      },
      {
        id: 'm8_s2',
        title: 'Responsable de la mise à jour',
        content: `RESPONSABLE DU PLAN | ${cfg.planOwner || coordName || 'À désigner'}
─────────────────────────────────────────────────────────────────────
SUBSTITUT | ${substName || 'À désigner'}
FRÉQUENCE DE RÉVISION GÉNÉRALE | ${cfg.reviewFrequency || 'Au minimum annuelle'}
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
        content: `Le rapport post-incident doit être complété dans les 72 heures suivant la résolution de l'incident. Il sert à documenter les leçons apprises et améliorer le PCA.

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
Activation PCA | Décision ≤ 30 min | _____ | _____ | Atteint / Partiel / Non atteint
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
        content: `The exercise program must progress from simple to complex and cover, over a reasonable cycle, the main activities, strategies, roles and dependencies of the BCP.

TYPE | OBJECTIVE | PARTICIPANTS | FREQUENCY
─────────────────────────────────────────────────────────────────────
Discussion / tabletop exercise | Review BCP, clarify roles, identify gaps | BCP managers and concerned functions | ${cfg.exerciseFormative || 'Annual'}
─────────────────────────────────────────────────────────────────────
Tabletop exercise | Simulate scenario and have participants make decisions | Incident management team | ${cfg.exerciseTable || 'Annual'}
─────────────────────────────────────────────────────────────────────
IT / technical test | Demonstrate a specific technological capability | IT + suppliers + key users | ${cfg.exerciseIT || 'Annual'}
─────────────────────────────────────────────────────────────────────
Full simulation | Deploy multiple resources and functions in realistic conditions | Team + operational staff | ${cfg.exerciseSimulation || 'Every 3 years'}

⚠️ FUNDAMENTAL REMINDER
An organization's ability to maintain its activities cannot be demonstrated until its business continuity plan has been exercised. — Government of Quebec Business Continuity Management Guide`,
      },
      {
        id: 'm8_s2',
        title: 'Plan owner and review schedule',
        content: `PLAN OWNER | ${cfg.planOwner || coordName || 'To be designated'}
ALTERNATE | ${substName || 'To be designated'}
GENERAL REVIEW FREQUENCY | ${cfg.reviewFrequency || 'At minimum annual'}
NEXT SCHEDULED REVIEW | ${cfg.nextReviewDate ? new Date(cfg.nextReviewDate).toLocaleDateString('en-CA') : 'To be scheduled'}
APPROVER | Senior Management`,
      },
      {
        id: 'm8_s3',
        title: 'Update program',
        content: `BCP COMPONENTS AND RECOMMENDED REVIEW CYCLES
- Business Impact Analysis (BIA) — Full analysis: Upon significant changes to products, services and activities
- Business Impact Analysis (BIA) — Resource needs: Annual or upon significant changes
- Risk Assessment (ARA): Upon significant changes — Always consider climate change evolution
- Continuity strategies: Annual or upon significant changes
- Response structure — Roles and responsibilities: Annual
- Response structure — Member contact information: As needed
- Response structure — Alert and mobilization process: Annual
- BCP — Continuity activities: Annual
- Exercise program: Annual`,
      },
      {
        id: 'm8_s4',
        title: 'Exercise log',
        content: `DATE | TYPE | SCENARIO / CAPABILITY | PARTICIPANTS | RESULT | GAPS | ACTIONS / REFERENCE
─────────────────────────────────────────────────────────────────────
[First exercise to be scheduled] | ${cfg.exerciseTable || 'Tabletop'} | To be defined | Incident management team | To be conducted | — | —`,
      },
      {
        id: 'm8_s5',
        title: 'Incident log',
        content: `DATE | INCIDENT | IMPACT | BCP ACTIVATED | LEVEL | MAIN ACTIONS | LESSONS / REPORT
─────────────────────────────────────────────────────────────────────
[To be completed upon first incident] | — | — | — | — | — | —`,
      },
      {
        id: 'm8_s6',
        title: 'Post-incident report structure',
        content: `POST-INCIDENT REPORT STRUCTURE
1. Executive summary — Concise description of the event, impacts, response and final status.
2. Timeline — Key milestones from detection to deactivation.
3. BCP performance — Activation, mobilization, communications, strategies and procedures used.
4. Activity performance — Actual RTOs, service levels achieved, backlog and degraded mode duration.
5. Dependencies and suppliers — Behavior of critical internal and external resources.
6. Health, safety and compliance — Relevant elements and notification obligations, where applicable.
7. Strengths — Capabilities that worked as planned or better than expected.
8. Gaps and causes — Observed deficiencies, invalidated assumptions and contributing factors.
9. Corrective actions — Action, priority, owner, deadline and expected evidence.
10. BCP changes — Sections, procedures, data or strategies requiring revision.`,
      },
      {
        id: 'm8_s7',
        title: 'Continuous improvement plan',
        content: `ID | SOURCE | GAP / FINDING | PRIORITY | ACTION | OWNER | DEADLINE | EVIDENCE / STATUS
─────────────────────────────────────────────────────────────────────
AC-${year}-01 | [First exercise / incident] | To be documented | To be defined | To be defined | To be designated | To be defined | Open`,
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