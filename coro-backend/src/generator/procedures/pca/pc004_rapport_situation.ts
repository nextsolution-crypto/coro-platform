import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC004';

export const PC004_RAPPORT_SITUATION: ProcedureTemplate = {
  id: 'pc004_rapport_situation',
  code: CODE,
  titleFR: 'RAPPORT DE SITUATION',
  titleEN: 'SITUATION REPORT',
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
        { id: sid(CODE, 1), textFR: 'Émettre un rapport de situation toutes les 2 à 4 heures pendant la durée de l\'incident ;', textEN: 'Issue a situation report every 2 to 4 hours during the incident;' },
        { id: sid(CODE, 2), textFR: 'Inclure dans chaque rapport : heure d\'émission, description de l\'incident, statut actuel, actions en cours, prochaines étapes et heure du prochain rapport ;', textEN: 'Include in each report: time of issue, incident description, current status, ongoing actions, next steps, and time of next report;' },
        { id: sid(CODE, 3), textFR: 'Documenter le statut de chaque activité critique : Normal / Dégradé / Suspendu ;', textEN: 'Document the status of each critical activity: Normal / Degraded / Suspended;' },
        { id: sid(CODE, 4), textFR: 'Indiquer les ressources déployées et les coûts estimés à ce jour ;', textEN: 'Indicate deployed resources and estimated costs to date;' },
        { id: sid(CODE, 5), textFR: 'Communiquer le rapport à la direction générale et aux membres de la cellule ;', textEN: 'Communicate the report to senior management and team members;' },
        { id: sid(CODE, 6), textFR: 'Ajuster la fréquence des rapports selon l\'évolution de la situation ;', textEN: 'Adjust reporting frequency according to the evolution of the situation;' },
        { id: sid(CODE, 7), textFR: 'Émettre un rapport final lors de la résolution de l\'incident.', textEN: 'Issue a final report upon incident resolution.', isBold: true },
      ],
    },
    {
      roleCode: 'DIR-GENERAL',
      roleLabelFR: 'Direction générale',
      roleLabelEN: 'Senior Management',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 8), textFR: 'Recevoir et analyser chaque rapport de situation ;', textEN: 'Receive and analyze each situation report;' },
        { id: sid(CODE, 9), textFR: 'Prendre les décisions stratégiques requises en fonction de l\'évolution de la situation ;', textEN: 'Make required strategic decisions based on the evolution of the situation;' },
        { id: sid(CODE, 10), textFR: 'Autoriser les ressources supplémentaires si nécessaire ;', textEN: 'Authorize additional resources if necessary;' },
        { id: sid(CODE, 11), textFR: 'Approuver les communications externes importantes avant diffusion.', textEN: 'Approve important external communications before distribution.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-COMM',
      roleLabelFR: 'Responsable communications',
      roleLabelEN: 'Communications Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 12), textFR: 'Adapter le rapport de situation en communication externe si requis ;', textEN: 'Adapt the situation report into external communication if required;' },
        { id: sid(CODE, 13), textFR: 'Diffuser les communications approuvées via les canaux désignés ;', textEN: 'Distribute approved communications through designated channels;' },
        { id: sid(CODE, 14), textFR: 'Mettre à jour le site web ou les médias sociaux si la situation le requiert.', textEN: 'Update the website or social media if the situation requires it.', isBold: true },
      ],
    },
  ],
};