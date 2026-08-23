import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC016';

export const PC016_PERTE_EMPLOYE_CLE: ProcedureTemplate = {
  id: 'pc016_perte_employe_cle',
  code: CODE,
  titleFR: 'PERTE D\'UN EMPLOYÉ CLÉ — PROCÉDURE DE CONTINUITÉ',
  titleEN: 'LOSS OF A KEY EMPLOYEE — CONTINUITY PROCEDURE',
  headerColor: COLORS.slate,
  activationRule: 'always',
  documentTypes: ['PCA'],
  roleSections: [
    {
      roleCode: 'COORD-PCA',
      roleLabelFR: 'Coordonnateur PCA',
      roleLabelEN: 'BCP Coordinator',
      headerColor: COLORS.red,
      steps: [
        { id: sid(CODE, 1), textFR: 'Évaluer l\'impact de l\'absence de l\'employé clé sur les activités critiques ;', textEN: 'Assess the impact of the key employee\'s absence on critical activities;' },
        { id: sid(CODE, 2), textFR: 'Identifier le remplaçant désigné ou l\'employé formé pour assumer les responsabilités critiques ;', textEN: 'Identify the designated replacement or trained employee to assume critical responsibilities;' },
        { id: sid(CODE, 3), textFR: 'Activer le PCA si aucun remplaçant immédiat n\'est disponible et que des activités critiques sont menacées ;', textEN: 'Activate the BCP if no immediate replacement is available and critical activities are at risk;' },
        { id: sid(CODE, 4), textFR: 'Documenter et transférer les connaissances critiques détenues par l\'employé absent si possible ;', textEN: 'Document and transfer critical knowledge held by the absent employee if possible;' },
        { id: sid(CODE, 5), textFR: 'Évaluer le recours à des consultants externes ou à du personnel temporaire spécialisé ;', textEN: 'Assess the use of external consultants or specialized temporary staff;' },
        { id: sid(CODE, 6), textFR: 'Mettre en place un plan de transition à court terme et un plan de succession à long terme.', textEN: 'Establish a short-term transition plan and a long-term succession plan.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-RH',
      roleLabelFR: 'Responsable RH',
      roleLabelEN: 'HR Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 7), textFR: 'Activer le plan de succession ou de remplacement préétabli pour le poste concerné ;', textEN: 'Activate the pre-established succession or replacement plan for the position concerned;' },
        { id: sid(CODE, 8), textFR: 'Contacter les agences de placement spécialisées si un remplacement externe est nécessaire ;', textEN: 'Contact specialized staffing agencies if external replacement is necessary;' },
        { id: sid(CODE, 9), textFR: 'Coordonner le transfert des responsabilités et l\'accès aux systèmes et informations confidentielles ;', textEN: 'Coordinate the transfer of responsibilities and access to systems and confidential information;' },
        { id: sid(CODE, 10), textFR: 'Assurer le soutien au remplaçant et aux collègues affectés par la charge de travail supplémentaire ;', textEN: 'Provide support to the replacement and colleagues affected by additional workload;' },
        { id: sid(CODE, 11), textFR: 'Gérer les aspects légaux et administratifs liés au départ si applicable (contrat, accès, propriété intellectuelle).', textEN: 'Manage legal and administrative aspects related to departure if applicable (contract, access, intellectual property).', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-OPERATIONS',
      roleLabelFR: 'Responsable des opérations',
      roleLabelEN: 'Operations Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 12), textFR: 'Réorganiser temporairement les tâches et responsabilités au sein de l\'équipe ;', textEN: 'Temporarily reorganize tasks and responsibilities within the team;' },
        { id: sid(CODE, 13), textFR: 'Identifier les processus critiques dont la connaissance est concentrée chez l\'employé absent ;', textEN: 'Identify critical processes whose knowledge is concentrated in the absent employee;' },
        { id: sid(CODE, 14), textFR: 'Documenter les processus non encore documentés pour éviter la perte de connaissances ;', textEN: 'Document processes not yet documented to prevent knowledge loss;' },
        { id: sid(CODE, 15), textFR: 'Assurer la continuité des activités critiques avec les ressources disponibles en attendant le remplacement.', textEN: 'Ensure continuity of critical activities with available resources while awaiting replacement.', isBold: true },
      ],
    },
  ],
};