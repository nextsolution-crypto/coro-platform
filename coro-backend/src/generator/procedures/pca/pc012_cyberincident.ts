import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC012';

export const PC012_CYBERINCIDENT: ProcedureTemplate = {
  id: 'pc012_cyberincident',
  code: CODE,
  titleFR: 'CYBERINCIDENT — PROCÉDURE DE CONTINUITÉ',
  titleEN: 'CYBER INCIDENT — CONTINUITY PROCEDURE',
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
        { id: sid(CODE, 1), textFR: 'Confirmer la nature et l\'étendue du cyberincident avec le responsable TI ;', textEN: 'Confirm the nature and extent of the cyber incident with the IT Manager;' },
        { id: sid(CODE, 2), textFR: 'Activer le PCA au niveau approprié selon l\'impact sur les activités critiques ;', textEN: 'Activate the BCP at the appropriate level based on impact on critical activities;' },
        { id: sid(CODE, 3), textFR: 'Activer les procédures manuelles de remplacement pour les activités critiques affectées ;', textEN: 'Activate manual replacement procedures for affected critical activities;' },
        { id: sid(CODE, 4), textFR: 'Évaluer la nécessité de notifier les autorités réglementaires (Commission d\'accès à l\'information si données personnelles compromises) ;', textEN: 'Assess the need to notify regulatory authorities (Commission d\'accès à l\'information if personal data is compromised);', isRed: true },
        { id: sid(CODE, 5), textFR: 'Communiquer aux clients et partenaires affectés selon les obligations contractuelles ;', textEN: 'Communicate to affected clients and partners according to contractual obligations;' },
        { id: sid(CODE, 6), textFR: 'Contacter l\'assureur cyber pour activer la couverture et obtenir du soutien spécialisé ;', textEN: 'Contact the cyber insurer to activate coverage and obtain specialized support;' },
        { id: sid(CODE, 7), textFR: 'Suivre la progression de la reprise des systèmes et ajuster les priorités en conséquence.', textEN: 'Track system recovery progress and adjust priorities accordingly.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-TI',
      roleLabelFR: 'Responsable TI',
      roleLabelEN: 'IT Manager',
      headerColor: COLORS.blue,
      steps: [
        { id: sid(CODE, 8), textFR: 'Isoler immédiatement les systèmes compromis pour éviter la propagation ;', textEN: 'Immediately isolate compromised systems to prevent spread;', isRed: true },
        { id: sid(CODE, 9), textFR: 'Évaluer l\'étendue de la compromission — systèmes affectés, données exposées, durée estimée ;', textEN: 'Assess the extent of the compromise — affected systems, exposed data, estimated duration;' },
        { id: sid(CODE, 10), textFR: 'Activer les sauvegardes hors site vérifiées et non compromises ;', textEN: 'Activate verified and uncompromised off-site backups;' },
        { id: sid(CODE, 11), textFR: 'Déployer les systèmes de relève disponibles pour les activités critiques prioritaires ;', textEN: 'Deploy available redundant systems for priority critical activities;' },
        { id: sid(CODE, 12), textFR: 'Faire appel à des experts en cybersécurité externes si nécessaire ;', textEN: 'Engage external cybersecurity experts if necessary;' },
        { id: sid(CODE, 13), textFR: 'Documenter toutes les actions de remédiation pour le rapport post-incident et les autorités ;', textEN: 'Document all remediation actions for the post-incident report and authorities;' },
        { id: sid(CODE, 14), textFR: 'Ne restaurer les systèmes qu\'après confirmation que la menace est éliminée.', textEN: 'Only restore systems after confirmation that the threat has been eliminated.', isBold: true, isRed: true },
      ],
    },
    {
      roleCode: 'RESP-COMM',
      roleLabelFR: 'Responsable communications',
      roleLabelEN: 'Communications Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 15), textFR: 'Préparer les communications internes et externes approuvées sur le cyberincident ;', textEN: 'Prepare approved internal and external communications on the cyber incident;' },
        { id: sid(CODE, 16), textFR: 'Éviter de divulguer des informations sensibles sur la nature de l\'attaque dans les communications publiques ;', textEN: 'Avoid disclosing sensitive information about the nature of the attack in public communications;', isRed: true },
        { id: sid(CODE, 17), textFR: 'Coordonner avec le porte-parole désigné pour toute prise de parole publique.', textEN: 'Coordinate with the designated spokesperson for any public statement.', isBold: true },
      ],
    },
  ],
};