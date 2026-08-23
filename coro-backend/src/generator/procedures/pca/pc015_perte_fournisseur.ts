import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC015';

export const PC015_PERTE_FOURNISSEUR: ProcedureTemplate = {
  id: 'pc015_perte_fournisseur',
  code: CODE,
  titleFR: 'PERTE D\'UN FOURNISSEUR CRITIQUE — PROCÉDURE DE CONTINUITÉ',
  titleEN: 'LOSS OF A CRITICAL SUPPLIER — CONTINUITY PROCEDURE',
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
        { id: sid(CODE, 1), textFR: 'Évaluer l\'impact de la perte du fournisseur sur les activités critiques et les délais de livraison ;', textEN: 'Assess the impact of supplier loss on critical activities and delivery timelines;' },
        { id: sid(CODE, 2), textFR: 'Déterminer le stock de sécurité disponible et estimer la durée avant rupture d\'approvisionnement ;', textEN: 'Determine available safety stock and estimate time before supply disruption;' },
        { id: sid(CODE, 3), textFR: 'Activer le PCA au niveau approprié selon l\'impact sur les activités critiques ;', textEN: 'Activate the BCP at the appropriate level based on impact on critical activities;' },
        { id: sid(CODE, 4), textFR: 'Contacter immédiatement les fournisseurs alternatifs identifiés dans le PCA ;', textEN: 'Immediately contact alternative suppliers identified in the BCP;' },
        { id: sid(CODE, 5), textFR: 'Prioriser les commandes en cours et alerter les clients des impacts potentiels sur les délais ;', textEN: 'Prioritize ongoing orders and alert clients of potential timeline impacts;' },
        { id: sid(CODE, 6), textFR: 'Évaluer la possibilité d\'internaliser temporairement les activités dépendantes du fournisseur ;', textEN: 'Assess the possibility of temporarily internalizing activities dependent on the supplier;' },
        { id: sid(CODE, 7), textFR: 'Documenter toutes les décisions et les coûts supplémentaires pour les réclamations d\'assurance si applicable.', textEN: 'Document all decisions and additional costs for insurance claims if applicable.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-OPERATIONS',
      roleLabelFR: 'Responsable des opérations',
      roleLabelEN: 'Operations Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 8), textFR: 'Inventorier immédiatement les stocks disponibles des produits ou services affectés ;', textEN: 'Immediately inventory available stocks of affected products or services;' },
        { id: sid(CODE, 9), textFR: 'Prioriser l\'utilisation des stocks selon les activités critiques et les commandes urgentes ;', textEN: 'Prioritize stock usage according to critical activities and urgent orders;' },
        { id: sid(CODE, 10), textFR: 'Identifier les activités pouvant être réduites ou suspendues temporairement pour concentrer les ressources ;', textEN: 'Identify activities that can be temporarily reduced or suspended to concentrate resources;' },
        { id: sid(CODE, 11), textFR: 'Coordonner avec les fournisseurs alternatifs pour accélérer les livraisons de remplacement.', textEN: 'Coordinate with alternative suppliers to expedite replacement deliveries.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-APPROVISIONNEMENT',
      roleLabelFR: 'Responsable des approvisionnements',
      roleLabelEN: 'Procurement Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 12), textFR: 'Contacter les fournisseurs alternatifs préidentifiés et obtenir des devis d\'urgence ;', textEN: 'Contact pre-identified alternative suppliers and obtain emergency quotes;' },
        { id: sid(CODE, 13), textFR: 'Négocier des livraisons accélérées et des conditions exceptionnelles si nécessaire ;', textEN: 'Negotiate accelerated deliveries and exceptional terms if necessary;' },
        { id: sid(CODE, 14), textFR: 'Évaluer les options d\'approvisionnement international si les fournisseurs locaux sont insuffisants ;', textEN: 'Evaluate international sourcing options if local suppliers are insufficient;' },
        { id: sid(CODE, 15), textFR: 'Documenter les conditions d\'achat exceptionnelles pour réclamation d\'assurance et analyse post-incident.', textEN: 'Document exceptional purchase conditions for insurance claim and post-incident analysis.', isBold: true },
      ],
    },
  ],
};