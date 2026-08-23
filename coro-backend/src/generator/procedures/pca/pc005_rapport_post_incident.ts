import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC005';

export const PC005_RAPPORT_POST_INCIDENT: ProcedureTemplate = {
  id: 'pc005_rapport_post_incident',
  code: CODE,
  titleFR: 'RAPPORT POST-INCIDENT ET LEÇONS APPRISES',
  titleEN: 'POST-INCIDENT REPORT AND LESSONS LEARNED',
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
        { id: sid(CODE, 1), textFR: 'Initier le rapport post-incident dans les 72 heures suivant la résolution de l\'incident ;', textEN: 'Initiate the post-incident report within 72 hours of incident resolution;' },
        { id: sid(CODE, 2), textFR: 'Convoquer une réunion de debriefing avec tous les membres de la cellule ayant participé à la gestion de l\'incident ;', textEN: 'Convene a debriefing meeting with all team members who participated in incident management;' },
        { id: sid(CODE, 3), textFR: 'Compiler la chronologie complète de l\'incident à partir du journal de bord ;', textEN: 'Compile the complete incident timeline from the incident log;' },
        { id: sid(CODE, 4), textFR: 'Documenter l\'impact réel sur chaque activité critique et comparer avec les objectifs RTO/RPO/MAD ;', textEN: 'Document the actual impact on each critical activity and compare with RTO/RPO/MAD objectives;' },
        { id: sid(CODE, 5), textFR: 'Identifier ce qui a bien fonctionné et ce qui doit être amélioré ;', textEN: 'Identify what worked well and what needs to be improved;' },
        { id: sid(CODE, 6), textFR: 'Définir les actions correctives avec responsables et échéances ;', textEN: 'Define corrective actions with responsible parties and deadlines;' },
        { id: sid(CODE, 7), textFR: 'Déterminer si le PCA doit être mis à jour suite aux leçons apprises ;', textEN: 'Determine if the BCP needs to be updated based on lessons learned;' },
        { id: sid(CODE, 8), textFR: 'Soumettre le rapport final à la direction générale pour approbation ;', textEN: 'Submit the final report to senior management for approval;' },
        { id: sid(CODE, 9), textFR: 'Archiver le rapport post-incident comme document officiel de l\'organisation.', textEN: 'Archive the post-incident report as an official organizational document.', isBold: true },
      ],
    },
    {
      roleCode: 'DIR-GENERAL',
      roleLabelFR: 'Direction générale',
      roleLabelEN: 'Senior Management',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 10), textFR: 'Participer à la réunion de debriefing post-incident ;', textEN: 'Participate in the post-incident debriefing meeting;' },
        { id: sid(CODE, 11), textFR: 'Approuver le rapport post-incident et les actions correctives ;', textEN: 'Approve the post-incident report and corrective actions;' },
        { id: sid(CODE, 12), textFR: 'Allouer les ressources nécessaires pour mettre en œuvre les améliorations identifiées ;', textEN: 'Allocate necessary resources to implement identified improvements;' },
        { id: sid(CODE, 13), textFR: 'S\'assurer que les leçons apprises sont intégrées dans les prochaines révisions du PCA.', textEN: 'Ensure lessons learned are integrated into the next BCP revisions.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-OPERATIONS',
      roleLabelFR: 'Responsable des opérations',
      roleLabelEN: 'Operations Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 14), textFR: 'Documenter l\'impact opérationnel réel de l\'incident ;', textEN: 'Document the actual operational impact of the incident;' },
        { id: sid(CODE, 15), textFR: 'Identifier les lacunes dans les stratégies de continuité opérationnelles ;', textEN: 'Identify gaps in operational continuity strategies;' },
        { id: sid(CODE, 16), textFR: 'Proposer des améliorations aux procédures de continuité.', textEN: 'Propose improvements to continuity procedures.', isBold: true },
      ],
    },
  ],
};