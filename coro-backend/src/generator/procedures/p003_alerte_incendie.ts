// ============================================================
// CORO — P003 : Déclenchement de l'alerte incendie
// Activé seulement si panneau double signal
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P003';

export const P003_ALERTE_INCENDIE: ProcedureTemplate = {
  id: 'p003_alerte_incendie',
  code: CODE,
  titleFR: 'DÉCLENCHEMENT DE L\'ALERTE INCENDIE',
  titleEN: 'FIRE ALERT ACTIVATION',
  icon: '🚨',
  headerColor: COLORS.orange,
  incidentCode: 'ALERTE_INCENDIE',
  activationRule: 'double_signal',
  documentTypes: ['PMU', 'PSI'],
  phase: 'alerte',
  roleSections: [
    // ── Agent de sécurité ──────────────────────────────────
    {
      roleCode: 'ROLE-AS',
      roleLabelFR: 'Agent de sécurité',
      roleLabelEN: 'Security Agent',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 1),
          textFR: '**Vérifiez** immédiatement le panneau d\'alarme incendie pour identifier la zone en alerte et confirmer la réception.',
          textEN: '**Verify** the fire alarm panel immediately to identify the alert zone and confirm reception.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 2),
          textFR: '**Enfilez** votre dossard pour être facilement identifiable.',
          textEN: '**Put on** your vest to be easily identifiable.',
          isBold: true,
        },
        {
          id: sid(CODE, 3),
          textFR: '**Informez** l\'équipe de première intervention du type de détection et de l\'emplacement précis.',
          textEN: '**Inform** the first response team of the type of detection and precise location.',
          isBold: true,
        },
        {
          id: sid(CODE, 4),
          textFR: '**Contactez** le 9-1-1 sans délai et fournissez :',
          textEN: '**Contact** 9-1-1 without delay and provide:',
          isBold: true,
          isRed: true,
          subSteps: [
            {
              id: sid(CODE, 5),
              textFR: 'L\'adresse complète du bâtiment : [ADRESSE COMPLÈTE DU SITE] ;',
              textEN: 'The complete building address: [COMPLETE SITE ADDRESS];',
              isList: true,
            },
            {
              id: sid(CODE, 6),
              textFR: 'Le secteur concerné ;',
              textEN: 'The affected sector;',
              isList: true,
            },
            {
              id: sid(CODE, 7),
              textFR: 'La nature de la détection.',
              textEN: 'The nature of the detection.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 8),
          textFR: '**Communiquez** avec les personnes ayant besoin d\'assistance à l\'évacuation pour confirmer leur présence dans les zones concernées.',
          textEN: '**Communicate** with persons requiring evacuation assistance to confirm their presence in the affected zones.',
          isBold: true,
        },
        {
          id: sid(CODE, 9),
          textFR: '**Recevez et évaluez** le rapport initial de l\'équipe de première intervention.',
          textEN: '**Receive and evaluate** the initial report from the first response team.',
          isBold: true,
        },
        {
          id: sid(CODE, 10),
          textFR: '**Coordonnez** la suite de l\'intervention :',
          textEN: '**Coordinate** the follow-up response:',
          isBold: true,
          subSteps: [
            {
              id: sid(CODE, 11),
              textFR: 'Si l\'alerte est non fondée, laissez le service d\'incendie silencer et réarmer le panneau après leur vérification ;',
              textEN: 'If the alert is unfounded, allow the fire department to silence and reset the panel after verification;',
              isList: true,
            },
            {
              id: sid(CODE, 12),
              textFR: 'Si l\'alerte est fondée, activez l\'alarme générale et appliquez la procédure de déclenchement de l\'alarme incendie.',
              textEN: 'If the alert is confirmed, activate the general alarm and apply the fire alarm activation procedure.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 13),
          textFR: '**Accueillez et assistez** le service d\'incendie à leur arrivée en fournissant les informations et l\'accès nécessaires.',
          textEN: '**Welcome and assist** the fire department upon arrival by providing necessary information and access.',
          isBold: true,
        },
        {
          id: sid(CODE, 14),
          textFR: '**Participez** au débriefing avec l\'équipe d\'urgence.',
          textEN: '**Participate** in the debriefing with the emergency team.',
          isBold: true,
        },
        {
          id: sid(CODE, 15),
          textFR: '**Rédigez** un rapport détaillé de l\'incident, des actions prises et des leçons apprises.',
          textEN: '**Write** a detailed report of the incident, actions taken, and lessons learned.',
          isBold: true,
        },
        {
          id: sid(CODE, 16),
          textFR: '**Mettez à jour** le PMU en fonction des retours d\'expérience.',
          textEN: '**Update** the ERP based on feedback.',
          isBold: true,
        },
      ],
    },
    // ── Coordonnateur d'urgence ────────────────────────────
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 17),
          textFR: '**Dirigez-vous** rapidement au poste de commandement.',
          textEN: '**Proceed** immediately to the command post.',
          isBold: true,
        },
        {
          id: sid(CODE, 18),
          textFR: '**Récupérez** votre dossard et le moyen de communication préétabli.',
          textEN: '**Retrieve** your vest and the pre-established communication device.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 19),
          textFR: '**Déléguez** les rôles et tâches à l\'équipe d\'urgence en attente d\'une alarme générale.',
          textEN: '**Delegate** roles and tasks to the emergency team pending a general alarm.',
          isBold: true,
        },
        {
          id: sid(CODE, 20),
          textFR: '**Recevez** le rapport initial de l\'équipe de première intervention.',
          textEN: '**Receive** the initial report from the first response team.',
          isBold: true,
        },
        {
          id: sid(CODE, 21),
          textFR: '**Coordonnez** la suite de l\'intervention :',
          textEN: '**Coordinate** the follow-up intervention:',
          isBold: true,
          subSteps: [
            {
              id: sid(CODE, 22),
              textFR: 'Si l\'alerte est non fondée, laissez le service d\'incendie silencer et réarmer le panneau ;',
              textEN: 'If the alert is unfounded, allow the fire department to silence and reset the panel;',
              isList: true,
            },
            {
              id: sid(CODE, 23),
              textFR: 'Si l\'alerte est fondée, activez l\'alarme générale et appliquez la procédure d\'évacuation.',
              textEN: 'If the alert is confirmed, activate the general alarm and apply the evacuation procedure.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 24),
          textFR: '**Fournissez** le rapport d\'événement au service d\'incendie à leur arrivée.',
          textEN: '**Provide** the incident report to the fire department upon arrival.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 25),
          textFR: '**Dirigez** le compte rendu avec l\'équipe d\'urgence.',
          textEN: '**Lead** the debriefing with the emergency team.',
          isBold: true,
        },
        {
          id: sid(CODE, 26),
          textFR: '**Rédigez** un rapport détaillé de l\'incident.',
          textEN: '**Write** a detailed incident report.',
          isBold: true,
        },
        {
          id: sid(CODE, 27),
          textFR: '**Mettez à jour** le PMU en fonction des retours d\'expérience.',
          textEN: '**Update** the ERP based on feedback.',
          isBold: true,
        },
      ],
    },
    // ── Équipe de première intervention ───────────────────
    {
      roleCode: 'ROLE-EPI',
      roleLabelFR: 'Équipe de première intervention',
      roleLabelEN: 'First Response Team',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 28),
          textFR: '**Cessez** immédiatement toute activité dès le retentissement de l\'alerte et **montez** le son de votre walkie-talkie.',
          textEN: '**Stop** all activity immediately upon the alert and **turn up** your walkie-talkie volume.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 29),
          textFR: '**Dirigez-vous** vers la zone en alerte après avoir reçu les informations du coordonnateur d\'urgence.',
          textEN: '**Proceed** to the alert zone after receiving information from the emergency coordinator.',
          isBold: true,
        },
        {
          id: sid(CODE, 30),
          textFR: '**Munissez-vous** d\'un extincteur portatif avant d\'entrer dans la zone concernée.',
          textEN: '**Bring** a portable fire extinguisher before entering the concerned area.',
          isBold: true,
        },
        {
          id: sid(CODE, 31),
          textFR: '**Assurez-vous** d\'être accompagné d\'un autre membre de l\'équipe d\'urgence.',
          textEN: '**Ensure** you are accompanied by another emergency team member.',
          isBold: true,
        },
        {
          id: sid(CODE, 32),
          textFR: '**Informez** le coordonnateur d\'urgence de vos constatations et maintenez une communication régulière.',
          textEN: '**Inform** the emergency coordinator of your findings and maintain regular communication.',
          isBold: true,
        },
        {
          id: sid(CODE, 33),
          textFR: '**Évacuez** toute personne présente dans la zone à risque.',
          textEN: '**Evacuate** all persons present in the risk zone.',
          isBold: true,
        },
        {
          id: sid(CODE, 34),
          textFR: '**Si l\'alerte est non fondée :**',
          textEN: '**If the alert is unfounded:**',
          isBold: true,
          subSteps: [
            {
              id: sid(CODE, 35),
              textFR: 'Annoncez au coordonnateur d\'urgence qu\'aucun danger immédiat n\'est constaté.',
              textEN: 'Notify the emergency coordinator that no immediate danger is detected.',
              isList: true,
            },
            {
              id: sid(CODE, 36),
              textFR: 'Restez sur place jusqu\'à l\'arrivée du service d\'incendie.',
              textEN: 'Remain on site until the fire department arrives.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 37),
          textFR: '**Si l\'alerte est fondée :**',
          textEN: '**If the alert is confirmed:**',
          isBold: true,
          isRed: true,
          subSteps: [
            {
              id: sid(CODE, 38),
              textFR: 'Activez l\'alarme générale en insérant une clé dans la station manuelle d\'alarme incendie.',
              textEN: 'Activate the general alarm by inserting a key into the manual fire alarm station.',
              isList: true,
              isCommentable: true,
            },
            {
              id: sid(CODE, 39),
              textFR: 'Informez le coordonnateur d\'urgence de la situation et des actions menées.',
              textEN: 'Inform the emergency coordinator of the situation and actions taken.',
              isList: true,
            },
            {
              id: sid(CODE, 40),
              textFR: 'Utilisez un extincteur pour maîtriser un début d\'incendie seulement si vous êtes formé et que la situation est sécuritaire.',
              textEN: 'Use a fire extinguisher to control an early-stage fire only if trained and the situation is safe.',
              isList: true,
            },
            {
              id: sid(CODE, 41),
              textFR: 'Aidez à faire évacuer les occupants du secteur immédiat.',
              textEN: 'Help evacuate occupants from the immediate area.',
              isList: true,
            },
            {
              id: sid(CODE, 42),
              textFR: 'Évacuez les lieux et rejoignez le poste de commandement.',
              textEN: 'Evacuate the premises and report to the command post.',
              isList: true,
            },
          ],
        },
      ],
    },
    // ── Responsable mécanique ──────────────────────────────
    {
      roleCode: 'ROLE-RM',
      roleLabelFR: 'Responsable mécanique du bâtiment',
      roleLabelEN: 'Building Mechanical Supervisor',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 43),
          textFR: '**Rendez-vous** au poste de commandement dès réception du message du coordonnateur d\'urgence.',
          textEN: '**Report** to the command post upon receiving the message from the emergency coordinator.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 44),
          textFR: '**Écoutez** attentivement les directives du coordonnateur d\'urgence et soyez prêt à agir selon les besoins.',
          textEN: '**Listen** carefully to the emergency coordinator\'s directives and be ready to act as needed.',
          isBold: true,
        },
        {
          id: sid(CODE, 45),
          textFR: '**Restez** disponible pour fournir des informations précises sur les systèmes mécaniques et électriques du bâtiment.',
          textEN: '**Remain** available to provide precise information on the building\'s mechanical and electrical systems.',
          isBold: true,
        },
        {
          id: sid(CODE, 46),
          textFR: '**Surveillez** les systèmes critiques (ventilation, gaz, électricité) selon les directives.',
          textEN: '**Monitor** critical systems (ventilation, gas, electricity) as directed.',
          isBold: true,
        },
        {
          id: sid(CODE, 47),
          textFR: '**Ajustez** rapidement vos actions si la situation passe d\'une alerte à une alarme incendie.',
          textEN: '**Quickly adjust** your actions if the situation escalates from an alert to a fire alarm.',
          isBold: true,
        },
        {
          id: sid(CODE, 48),
          textFR: '**Participez** au compte rendu post-incident.',
          textEN: '**Participate** in the post-incident review.',
          isBold: true,
        },
      ],
    },
    // ── Responsable du point de rassemblement ──────────────
    {
      roleCode: 'ROLE-RPR',
      roleLabelFR: 'Responsable du point de rassemblement',
      roleLabelEN: 'Assembly Point Supervisor',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 49),
          textFR: '**Confirmez** immédiatement votre présence auprès du poste de commandement.',
          textEN: '**Confirm** your presence at the command post immediately.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 50),
          textFR: '**Récupérez** l\'équipement nécessaire :',
          textEN: '**Retrieve** the necessary equipment:',
          isBold: true,
          subSteps: [
            {
              id: sid(CODE, 51),
              textFR: 'Dossard pour être facilement identifiable ;',
              textEN: 'Vest to be easily identifiable;',
              isList: true,
              isCommentable: true,
            },
            {
              id: sid(CODE, 52),
              textFR: 'Registre des secteurs d\'évacuation et stylo ;',
              textEN: 'Sector evacuation register and pen;',
              isList: true,
              isCommentable: true,
            },
            {
              id: sid(CODE, 53),
              textFR: 'Walkie-talkie pour communiquer avec le poste de commandement.',
              textEN: 'Walkie-talkie to communicate with the command post.',
              isList: true,
              isCommentable: true,
            },
          ],
        },
        {
          id: sid(CODE, 54),
          textFR: '**Vérifiez** l\'état du point de rassemblement désigné.',
          textEN: '**Verify** the status of the designated assembly point.',
          isBold: true,
        },
        {
          id: sid(CODE, 55),
          textFR: '**Organisez** préliminairement le point de rassemblement sans diriger les occupants tant qu\'aucune évacuation n\'est ordonnée.',
          textEN: '**Organize** the assembly point preliminarily without directing occupants until an evacuation is ordered.',
          isBold: true,
        },
        {
          id: sid(CODE, 56),
          textFR: '**Maintenez** une communication régulière avec le coordonnateur d\'urgence.',
          textEN: '**Maintain** regular communication with the emergency coordinator.',
          isBold: true,
        },
        {
          id: sid(CODE, 57),
          textFR: '**Participez** au compte rendu post-alerte.',
          textEN: '**Participate** in the post-alert review.',
          isBold: true,
        },
      ],
    },
    // ── Surveillant de sortie ──────────────────────────────
    {
      roleCode: 'ROLE-SS',
      roleLabelFR: 'Surveillant de sortie',
      roleLabelEN: 'Exit Monitor',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 58),
          textFR: '**Dirigez-vous** immédiatement au poste de commandement pour obtenir une mise à jour.',
          textEN: '**Proceed** immediately to the command post for a situation update.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 59),
          textFR: '**Récupérez** un dossard et un moyen de communication.',
          textEN: '**Retrieve** a vest and a communication device.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 60),
          textFR: '**Vérifiez** que la voie d\'évacuation est claire et dégagée.',
          textEN: '**Verify** that the evacuation route is clear and unobstructed.',
          isBold: true,
        },
        {
          id: sid(CODE, 61),
          textFR: '**Retirez** tout obstacle bloquant la voie d\'évacuation.',
          textEN: '**Remove** any obstacle blocking the evacuation route.',
          isBold: true,
        },
        {
          id: sid(CODE, 62),
          textFR: '**Soyez** prêt à diriger les occupants si l\'alarme est activée ou si des instructions d\'évacuation sont données.',
          textEN: '**Be** ready to direct occupants if the alarm is activated or evacuation instructions are given.',
          isBold: true,
        },
        {
          id: sid(CODE, 63),
          textFR: '**Participez** au compte rendu avec l\'équipe d\'évacuation.',
          textEN: '**Participate** in the debrief with the evacuation team.',
          isBold: true,
        },
      ],
    },
    // ── Brigadier ─────────────────────────────────────────
    {
      roleCode: 'ROLE-BRI',
      roleLabelFR: 'Brigadier',
      roleLabelEN: 'Floor Warden',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 64),
          textFR: '**Dirigez-vous** immédiatement au poste de commandement.',
          textEN: '**Proceed** immediately to the command post.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 65),
          textFR: '**Récupérez** un dossard et une pancarte d\'arrêt.',
          textEN: '**Retrieve** a vest and a stop sign.',
          isBold: true,
        },
        {
          id: sid(CODE, 66),
          textFR: '**Assurez-vous** de disposer d\'un moyen de communication.',
          textEN: '**Ensure** you have a communication device.',
          isBold: true,
        },
        {
          id: sid(CODE, 67),
          textFR: '**Soyez** prêt à diriger les occupants vers les sorties si l\'alarme est activée.',
          textEN: '**Be** ready to direct occupants to exits if the alarm is activated.',
          isBold: true,
        },
        {
          id: sid(CODE, 68),
          textFR: '**Participez** au compte rendu avec l\'équipe d\'évacuation.',
          textEN: '**Participate** in the debrief with the evacuation team.',
          isBold: true,
        },
      ],
    },
    // ── Responsable de secteur ────────────────────────────
    {
      roleCode: 'ROLE-RS',
      roleLabelFR: 'Responsable de secteur',
      roleLabelEN: 'Sector Supervisor',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 69),
          textFR: '**Informez** les occupants de l\'alerte et demandez qu\'ils cessent leurs activités et se préparent à une éventuelle évacuation.',
          textEN: '**Inform** occupants of the alert and ask them to stop activities and prepare for a possible evacuation.',
          isBold: true,
        },
        {
          id: sid(CODE, 70),
          textFR: '**Demandez** aux occupants de se regrouper et d\'attendre les instructions.',
          textEN: '**Ask** occupants to gather and await instructions.',
          isBold: true,
        },
        {
          id: sid(CODE, 71),
          textFR: '**Vérifiez** que tous connaissent l\'emplacement des sorties de secours.',
          textEN: '**Verify** that all occupants know the location of emergency exits.',
          isBold: true,
        },
        {
          id: sid(CODE, 72),
          textFR: '**Assurez-vous** que les voies d\'évacuation sont dégagées.',
          textEN: '**Ensure** evacuation routes are clear.',
          isBold: true,
        },
        {
          id: sid(CODE, 73),
          textFR: '**Observez** en continu la situation et soyez prêt à évacuer sur ordre.',
          textEN: '**Continuously monitor** the situation and be ready to evacuate on order.',
          isBold: true,
        },
        {
          id: sid(CODE, 74),
          textFR: '**Maintenez** le calme et la sécurité des occupants.',
          textEN: '**Maintain** calm and the safety of occupants.',
          isBold: true,
        },
        {
          id: sid(CODE, 75),
          textFR: '**Aidez** les personnes ayant besoin d\'assistance.',
          textEN: '**Assist** persons requiring special assistance.',
          isBold: true,
        },
      ],
    },
    // ── Chercheur ─────────────────────────────────────────
    {
      roleCode: 'ROLE-CHE',
      roleLabelFR: 'Chercheur(s)',
      roleLabelEN: 'Searcher(s)',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 76),
          textFR: '**Cessez** immédiatement toute activité dès le signal d\'alerte.',
          textEN: '**Stop** all activity immediately upon the alert signal.',
          isBold: true,
        },
        {
          id: sid(CODE, 77),
          textFR: '**Si le danger est visible ou imminent, quittez immédiatement les lieux en suivant l\'itinéraire d\'évacuation prévu.**',
          textEN: '**If danger is visible or imminent, leave the premises immediately following the planned evacuation route.**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 78),
          textFR: '**Préparez-vous** à effectuer une recherche méthodique dans votre zone attribuée.',
          textEN: '**Prepare** to conduct a methodical search in your assigned zone.',
          isBold: true,
        },
        {
          id: sid(CODE, 79),
          textFR: '**Ne commencez pas** l\'évacuation sans instruction explicite.',
          textEN: '**Do not begin** evacuation without explicit instruction.',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 80),
          textFR: '**Restez** en contact avec le responsable de secteur.',
          textEN: '**Stay** in contact with the sector supervisor.',
          isBold: true,
        },
      ],
    },
    // ── Accompagnateur PPNAE ──────────────────────────────
    {
      roleCode: 'ROLE-ACC',
      roleLabelFR: 'Accompagnateur pour personne nécessitant l\'aide à l\'évacuation',
      roleLabelEN: 'Evacuation Assistance Companion',
      headerColor: COLORS.yellow,
      steps: [
        {
          id: sid(CODE, 81),
          textFR: '**Localisez** immédiatement la personne avec qui vous êtes jumelé.',
          textEN: '**Locate** the person you are paired with immediately.',
          isBold: true,
          isCommentable: true,
        },
        {
          id: sid(CODE, 82),
          textFR: '**Évaluez** rapidement l\'environnement pour détecter fumée, odeur ou autres signes d\'incendie.',
          textEN: '**Quickly evaluate** the environment for smoke, odor, or other signs of fire.',
          isBold: true,
        },
        {
          id: sid(CODE, 83),
          textFR: '**Si le danger est visible ou imminent, quittez immédiatement les lieux.**',
          textEN: '**If danger is visible or imminent, leave the premises immediately.**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 84),
          textFR: '**Dirigez-vous** vers un lieu sécuritaire à proximité des sorties de secours.',
          textEN: '**Move** to a safe location near emergency exits.',
          isBold: true,
        },
        {
          id: sid(CODE, 85),
          textFR: '**Restez** vigilant et attentif à tout changement ou nouvelle directive.',
          textEN: '**Remain** vigilant and attentive to any changes or new directives.',
          isBold: true,
        },
        {
          id: sid(CODE, 86),
          textFR: '**Reprenez** vos activités normales lorsque l\'alerte est levée.',
          textEN: '**Resume** normal activities when the alert is lifted.',
          isBold: true,
        },
      ],
    },
  ],
};