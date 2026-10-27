import { diagnosticQuestions } from './config.ts';
import { resolveDiagnosticModules } from './modules.ts';
import { diagnosticAnswerIds, type DiagnosticAnswerId, type DiagnosticDimensionId, type DiagnosticModuleId, type DiagnosticRecommendation, type LocalizedText } from './types.ts';

type Profile = {
  subject: LocalizedText;
  operationalIssue: LocalizedText;
  goodPractice: LocalizedText;
  modules: readonly DiagnosticModuleId[];
  actions: Readonly<Record<DiagnosticAnswerId, LocalizedText>>;
};

const text = (fr: string, en: string): LocalizedText => ({ fr, en });

const profiles: Readonly<Record<DiagnosticDimensionId, Profile>> = {
  D1: {
    subject: text('la centralisation et la mise à jour des informations essentielles des bâtiments', 'the centralization and updating of essential building information'),
    operationalIssue: text('Une information dispersée ou périmée peut ralentir une décision et rendre les interventions incohérentes.', 'Scattered or outdated information can delay decisions and lead to inconsistent response.'),
    goodPractice: text('Maintenir un inventaire documentaire unique, attribuer un responsable et vérifier périodiquement les données critiques.', 'Maintain one document inventory, assign an owner and periodically review critical data.'),
    modules: ['buildings', 'knowledge'],
    actions: {
      A: text('Conserver la cadence de vérification et documenter la date de la prochaine revue.', 'Maintain the review cadence and record the next review date.'),
      B: text('Recenser les sources dispersées et planifier leur consolidation par bâtiment.', 'Inventory scattered sources and plan their consolidation by building.'),
      C: text('Créer un registre priorisé des informations essentielles et désigner un responsable de consolidation.', 'Create a prioritized register of essential information and assign a consolidation owner.'),
      D: text('Identifier le détenteur de chaque source et vérifier où se trouve la version de référence.', 'Identify the owner of each source and verify where the authoritative version is held.'),
      E: text('Documenter pourquoi cette dimension ne s’applique pas et faire valider cette conclusion par le responsable concerné.', 'Document why this dimension does not apply and have the relevant owner validate that conclusion.'),
    },
  },
  D2: {
    subject: text('l’approbation, l’actualité et l’accessibilité des plans et procédures d’urgence', 'the approval, currency and accessibility of emergency plans and procedures'),
    operationalIssue: text('Des plans non approuvés, périmés ou difficiles à trouver peuvent compromettre une réponse cohérente.', 'Unapproved, outdated or hard-to-find plans can compromise a coordinated response.'),
    goodPractice: text('Gouverner chaque document avec un propriétaire, une version approuvée, une date d’effet et une révision planifiée.', 'Govern every document with an owner, approved version, effective date and scheduled review.'),
    modules: ['documents', 'knowledge'],
    actions: {
      A: text('Vérifier les prochaines échéances et tester l’accès à la version approuvée.', 'Review upcoming deadlines and test access to the approved version.'),
      B: text('Lister les documents à mettre à jour et attribuer une échéance à chacun.', 'List documents requiring updates and assign each one a deadline.'),
      C: text('Prioriser l’inventaire, l’approbation et la diffusion contrôlée des plans essentiels.', 'Prioritize the inventory, approval and controlled distribution of essential plans.'),
      D: text('Confirmer le statut d’approbation, la version courante et le responsable de chaque plan.', 'Confirm the approval status, current version and owner of each plan.'),
      E: text('Justifier formellement la non-applicabilité malgré le caractère généralement essentiel de cette dimension.', 'Formally justify non-applicability despite the generally essential nature of this dimension.'),
    },
  },
  D3: {
    subject: text('la formation des équipes d’urgence et la connaissance de leurs responsabilités', 'emergency-team training and awareness of responsibilities'),
    operationalIssue: text('Des rôles mal compris ou sans remplacement peuvent créer des délais et des décisions contradictoires.', 'Poorly understood roles or missing backups can create delays and conflicting decisions.'),
    goodPractice: text('Définir les responsabilités, maintenir les qualifications opérationnelles et prévoir des remplaçants.', 'Define responsibilities, maintain operational qualifications and designate backups.'),
    modules: ['sentinelle', 'exercises-rex-actions'],
    actions: {
      A: text('Maintenir les exercices de rôle et vérifier périodiquement la couverture des remplacements.', 'Maintain role exercises and periodically review backup coverage.'),
      B: text('Cibler les équipes ou sites non couverts et planifier un rattrapage opérationnel.', 'Identify uncovered teams or sites and plan operational catch-up.'),
      C: text('Formaliser les rôles prioritaires, les titulaires et les remplaçants avant le prochain exercice.', 'Formalize priority roles, primary owners and backups before the next exercise.'),
      D: text('Vérifier la liste actuelle des rôles, des responsables et des qualifications opérationnelles.', 'Review the current list of roles, owners and operational qualifications.'),
      E: text('Documenter la justification et vérifier si des responsabilités d’urgence existent néanmoins.', 'Document the rationale and verify whether emergency responsibilities still exist.'),
    },
  },
  D4: {
    subject: text('l’accès rapide aux consignes et informations nécessaires en situation d’urgence', 'rapid access to instructions and information during an emergency'),
    operationalIssue: text('Une coordination improvisée augmente le risque d’actions tardives, incompatibles ou non tracées.', 'Improvised coordination increases the risk of late, conflicting or untraceable action.'),
    goodPractice: text('Préparer des procédures accessibles, une chaîne de commandement explicite et des mécanismes d’escalade testés.', 'Prepare accessible procedures, an explicit command chain and tested escalation mechanisms.'),
    modules: ['incident', 'knowledge', 'ops'],
    actions: {
      A: text('Tester régulièrement l’accès aux consignes et la relève des responsables.', 'Regularly test access to instructions and leadership backup.'),
      B: text('Identifier les événements ou intervenants mal couverts et compléter les consignes correspondantes.', 'Identify poorly covered events or responders and complete the related instructions.'),
      C: text('Établir une chaîne de commandement minimale et rendre les premières consignes immédiatement accessibles.', 'Establish a minimum command chain and make initial instructions immediately accessible.'),
      D: text('Réaliser une vérification ciblée de l’accès aux consignes avec les responsables désignés.', 'Run a targeted check of instruction access with designated leaders.'),
      E: text('Faire confirmer formellement la non-applicabilité, cette dimension étant généralement critique.', 'Obtain formal confirmation of non-applicability because this dimension is generally critical.'),
    },
  },
  D5: {
    subject: text('l’identification des personnes présentes et le suivi de leur mise en sécurité', 'identifying people present and tracking their safety status'),
    operationalIssue: text('Une visibilité incomplète peut retarder le recensement et laisser des personnes sans suivi.', 'Incomplete visibility can delay accountability and leave people without follow-up.'),
    goodPractice: text('Définir une méthode de présence et de recensement couvrant employés, visiteurs et contracteurs, puis la tester.', 'Define and test an occupancy and accountability method covering employees, visitors and contractors.'),
    modules: ['sentinelle', 'incident', 'ops'],
    actions: {
      A: text('Continuer les tests de recensement et vérifier la couverture de toutes les catégories de personnes.', 'Continue accountability tests and verify coverage for every category of people.'),
      B: text('Identifier les catégories non couvertes et adapter le processus de présence et de recensement.', 'Identify uncovered categories and adapt the occupancy and accountability process.'),
      C: text('Définir immédiatement une méthode minimale de présence, de recensement et de signalement des absents.', 'Immediately define a minimum method for occupancy, accountability and reporting missing people.'),
      D: text('Tester un scénario de recensement et mesurer les écarts entre présence attendue et confirmée.', 'Test an accountability scenario and measure gaps between expected and confirmed presence.'),
      E: text('Faire valider la non-applicabilité par le responsable de la sécurité des personnes.', 'Have the person-safety owner validate non-applicability.'),
    },
  },
  D6: {
    subject: text('la mise à l’essai documentée et évaluée des procédures d’urgence', 'documented and evaluated testing of emergency procedures'),
    operationalIssue: text('Une procédure non exercée peut sembler adéquate sans être réellement exécutable sur le terrain.', 'An untested procedure may appear adequate without being executable in practice.'),
    goodPractice: text('Planifier des exercices avec objectifs, observateurs, preuves, retour d’expérience et actions correctives.', 'Plan exercises with objectives, observers, evidence, lessons learned and corrective actions.'),
    modules: ['exercises-rex-actions', 'incident'],
    actions: {
      A: text('Maintenir le calendrier et vérifier la fermeture indépendante des actions correctives.', 'Maintain the schedule and independently verify corrective-action closure.'),
      B: text('Ajouter des objectifs mesurables et une évaluation structurée au prochain exercice.', 'Add measurable objectives and a structured evaluation to the next exercise.'),
      C: text('Planifier un premier exercice ciblé avec objectifs, observateurs et compte rendu.', 'Plan an initial focused exercise with objectives, observers and a report.'),
      D: text('Vérifier les dates, rapports et actions issus des derniers exercices.', 'Verify dates, reports and actions from recent exercises.'),
      E: text('Documenter la justification et confirmer qu’aucune procédure d’urgence ne nécessite d’essai.', 'Document the rationale and confirm that no emergency procedure requires testing.'),
    },
  },
  D7: {
    subject: text('la traçabilité des décisions et actions prises pendant un incident', 'traceability of decisions and actions during an incident'),
    operationalIssue: text('Sans chronologie fiable, il devient difficile de coordonner, prouver et apprendre après un événement.', 'Without a reliable timeline, coordination, evidence and learning after an event become difficult.'),
    goodPractice: text('Conserver un journal horodaté, attribué et protégé qui relie décisions, actions et preuves.', 'Maintain a protected, timestamped and attributed log linking decisions, actions and evidence.'),
    modules: ['incident', 'knowledge'],
    actions: {
      A: text('Vérifier périodiquement l’intégrité, l’accès et l’export du journal.', 'Periodically verify log integrity, access and export.'),
      B: text('Définir une chronologie de référence et réduire la dispersion entre les outils.', 'Define an authoritative timeline and reduce fragmentation across tools.'),
      C: text('Mettre en place un journal minimal horodaté avec responsables et pièces justificatives.', 'Establish a minimum timestamped log with owners and supporting evidence.'),
      D: text('Reconstituer un incident récent pour vérifier quelles décisions peuvent réellement être retracées.', 'Reconstruct a recent incident to verify which decisions can actually be traced.'),
      E: text('Documenter pourquoi aucune décision ou action d’incident ne nécessiterait de traçabilité.', 'Document why no incident decision or action would require traceability.'),
    },
  },
  D8: {
    subject: text('le suivi des améliorations issues des audits, exercices et incidents', 'tracking improvements from audits, exercises and incidents'),
    operationalIssue: text('Des constats sans responsable, échéance ou vérification peuvent se répéter sans amélioration durable.', 'Findings without an owner, deadline or verification can recur without lasting improvement.'),
    goodPractice: text('Relier chaque constat à une action, un responsable, une échéance, une preuve et une vérification de fermeture.', 'Link every finding to an action, owner, deadline, evidence and closure verification.'),
    modules: ['exercises-rex-actions', 'audit', 'coro-index'],
    actions: {
      A: text('Maintenir la revue des échéances et l’indépendance de la vérification de fermeture.', 'Maintain deadline reviews and independent closure verification.'),
      B: text('Uniformiser le suivi et définir une preuve obligatoire avant toute fermeture.', 'Standardize tracking and require evidence before closure.'),
      C: text('Créer un registre priorisé des actions ouvertes avec responsables et échéances.', 'Create a prioritized register of open actions with owners and deadlines.'),
      D: text('Échantillonner les derniers constats et vérifier leur état, leur responsable et leur preuve.', 'Sample recent findings and verify status, ownership and evidence.'),
      E: text('Documenter la justification et vérifier qu’aucune source de constat ne s’applique réellement.', 'Document the rationale and verify that no source of findings truly applies.'),
    },
  },
};

