import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC014';

export const PC014_PANNE_ELECTRIQUE: ProcedureTemplate = {
  id: 'pc014_panne_electrique',
  code: CODE,
  titleFR: 'PANNE ÉLECTRIQUE PROLONGÉE — PROCÉDURE DE CONTINUITÉ',
  titleEN: 'EXTENDED POWER OUTAGE — CONTINUITY PROCEDURE',
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
        { id: sid(CODE, 1), textFR: 'Confirmer la durée estimée de la panne avec le fournisseur d\'électricité (Hydro-Québec : 1 800 790-2424) ;', textEN: 'Confirm estimated outage duration with the power utility (Hydro-Québec: 1 800 790-2424);' },
        { id: sid(CODE, 2), textFR: 'Si durée estimée > 4 heures : activer le PCA au Niveau 2 ;', textEN: 'If estimated duration > 4 hours: activate BCP at Level 2;' },
        { id: sid(CODE, 3), textFR: 'Vérifier que la génératrice de secours est opérationnelle et alimente les systèmes critiques ;', textEN: 'Verify that the backup generator is operational and powering critical systems;' },
        { id: sid(CODE, 4), textFR: 'Activer le télétravail pour le personnel pouvant travailler à distance ;', textEN: 'Activate telework for staff who can work remotely;' },
        { id: sid(CODE, 5), textFR: 'Activer le site alternatif si la panne dure plus de 8 heures et affecte les activités critiques ;', textEN: 'Activate the alternate site if the outage lasts more than 8 hours and affects critical activities;' },
        { id: sid(CODE, 6), textFR: 'Communiquer aux clients les impacts sur les délais de service si nécessaire ;', textEN: 'Communicate service delay impacts to clients if necessary;' },
        { id: sid(CODE, 7), textFR: 'Assurer un suivi toutes les 2 heures avec Hydro-Québec sur l\'état de la situation.', textEN: 'Follow up every 2 hours with Hydro-Québec on the status of the situation.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-INSTALLATIONS',
      roleLabelFR: 'Responsable des installations',
      roleLabelEN: 'Facilities Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 8), textFR: 'Vérifier immédiatement l\'état de la génératrice de secours et son niveau de carburant ;', textEN: 'Immediately verify the backup generator status and fuel level;' },
        { id: sid(CODE, 9), textFR: 'S\'assurer que les systèmes UPS (alimentation sans coupure) protègent les équipements critiques ;', textEN: 'Ensure UPS (uninterruptible power supply) systems protect critical equipment;' },
        { id: sid(CODE, 10), textFR: 'Surveiller la température des locaux sensibles (salle serveur, entrepôt) et prendre les mesures nécessaires ;', textEN: 'Monitor temperature in sensitive areas (server room, warehouse) and take necessary measures;' },
        { id: sid(CODE, 11), textFR: 'Contacter le fournisseur de carburant si la panne se prolonge et que les réserves sont insuffisantes ;', textEN: 'Contact fuel supplier if the outage extends and reserves are insufficient;' },
        { id: sid(CODE, 12), textFR: 'Sécuriser les accès au bâtiment si les systèmes de contrôle d\'accès électroniques sont hors service.', textEN: 'Secure building access if electronic access control systems are offline.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-TI',
      roleLabelFR: 'Responsable TI',
      roleLabelEN: 'IT Manager',
      headerColor: COLORS.blue,
      steps: [
        { id: sid(CODE, 13), textFR: 'Vérifier que les serveurs critiques sont protégés par les UPS et la génératrice ;', textEN: 'Verify that critical servers are protected by UPS and generator;' },
        { id: sid(CODE, 14), textFR: 'Effectuer une sauvegarde d\'urgence des données critiques si les systèmes sont encore opérationnels ;', textEN: 'Perform emergency backup of critical data if systems are still operational;' },
        { id: sid(CODE, 15), textFR: 'Déployer les accès distants pour permettre le télétravail via connexion cellulaire ou internet de secours ;', textEN: 'Deploy remote access to enable telework via cellular or backup internet connection;' },
        { id: sid(CODE, 16), textFR: 'Planifier la procédure de redémarrage sécurisé des systèmes lors du rétablissement du courant.', textEN: 'Plan the secure system restart procedure when power is restored.', isBold: true },
      ],
    },
  ],
};