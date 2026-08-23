import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC023';

export const PC023_COMMUNICATION_POST_INCIDENT: ProcedureTemplate = {
  id: 'pc023_communication_post_incident',
  code: CODE,
  titleFR: 'COMMUNICATION POST-INCIDENT AUX PARTIES PRENANTES',
  titleEN: 'POST-INCIDENT COMMUNICATION TO STAKEHOLDERS',
  headerColor: COLORS.slate,
  activationRule: 'always',
  documentTypes: ['PCA'],
  roleSections: [
    {
      roleCode: 'RESP-COMM',
      roleLabelFR: 'Responsable communications',
      roleLabelEN: 'Communications Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 1), textFR: 'Préparer un bilan de communication post-incident approuvé par la direction générale ;', textEN: 'Prepare a post-incident communication summary approved by senior management;' },
        { id: sid(CODE, 2), textFR: 'Communiquer aux employés la fin de l\'incident, le retour à la normale et les mesures prises ;', textEN: 'Communicate to employees the end of the incident, return to normal, and measures taken;' },
        { id: sid(CODE, 3), textFR: 'Envoyer une communication officielle aux clients affectés — remercier de leur patience et confirmer le retour à la normale ;', textEN: 'Send an official communication to affected clients — thank them for their patience and confirm return to normal;' },
        { id: sid(CODE, 4), textFR: 'Informer les fournisseurs critiques de la résolution de l\'incident et confirmer les commandes en cours ;', textEN: 'Inform critical suppliers of incident resolution and confirm ongoing orders;' },
        { id: sid(CODE, 5), textFR: 'Mettre à jour le site web et les médias sociaux si des communications avaient été publiées pendant l\'incident ;', textEN: 'Update the website and social media if communications had been published during the incident;' },
        { id: sid(CODE, 6), textFR: 'Préparer un communiqué de presse si l\'incident a eu une couverture médiatique ;', textEN: 'Prepare a press release if the incident had media coverage;' },
        { id: sid(CODE, 7), textFR: 'Notifier les autorités réglementaires de la résolution si elles avaient été informées de l\'incident ;', textEN: 'Notify regulatory authorities of resolution if they had been informed of the incident;' },
        { id: sid(CODE, 8), textFR: 'Documenter toutes les communications post-incident pour le rapport post-incident officiel.', textEN: 'Document all post-incident communications for the official post-incident report.', isBold: true },
      ],
    },
    {
      roleCode: 'COORD-PCA',
      roleLabelFR: 'Coordonnateur PCA',
      roleLabelEN: 'BCP Coordinator',
      headerColor: COLORS.red,
      steps: [
        { id: sid(CODE, 9), textFR: 'Approuver toutes les communications post-incident avant diffusion ;', textEN: 'Approve all post-incident communications before distribution;' },
        { id: sid(CODE, 10), textFR: 'S\'assurer que les messages sont cohérents avec le rapport post-incident officiel ;', textEN: 'Ensure messages are consistent with the official post-incident report;' },
        { id: sid(CODE, 11), textFR: 'Évaluer les impacts réputationnels et ajuster la stratégie de communication en conséquence.', textEN: 'Assess reputational impacts and adjust the communication strategy accordingly.', isBold: true },
      ],
    },
    {
      roleCode: 'DIR-GENERAL',
      roleLabelFR: 'Direction générale',
      roleLabelEN: 'Senior Management',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 12), textFR: 'Approuver les communications destinées aux clients, partenaires et médias ;', textEN: 'Approve communications intended for clients, partners, and media;' },
        { id: sid(CODE, 13), textFR: 'Signer les communications officielles si requis ;', textEN: 'Sign official communications if required;' },
        { id: sid(CODE, 14), textFR: 'Évaluer la nécessité de rencontres personnalisées avec les clients les plus affectés.', textEN: 'Assess the need for personalized meetings with the most affected clients.', isBold: true },
      ],
    },
  ],
};