const observationFor = (profile: Profile, answer: DiagnosticAnswerId): LocalizedText => {
  const prefix = {
    A: text('La réponse déclare une pratique favorable concernant', 'The response declares a favourable practice regarding'),
    B: text('La réponse déclare une pratique partielle concernant', 'The response declares a partial practice regarding'),
    C: text('La réponse déclare une capacité insuffisante concernant', 'The response declares insufficient capability regarding'),
    D: text('La réponse ne permet pas de confirmer', 'The response does not confirm'),
    E: text('La réponse déclare comme non applicable', 'The response declares as not applicable'),
  }[answer];
  return text(`${prefix.fr} ${profile.subject.fr}.`, `${prefix.en} ${profile.subject.en}.`);
};

export const diagnosticRecommendationMatrix: readonly DiagnosticRecommendation[] = diagnosticQuestions.flatMap((question) => {
  const profile = profiles[question.id];
  return diagnosticAnswerIds.map((answerId): DiagnosticRecommendation => ({
    dimensionId: question.id,
    answerId,
    observation: observationFor(profile, answerId),
    operationalIssue: profile.operationalIssue,
    goodPractice: profile.goodPractice,
    action: profile.actions[answerId],
    modules: resolveDiagnosticModules(profile.modules),
  }));
});

const recommendationIndex = new Map(diagnosticRecommendationMatrix.map((item) => [`${item.dimensionId}:${item.answerId}`, item]));

export function getDiagnosticRecommendation(dimensionId: DiagnosticDimensionId, answerId: DiagnosticAnswerId): DiagnosticRecommendation {
  return recommendationIndex.get(`${dimensionId}:${answerId}`)!;
}
