import { ProcedureTemplate, COLORS, sid } from '../types';

const CODE = 'PC022';

export const PC022_VERIFICATION_TI: ProcedureTemplate = {
  id: 'pc022_verification_ti',
  code: CODE,
  titleFR: 'VÉRIFICATION POST-INCIDENT DES SYSTÈMES TI',
  titleEN: 'POST-INCIDENT IT SYSTEMS VERIFICATION',
  headerColor: COLORS.blue,
  activationRule: 'always',
  documentTypes: ['PCA'],
  roleSections: [
    {
      roleCode: 'RESP-TI',
      roleLabelFR: 'Responsable TI',
      roleLabelEN: 'IT Manager',
      headerColor: COLORS.blue,
      steps: [
        { id: sid(CODE, 1), textFR: 'Effectuer un inventaire complet de tous les systèmes TI affectés par l\'incident ;', textEN: 'Perform a complete inventory of all IT systems affected by the incident;' },
        { id: sid(CODE, 2), textFR: 'Vérifier l\'intégrité de toutes les données critiques — comparer avec les sauvegardes de référence ;', textEN: 'Verify the integrity of all critical data — compare with reference backups;' },
        { id: sid(CODE, 3), textFR: 'Tester le fonctionnement de chaque application critique selon la liste du BIA ;', textEN: 'Test the functioning of each critical application according to the BIA list;' },
        { id: sid(CODE, 4), textFR: 'Vérifier la sécurité des accès et des authentifications — réinitialiser les mots de passe si nécessaire ;', textEN: 'Verify access security and authentications — reset passwords if necessary;', isRed: true },
        { id: sid(CODE, 5), textFR: 'Confirmer que les sauvegardes automatiques sont réactivées et fonctionnelles ;', textEN: 'Confirm that automatic backups are reactivated and functional;' },
        { id: sid(CODE, 6), textFR: 'Vérifier que les systèmes de sécurité informatique (antivirus, pare-feu) sont opérationnels et à jour ;', textEN: 'Verify that computer security systems (antivirus, firewall) are operational and up to date;' },
        { id: sid(CODE, 7), textFR: 'Tester les accès distants et les solutions de télétravail pour s\'assurer de leur disponibilité future ;', textEN: 'Test remote access and telework solutions to ensure their future availability;' },
        { id: sid(CODE, 8), textFR: 'Documenter toutes les anomalies détectées et les actions correctives apportées ;', textEN: 'Document all detected anomalies and corrective actions taken;' },
        { id: sid(CODE, 9), textFR: 'Produire un rapport TI post-incident incluant les recommandations d\'amélioration de la résilience.', textEN: 'Produce a post-incident IT report including recommendations for resilience improvement.', isBold: true },
      ],
    },
    {
      roleCode: 'COORD-PCA',
      roleLabelFR: 'Coordonnateur PCA',
      roleLabelEN: 'BCP Coordinator',
      headerColor: COLORS.red,
      steps: [
        { id: sid(CODE, 10), textFR: 'Recevoir et analyser le rapport TI post-incident ;', textEN: 'Receive and analyze the post-incident IT report;' },
        { id: sid(CODE, 11), textFR: 'Valider que les objectifs RTO et RPO ont été respectés pour chaque activité critique ;', textEN: 'Validate that RTO and RPO objectives were met for each critical activity;' },
        { id: sid(CODE, 12), textFR: 'Intégrer les recommandations TI dans le plan de mise à jour du PCA.', textEN: 'Integrate IT recommendations into the BCP update plan.', isBold: true },
      ],
    },
  ],
};