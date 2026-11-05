import { COLORS, ProcedureTemplate, sid } from './types';

const CODE = 'P030';

export const P030_PERTE_ALIMENTATION_URGENCE: ProcedureTemplate = {
  id: 'p030_perte_alimentation_urgence',
  code: CODE,
  titleFR: "PERTE DE L'ALIMENTATION ÉLECTRIQUE D'URGENCE",
  titleEN: 'LOSS OF EMERGENCY ELECTRICAL POWER',
  icon: '⚡',
  headerColor: COLORS.onyx,
  activationRule: 'manual',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-CU',
    roleLabelFR: "Coordonnateur d'urgence",
    roleLabelEN: 'Emergency Coordinator',
    headerColor: COLORS.onyx,
    steps: [
      { id: sid(CODE, 1), textFR: '**Confirmer l’urgence opérationnelle** : panne du réseau et alimentation de secours absente ou insuffisante pour une fonction essentielle.', textEN: '**Confirm the operational emergency**: utility outage and emergency power absent or insufficient for an essential function.', isBold: true, isRed: true },
      { id: sid(CODE, 2), textFR: 'Identifier immédiatement les fonctions de sécurité compromises : alarme, éclairage, pompes, ascenseurs, contrôle d’accès, communications ou équipements essentiels.', textEN: 'Immediately identify compromised safety functions: alarm, lighting, pumps, elevators, access control, communications, or essential equipment.' },
      { id: sid(CODE, 3), textFR: 'Protéger les personnes dépendantes d’un équipement alimenté et sécuriser les ascenseurs et zones devenues dangereuses.', textEN: 'Protect people dependent on powered equipment and secure elevators and areas that have become hazardous.' },
      { id: sid(CODE, 4), textFR: 'Ne pas intervenir sur la génératrice, les panneaux ou les circuits; faire appel au personnel qualifié.', textEN: 'Do not work on the generator, panels, or circuits; call qualified personnel.', isBold: true },
      { id: sid(CODE, 5), textFR: 'Mettre en place les mesures compensatoires prévues et réévaluer l’occupation ou l’évacuation selon les fonctions perdues.', textEN: 'Implement planned compensating measures and reassess occupancy or evacuation based on lost functions.' },
      { id: sid(CODE, 6), textFR: 'Fournir aux intervenants la localisation de la génératrice, son autonomie déclarée et les charges de secours documentées.', textEN: 'Provide responders with the documented generator location, declared autonomy, and emergency loads.' },
      { id: sid(CODE, 7), textFR: 'Ne pas activer automatiquement le PCA; soumettre son activation à l’autorité et aux critères PCA existants.', textEN: 'Do not activate the BCP automatically; use the existing BCP authority and criteria.', isBold: true },
      { id: sid(CODE, 8), textFR: 'Confirmer la remise en service sécuritaire avant de lever les mesures et consigner la preuve.', textEN: 'Confirm safe restoration before lifting measures and record the evidence.' },
    ],
  }],
};
