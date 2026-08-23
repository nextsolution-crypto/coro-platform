import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC001';

export const PC001_ACTIVATION_PCA: ProcedureTemplate = {
  id: 'pc001_activation_pca',
  code: CODE,
  titleFR: 'ACTIVATION DU PLAN DE CONTINUITÉ DES ACTIVITÉS',
  titleEN: 'BUSINESS CONTINUITY PLAN ACTIVATION',
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
        { id: sid(CODE, 1), textFR: 'Évaluer la situation et déterminer le niveau d\'incident (Niveau 1 / 2 / 3) selon la grille des niveaux d\'incident ;', textEN: 'Assess the situation and determine the incident level (Level 1 / 2 / 3) according to the incident level grid;' },
        { id: sid(CODE, 2), textFR: 'Si Niveau 2 ou 3 : déclarer officiellement l\'activation du PCA et noter l\'heure d\'activation ;', textEN: 'If Level 2 or 3: officially declare BCP activation and record the activation time;' },
        { id: sid(CODE, 3), textFR: 'Contacter le substitut si le coordonnateur principal est indisponible ;', textEN: 'Contact the alternate if the primary coordinator is unavailable;' },
        { id: sid(CODE, 4), textFR: 'Convoquer les membres de la cellule de gestion d\'incident requis selon le niveau d\'incident ;', textEN: 'Convene the required incident management team members according to the incident level;' },
        { id: sid(CODE, 5), textFR: 'Établir le lieu de coordination (local principal ou alternatif) et activer le pont téléphonique d\'urgence si requis ;', textEN: 'Establish the coordination location (primary or alternate) and activate the emergency conference bridge if required;' },
        { id: sid(CODE, 6), textFR: 'Ouvrir le journal de bord d\'incident et documenter toutes les actions et décisions prises ;', textEN: 'Open the incident log and document all actions and decisions taken;' },
        { id: sid(CODE, 7), textFR: 'Initier la communication interne via le canal désigné ;', textEN: 'Initiate internal communication through the designated channel;' },
        { id: sid(CODE, 8), textFR: 'Activer les stratégies de continuité appropriées selon le type d\'incident ;', textEN: 'Activate the appropriate continuity strategies according to the incident type;' },
        { id: sid(CODE, 9), textFR: 'Assurer un suivi continu et envoyer des rapports de situation toutes les 2 à 4 heures.', textEN: 'Ensure continuous follow-up and send situation reports every 2 to 4 hours.', isBold: true },
      ],
    },
    {
      roleCode: 'DIR-GENERAL',
      roleLabelFR: 'Direction générale',
      roleLabelEN: 'Senior Management',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 10), textFR: 'Être informé de l\'activation du PCA et du niveau d\'incident déclaré ;', textEN: 'Be informed of the BCP activation and declared incident level;' },
        { id: sid(CODE, 11), textFR: 'Autoriser les dépenses exceptionnelles requises pour la continuité des activités ;', textEN: 'Authorize exceptional expenditures required for business continuity;' },
        { id: sid(CODE, 12), textFR: 'Approuver les communications externes importantes ;', textEN: 'Approve important external communications;' },
        { id: sid(CODE, 13), textFR: 'Prendre les décisions stratégiques en lien avec la reprise des activités.', textEN: 'Make strategic decisions related to activity recovery.', isBold: true },
      ],
    },
  ],
};