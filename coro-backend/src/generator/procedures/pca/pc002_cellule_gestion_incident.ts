import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC002';

export const PC002_CELLULE_GESTION_INCIDENT: ProcedureTemplate = {
  id: 'pc002_cellule_gestion_incident',
  code: CODE,
  titleFR: 'DÉCLENCHEMENT DE LA CELLULE DE GESTION D\'INCIDENT',
  titleEN: 'INCIDENT MANAGEMENT TEAM ACTIVATION',
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
        { id: sid(CODE, 1), textFR: 'Contacter chaque membre de la cellule de gestion d\'incident selon l\'ordre de priorité établi ;', textEN: 'Contact each incident management team member according to the established priority order;' },
        { id: sid(CODE, 2), textFR: 'Communiquer le niveau d\'incident, la nature de la perturbation et le lieu de coordination ;', textEN: 'Communicate the incident level, nature of the disruption, and coordination location;' },
        { id: sid(CODE, 3), textFR: 'Confirmer la disponibilité et l\'heure d\'arrivée de chaque membre ;', textEN: 'Confirm the availability and arrival time of each member;' },
        { id: sid(CODE, 4), textFR: 'Activer le pont téléphonique d\'urgence pour les membres à distance ;', textEN: 'Activate the emergency conference bridge for remote members;' },
        { id: sid(CODE, 5), textFR: 'Assigner les responsabilités initiales à chaque membre présent ;', textEN: 'Assign initial responsibilities to each member present;' },
        { id: sid(CODE, 6), textFR: 'Procéder à un premier bilan de situation avec la cellule dans les 30 minutes suivant l\'activation.', textEN: 'Conduct an initial situation briefing with the team within 30 minutes of activation.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-OPERATIONS',
      roleLabelFR: 'Responsable des opérations',
      roleLabelEN: 'Operations Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 7), textFR: 'Évaluer l\'impact de l\'incident sur les activités opérationnelles ;', textEN: 'Assess the impact of the incident on operational activities;' },
        { id: sid(CODE, 8), textFR: 'Identifier les activités critiques affectées et leur niveau d\'impact ;', textEN: 'Identify affected critical activities and their impact level;' },
        { id: sid(CODE, 9), textFR: 'Activer les stratégies de continuité opérationnelles préétablies ;', textEN: 'Activate pre-established operational continuity strategies;' },
        { id: sid(CODE, 10), textFR: 'Assurer la communication avec les équipes terrain.', textEN: 'Ensure communication with field teams.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-TI',
      roleLabelFR: 'Responsable TI',
      roleLabelEN: 'IT Manager',
      headerColor: COLORS.blue,
      steps: [
        { id: sid(CODE, 11), textFR: 'Évaluer l\'impact de l\'incident sur les systèmes informatiques et les données ;', textEN: 'Assess the impact of the incident on IT systems and data;' },
        { id: sid(CODE, 12), textFR: 'Activer les procédures de continuité TI selon le type d\'incident ;', textEN: 'Activate IT continuity procedures according to the incident type;' },
        { id: sid(CODE, 13), textFR: 'Vérifier l\'intégrité des sauvegardes et la disponibilité des systèmes de relève ;', textEN: 'Verify backup integrity and availability of redundant systems;' },
        { id: sid(CODE, 14), textFR: 'Communiquer l\'état des systèmes TI au coordonnateur PCA toutes les heures.', textEN: 'Communicate IT system status to the BCP Coordinator every hour.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-RH',
      roleLabelFR: 'Responsable RH',
      roleLabelEN: 'HR Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 15), textFR: 'Évaluer la disponibilité du personnel clé et identifier les remplaçants ;', textEN: 'Assess key personnel availability and identify replacements;' },
        { id: sid(CODE, 16), textFR: 'Coordonner les dispositions de télétravail si applicable ;', textEN: 'Coordinate telework arrangements if applicable;' },
        { id: sid(CODE, 17), textFR: 'Communiquer les directives aux employés via le canal interne désigné.', textEN: 'Communicate directives to employees through the designated internal channel.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-COMM',
      roleLabelFR: 'Responsable communications',
      roleLabelEN: 'Communications Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 18), textFR: 'Préparer les messages de communication interne et externe approuvés par la direction ;', textEN: 'Prepare internal and external communication messages approved by management;' },
        { id: sid(CODE, 19), textFR: 'Surveiller les médias sociaux et les mentions de l\'organisation ;', textEN: 'Monitor social media and mentions of the organization;' },
        { id: sid(CODE, 20), textFR: 'Coordonner les communications avec le porte-parole désigné.', textEN: 'Coordinate communications with the designated spokesperson.', isBold: true },
      ],
    },
  ],
};