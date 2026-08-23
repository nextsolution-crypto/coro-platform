import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC021';

export const PC021_RETOUR_NORMAL: ProcedureTemplate = {
  id: 'pc021_retour_normal',
  code: CODE,
  titleFR: 'RETOUR AUX ACTIVITÉS NORMALES',
  titleEN: 'RETURN TO NORMAL OPERATIONS',
  headerColor: COLORS.green,
  activationRule: 'always',
  documentTypes: ['PCA'],
  roleSections: [
    {
      roleCode: 'COORD-PCA',
      roleLabelFR: 'Coordonnateur PCA',
      roleLabelEN: 'BCP Coordinator',
      headerColor: COLORS.red,
      steps: [
        { id: sid(CODE, 1), textFR: 'Confirmer que les critères de retour à la normale sont atteints — incident résolu, systèmes opérationnels, accès aux locaux rétabli ;', textEN: 'Confirm that return-to-normal criteria are met — incident resolved, systems operational, premises access restored;' },
        { id: sid(CODE, 2), textFR: 'Obtenir l\'autorisation de la direction générale pour déclarer la fin de l\'activation du PCA ;', textEN: 'Obtain senior management authorization to declare the end of BCP activation;' },
        { id: sid(CODE, 3), textFR: 'Communiquer officiellement la fin de l\'activation du PCA à tous les membres de la cellule et aux employés ;', textEN: 'Officially communicate the end of BCP activation to all team members and employees;' },
        { id: sid(CODE, 4), textFR: 'Coordonner le retour progressif aux activités normales selon l\'ordre inverse de la séquence de reprise ;', textEN: 'Coordinate gradual return to normal activities in reverse order of the recovery sequence;' },
        { id: sid(CODE, 5), textFR: 'S\'assurer que toutes les mesures de continuité temporaires sont levées de manière ordonnée ;', textEN: 'Ensure all temporary continuity measures are lifted in an orderly manner;' },
        { id: sid(CODE, 6), textFR: 'Fermer officiellement le journal de bord d\'incident ;', textEN: 'Officially close the incident log;' },
        { id: sid(CODE, 7), textFR: 'Initier le rapport post-incident dans les 72 heures suivant le retour à la normale ;', textEN: 'Initiate the post-incident report within 72 hours of return to normal;' },
        { id: sid(CODE, 8), textFR: 'Planifier la réunion de debriefing avec la cellule de gestion d\'incident.', textEN: 'Schedule the debriefing meeting with the incident management team.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-OPERATIONS',
      roleLabelFR: 'Responsable des opérations',
      roleLabelEN: 'Operations Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 9), textFR: 'Vérifier que toutes les activités critiques sont revenues à leur niveau de service normal ;', textEN: 'Verify that all critical activities have returned to their normal service level;' },
        { id: sid(CODE, 10), textFR: 'Annuler les commandes d\'urgence et les dispositions temporaires avec les fournisseurs alternatifs ;', textEN: 'Cancel emergency orders and temporary arrangements with alternative suppliers;' },
        { id: sid(CODE, 11), textFR: 'Communiquer aux clients le retour à la normale et les délais de rattrapage si applicable ;', textEN: 'Communicate the return to normal to clients and catch-up timelines if applicable;' },
        { id: sid(CODE, 12), textFR: 'Documenter les impacts résiduels et les actions de suivi requises.', textEN: 'Document residual impacts and required follow-up actions.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-TI',
      roleLabelFR: 'Responsable TI',
      roleLabelEN: 'IT Manager',
      headerColor: COLORS.blue,
      steps: [
        { id: sid(CODE, 13), textFR: 'Confirmer que tous les systèmes TI sont opérationnels et que les données sont intègres ;', textEN: 'Confirm that all IT systems are operational and data is intact;' },
        { id: sid(CODE, 14), textFR: 'Désactiver les accès et systèmes de secours temporaires ;', textEN: 'Deactivate temporary backup access and systems;' },
        { id: sid(CODE, 15), textFR: 'Effectuer une sauvegarde complète de vérification après le retour à la normale ;', textEN: 'Perform a complete verification backup after return to normal;' },
        { id: sid(CODE, 16), textFR: 'Documenter les leçons apprises sur le plan TI pour amélioration du PCA.', textEN: 'Document IT lessons learned for BCP improvement.', isBold: true },
      ],
    },
    {
      roleCode: 'RESP-RH',
      roleLabelFR: 'Responsable RH',
      roleLabelEN: 'HR Manager',
      headerColor: COLORS.slate,
      steps: [
        { id: sid(CODE, 17), textFR: 'Annuler les dispositions de télétravail ou de site alternatif et coordonner le retour au bureau ;', textEN: 'Cancel telework or alternate site arrangements and coordinate return to office;' },
        { id: sid(CODE, 18), textFR: 'Assurer le soutien psychologique aux employés ayant vécu un incident traumatisant si applicable ;', textEN: 'Provide psychological support to employees who experienced a traumatic incident if applicable;' },
        { id: sid(CODE, 19), textFR: 'Gérer les heures supplémentaires et les compensations liées à l\'incident.', textEN: 'Manage overtime and compensation related to the incident.', isBold: true },
      ],
    },
  ],
};