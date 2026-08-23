import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC003';

export const PC003_JOURNAL_DE_BORD: ProcedureTemplate = {
  id: 'pc003_journal_de_bord',
  code: CODE,
  titleFR: 'JOURNAL DE BORD D\'INCIDENT',
  titleEN: 'INCIDENT LOG',
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
        { id: sid(CODE, 1), textFR: 'Ouvrir le journal de bord dès l\'activation du PCA en notant la date, l\'heure et le type d\'incident ;', textEN: 'Open the incident log upon BCP activation, noting the date, time, and incident type;' },
        { id: sid(CODE, 2), textFR: 'Désigner un responsable du journal de bord parmi les membres de la cellule ;', textEN: 'Designate a log keeper among the incident management team members;' },
        { id: sid(CODE, 3), textFR: 'Documenter chronologiquement toutes les actions, décisions et communications importantes ;', textEN: 'Chronologically document all important actions, decisions, and communications;' },
        { id: sid(CODE, 4), textFR: 'Enregistrer l\'heure précise de chaque entrée au journal ;', textEN: 'Record the exact time of each log entry;' },
        { id: sid(CODE, 5), textFR: 'Documenter le statut des activités critiques à intervalles réguliers (toutes les heures) ;', textEN: 'Document the status of critical activities at regular intervals (every hour);' },
        { id: sid(CODE, 6), textFR: 'Consigner les ressources déployées, les coûts engagés et les décisions stratégiques ;', textEN: 'Record deployed resources, incurred costs, and strategic decisions;' },
        { id: sid(CODE, 7), textFR: 'Maintenir le journal à jour jusqu\'à la résolution complète de l\'incident ;', textEN: 'Keep the log up to date until complete resolution of the incident;' },
        { id: sid(CODE, 8), textFR: 'Fermer officiellement le journal en notant l\'heure de résolution et les critères de retour à la normale atteints ;', textEN: 'Officially close the log noting the resolution time and normal operations criteria met;' },
        { id: sid(CODE, 9), textFR: 'Conserver le journal de bord comme document officiel pour le rapport post-incident.', textEN: 'Retain the incident log as an official document for the post-incident report.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-JOURNAL',
      roleLabelFR: 'Responsable du journal de bord',
      roleLabelEN: 'Log Keeper',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 10), textFR: 'Tenir le journal de bord en temps réel tout au long de l\'incident ;', textEN: 'Maintain the incident log in real time throughout the incident;' },
        { id: sid(CODE, 11), textFR: 'Documenter chaque entrée avec : heure, action/décision, responsable, résultat ;', textEN: 'Document each entry with: time, action/decision, responsible person, result;' },
        { id: sid(CODE, 12), textFR: 'Rappeler aux membres de la cellule de signaler toute action importante pour documentation ;', textEN: 'Remind team members to report any important action for documentation;' },
        { id: sid(CODE, 13), textFR: 'Préparer des résumés périodiques du statut pour les rapports de situation.', textEN: 'Prepare periodic status summaries for situation reports.', isBold: true },
      ],
    },
  ],
};