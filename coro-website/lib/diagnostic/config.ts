import type { DiagnosticAnswerId, DiagnosticQuestion } from './types';

export const DIAGNOSTIC_VERSION = '1.0';
export const DIAGNOSTIC_ENGINE_VERSION = '1.0';
export const DIAGNOSTIC_STORAGE_KEY = 'coro:diagnostic-express:v1';
export const DIAGNOSTIC_QUESTION_COUNT = 8;
export const DIAGNOSTIC_MINIMUM_COVERAGE_PERCENT = 75;
export const diagnosticPoints = { A: 3, B: 2, C: 0 } as const;
export const diagnosticLevelThresholds = [
  { id: 'reinforce', minimum: 0, maximum: 34 },
  { id: 'partial', minimum: 35, maximum: 59 },
  { id: 'structured', minimum: 60, maximum: 79 },
  { id: 'advanced', minimum: 80, maximum: 100 },
] as const;
export const diagnosticTieBreakOrder = ['D5', 'D4', 'D2', 'D3', 'D7', 'D6', 'D8', 'D1'] as const;
export const diagnosticCriticalDimensions = ['D5', 'D4', 'D2'] as const;

const answer = (id: DiagnosticAnswerId, fr: string, en: string) => ({ id, label: { fr, en } });

export const diagnosticQuestions: readonly DiagnosticQuestion[] = [
  {
    id: 'D1', dimension: { fr: 'Connaissance des installations', en: 'Knowledge of facilities' },
    question: { fr: 'Les informations essentielles de vos bâtiments sont-elles centralisées et à jour ?', en: 'Is essential information about your buildings centralized and up to date?' },
    answers: [answer('A', 'Oui, centralisées et vérifiées régulièrement.', 'Yes, centralized and reviewed regularly.'), answer('B', 'Partiellement, certaines informations sont dispersées.', 'Partly; some information is scattered.'), answer('C', 'Non, elles sont principalement dans différents fichiers.', 'No; it is mainly stored in separate files.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable à notre organisation.', 'Not applicable to our organization.')],
  },
  {
    id: 'D2', dimension: { fr: 'Conformité documentaire', en: 'Document compliance' },
    question: { fr: "Vos plans et procédures d'urgence sont-ils approuvés, à jour et facilement accessibles ?", en: 'Are your emergency plans and procedures approved, up to date and easy to access?' },
    answers: [answer('A', 'Oui, avec suivi des versions et des approbations.', 'Yes, with version and approval tracking.'), answer('B', 'En partie, mais certaines mises à jour restent nécessaires.', 'Partly, but some updates are still needed.'), answer('C', 'Non, leur actualisation ou leur diffusion est insuffisante.', 'No; updating or distribution is insufficient.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable.', 'Not applicable.')],
  },
  {
    id: 'D3', dimension: { fr: 'Préparation humaine', en: 'People readiness' },
    question: { fr: "Les membres de vos équipes d'urgence sont-ils formés et connaissent-ils leurs responsabilités ?", en: 'Are members of your emergency teams trained and aware of their responsibilities?' },
    answers: [answer('A', 'Oui, avec formations et remplacements organisés.', 'Yes, with training and backup coverage organized.'), answer('B', 'Partiellement, selon les équipes ou les sites.', 'Partly, depending on the team or site.'), answer('C', 'Non, les rôles ou les formations sont insuffisants.', 'No; roles or training are insufficient.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable.', 'Not applicable.')],
  },
  {
    id: 'D4', dimension: { fr: 'Coordination opérationnelle', en: 'Operational coordination' },
    question: { fr: "En cas d'urgence, les responsables disposent-ils rapidement des consignes et informations nécessaires pour agir ?", en: 'In an emergency, can those responsible quickly access the instructions and information they need to act?' },
    answers: [answer('A', 'Oui, les responsabilités et consignes sont clairement établies et accessibles.', 'Yes; responsibilities and instructions are clearly established and accessible.'), answer('B', 'Partiellement, selon les événements ou les intervenants.', 'Partly, depending on the event or responders.'), answer('C', "Non, la réponse repose souvent sur l'improvisation.", 'No; the response often relies on improvisation.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable.', 'Not applicable.')],
  },
  {
    id: 'D5', dimension: { fr: 'Protection des personnes', en: 'Protection of people' },
    question: { fr: "Lors d'une évacuation, pouvez-vous identifier les personnes présentes et suivre les confirmations de mise en sécurité ?", en: 'During an evacuation, can you identify who is present and track confirmations that people are safe?' },
    answers: [answer('A', 'Oui, avec une méthode structurée et régulièrement vérifiée.', 'Yes, using a structured method that is reviewed regularly.'), answer('B', 'Partiellement, selon les catégories de personnes.', 'Partly, depending on the category of people.'), answer('C', 'Non, notre visibilité est insuffisante.', 'No; our visibility is insufficient.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable.', 'Not applicable.')],
  },
  {
    id: 'D6', dimension: { fr: 'Exercices et validation', en: 'Exercises and validation' },
    question: { fr: "Vos procédures d'urgence sont-elles régulièrement testées lors d'exercices documentés et évalués ?", en: 'Are your emergency procedures regularly tested through documented and evaluated exercises?' },
    answers: [answer('A', 'Oui, régulièrement, avec objectifs et évaluation.', 'Yes, regularly, with objectives and evaluation.'), answer('B', 'Occasionnellement, sans évaluation systématique.', 'Occasionally, without systematic evaluation.'), answer('C', 'Rarement ou jamais.', 'Rarely or never.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable.', 'Not applicable.')],
  },
  {
    id: 'D7', dimension: { fr: 'Traçabilité opérationnelle', en: 'Operational traceability' },
    question: { fr: "Les décisions et actions réalisées lors d'un incident peuvent-elles être retracées et documentées ?", en: 'Can decisions and actions taken during an incident be traced and documented?' },
    answers: [answer('A', 'Oui, dans un journal structuré et consultable.', 'Yes, in a structured, accessible log.'), answer('B', 'Partiellement, dans différents outils.', 'Partly, across different tools.'), answer('C', 'Non, les preuves sont difficiles à retrouver.', 'No; evidence is difficult to retrieve.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable.', 'Not applicable.')],
  },
  {
    id: 'D8', dimension: { fr: 'Amélioration continue', en: 'Continuous improvement' },
    question: { fr: "Les constats d'audit, d'exercice ou d'incident donnent-ils lieu à des améliorations suivies jusqu'à leur réalisation ?", en: 'Do audit, exercise or incident findings lead to improvements that are tracked through completion?' },
    answers: [answer('A', 'Oui, avec responsables, échéances et validation.', 'Yes, with owners, deadlines and validation.'), answer('B', 'Parfois, sans suivi systématique.', 'Sometimes, without systematic follow-up.'), answer('C', 'Non, les recommandations restent souvent sans suite.', 'No; recommendations often remain unresolved.'), answer('D', 'Je ne sais pas.', 'I do not know.'), answer('E', 'Non applicable.', 'Not applicable.')],
  },
] as const;
