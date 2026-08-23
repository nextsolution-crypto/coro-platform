import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC011';

export const PC011_SINISTRE_BATIMENT: ProcedureTemplate = {
  id: 'pc011_sinistre_batiment',
  code: CODE,
  titleFR: 'SINISTRE BÂTIMENT — PROCÉDURE DE CONTINUITÉ',
  titleEN: 'BUILDING DISASTER — CONTINUITY PROCEDURE',
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
        { id: sid(CODE, 1), textFR: 'Confirmer que l\'évacuation du bâtiment est complétée et que la sécurité des personnes est assurée (référer au PMU/PSI) ;', textEN: 'Confirm building evacuation is complete and personnel safety is ensured (refer to ERP/FSP);' },
        { id: sid(CODE, 2), textFR: 'Évaluer l\'étendue des dommages et estimer la durée d\'indisponibilité du bâtiment ;', textEN: 'Assess the extent of damages and estimate building unavailability duration;' },
        { id: sid(CODE, 3), textFR: 'Activer le PCA au niveau approprié (Niveau 2 ou 3) selon la durée estimée d\'interruption ;', textEN: 'Activate the BCP at the appropriate level (Level 2 or 3) based on estimated interruption duration;' },
        { id: sid(CODE, 4), textFR: 'Activer le site alternatif si disponible : notifier les responsables et préparer l\'accueil des employés ;', textEN: 'Activate the alternate site if available: notify managers and prepare to receive employees;' },
        { id: sid(CODE, 5), textFR: 'Activer le télétravail pour les fonctions pouvant être exercées à distance ;', textEN: 'Activate telework for functions that can be performed remotely;' },
        { id: sid(CODE, 6), textFR: 'Contacter l\'assureur pour déclarer le sinistre et activer la couverture d\'interruption des affaires ;', textEN: 'Contact the insurer to declare the disaster and activate business interruption coverage;' },
        { id: sid(CODE, 7), textFR: 'Prioriser la reprise des activités critiques selon le BIA (RTO le plus court en premier) ;', textEN: 'Prioritize recovery of critical activities according to the BIA (shortest RTO first);' },
        { id: sid(CODE, 8), textFR: 'Communiquer aux clients prioritaires la situation et les délais de reprise prévus.', textEN: 'Communicate to priority clients the situation and expected recovery timelines.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-INSTALLATIONS',
      roleLabelFR: 'Responsable des installations',
      roleLabelEN: 'Facilities Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 9), textFR: 'Coordonner avec les autorités (pompiers, police, ville) l\'accès au bâtiment sinistré ;', textEN: 'Coordinate with authorities (fire, police, city) for access to the damaged building;' },
        { id: sid(CODE, 10), textFR: 'Récupérer les équipements et documents critiques si l\'accès au bâtiment est autorisé ;', textEN: 'Retrieve critical equipment and documents if building access is authorized;' },
        { id: sid(CODE, 11), textFR: 'Coordonner les travaux d\'urgence et les réparations avec les entrepreneurs ;', textEN: 'Coordinate emergency work and repairs with contractors;' },
        { id: sid(CODE, 12), textFR: 'Préparer et sécuriser le site alternatif pour accueillir les opérations.', textEN: 'Prepare and secure the alternate site to accommodate operations.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-TI',
      roleLabelFR: 'Responsable TI',
      roleLabelEN: 'IT Manager',
      headerColor: COLORS.blue,
      steps: [
        { id: sid(CODE, 13), textFR: 'Évaluer l\'état des systèmes informatiques et des données après le sinistre ;', textEN: 'Assess the state of IT systems and data after the disaster;' },
        { id: sid(CODE, 14), textFR: 'Activer les sauvegardes hors site et les systèmes de relève si nécessaire ;', textEN: 'Activate off-site backups and redundant systems if necessary;' },
        { id: sid(CODE, 15), textFR: 'Déployer l\'infrastructure TI au site alternatif ou en mode télétravail ;', textEN: 'Deploy IT infrastructure at the alternate site or in telework mode;' },
        { id: sid(CODE, 16), textFR: 'Confirmer la disponibilité des accès à distance pour les employés en télétravail.', textEN: 'Confirm remote access availability for teleworking employees.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-RH',
      roleLabelFR: 'Responsable RH',
      roleLabelEN: 'HR Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 17), textFR: 'Communiquer aux employés les nouvelles dispositions de travail (site alternatif, télétravail) ;', textEN: 'Communicate new work arrangements to employees (alternate site, telework);' },
        { id: sid(CODE, 18), textFR: 'Assurer le soutien psychologique aux employés affectés par le sinistre ;', textEN: 'Provide psychological support to employees affected by the disaster;' },
        { id: sid(CODE, 19), textFR: 'Gérer les questions liées aux conditions de travail exceptionnelles.', textEN: 'Manage issues related to exceptional working conditions.', isBold: true },
      ],
    },
  ],
};