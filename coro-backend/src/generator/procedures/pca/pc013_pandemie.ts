import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC013';

export const PC013_PANDEMIE: ProcedureTemplate = {
  id: 'pc013_pandemie',
  code: CODE,
  titleFR: 'PANDÉMIE ET ABSENTÉISME MASSIF — PROCÉDURE DE CONTINUITÉ',
  titleEN: 'PANDEMIC AND MASS ABSENTEEISM — CONTINUITY PROCEDURE',
  headerColor: COLORS.red,
  activationRule: 'always',
  documentTypes: ['PCA'],
  roleSections: [
    {
      roleCode: 'COORD-PCA',
      roleLabelFR: 'Coordonnateur PCA',
      roleLabelEN: 'BCP Coordinator',
      headerColor: COLORS.red,
      steps: [
        { id: sid(CODE, 1), textFR: 'Surveiller l\'évolution de la situation sanitaire et évaluer l\'impact sur les effectifs ;', textEN: 'Monitor the evolution of the health situation and assess impact on staffing;' },
        { id: sid(CODE, 2), textFR: 'Activer le PCA lorsque l\'absentéisme dépasse 20% du personnel ou menace les activités critiques ;', textEN: 'Activate the BCP when absenteeism exceeds 20% of staff or threatens critical activities;' },
        { id: sid(CODE, 3), textFR: 'Identifier les activités critiques affectées et activer les stratégies de continuité appropriées ;', textEN: 'Identify affected critical activities and activate appropriate continuity strategies;' },
        { id: sid(CODE, 4), textFR: 'Activer le télétravail généralisé pour toutes les fonctions pouvant être exercées à distance ;', textEN: 'Activate widespread telework for all functions that can be performed remotely;' },
        { id: sid(CODE, 5), textFR: 'Prioriser l\'affectation du personnel disponible aux activités les plus critiques selon le BIA ;', textEN: 'Prioritize assignment of available staff to the most critical activities according to the BIA;' },
        { id: sid(CODE, 6), textFR: 'Suivre les directives des autorités de santé publique (Santé publique Québec, Santé Canada) ;', textEN: 'Follow public health authority directives (Public Health Quebec, Health Canada);', isRed: true },
        { id: sid(CODE, 7), textFR: 'Communiquer régulièrement aux employés les mesures de protection et les nouvelles dispositions de travail ;', textEN: 'Regularly communicate protective measures and new work arrangements to employees;' },
        { id: sid(CODE, 8), textFR: 'Évaluer quotidiennement le taux d\'absentéisme et ajuster les stratégies en conséquence.', textEN: 'Daily assess the absenteeism rate and adjust strategies accordingly.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-RH',
      roleLabelFR: 'Responsable RH',
      roleLabelEN: 'HR Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 9), textFR: 'Suivre quotidiennement les taux d\'absentéisme par département et activité critique ;', textEN: 'Daily track absenteeism rates by department and critical activity;' },
        { id: sid(CODE, 10), textFR: 'Activer les plans de formation croisée — affecter les remplaçants formés aux postes critiques vacants ;', textEN: 'Activate cross-training plans — assign trained replacements to vacant critical positions;' },
        { id: sid(CODE, 11), textFR: 'Contacter les agences de placement pour du personnel temporaire si nécessaire ;', textEN: 'Contact staffing agencies for temporary personnel if necessary;' },
        { id: sid(CODE, 12), textFR: 'Mettre en place les mesures de protection sanitaire recommandées par les autorités pour le personnel en présentiel ;', textEN: 'Implement recommended health protection measures from authorities for on-site staff;' },
        { id: sid(CODE, 13), textFR: 'Gérer les questions liées aux congés maladie, aux assurances collectives et aux obligations légales envers les employés.', textEN: 'Manage issues related to sick leave, group insurance, and legal obligations toward employees.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-OPERATIONS',
      roleLabelFR: 'Responsable des opérations',
      roleLabelEN: 'Operations Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 14), textFR: 'Réorganiser les équipes de travail pour maintenir les activités critiques avec un effectif réduit ;', textEN: 'Reorganize work teams to maintain critical activities with reduced staff;' },
        { id: sid(CODE, 15), textFR: 'Activer les procédures opérationnelles simplifiées documentées pour les fonctions critiques ;', textEN: 'Activate documented simplified operational procedures for critical functions;' },
        { id: sid(CODE, 16), textFR: 'Communiquer aux clients et fournisseurs les ajustements de service si nécessaire ;', textEN: 'Communicate service adjustments to clients and suppliers if necessary;' },
        { id: sid(CODE, 17), textFR: 'Identifier et réduire les activités non essentielles pour concentrer les ressources sur les priorités.', textEN: 'Identify and reduce non-essential activities to focus resources on priorities.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-TI',
      roleLabelFR: 'Responsable TI',
      roleLabelEN: 'IT Manager',
      headerColor: COLORS.blue,
      steps: [
        { id: sid(CODE, 18), textFR: 'Assurer la capacité suffisante des infrastructures de télétravail (VPN, licences, bande passante) ;', textEN: 'Ensure sufficient telework infrastructure capacity (VPN, licenses, bandwidth);' },
        { id: sid(CODE, 19), textFR: 'Déployer rapidement les équipements informatiques nécessaires au personnel en télétravail ;', textEN: 'Rapidly deploy necessary IT equipment to teleworking staff;' },
        { id: sid(CODE, 20), textFR: 'Assurer le soutien technique prioritaire aux utilisateurs en télétravail.', textEN: 'Provide priority technical support to teleworking users.', isBold: true },
      ],
    },
  ],
};