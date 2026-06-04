// ============================================================
// CORO — P021 : Incendie de véhicule électrique
// Toujours présent dans PMU et PSI
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P021';

export const P021_VE_INCENDIE: ProcedureTemplate = {
  id: 'p021_ve_incendie',
  code: CODE,
  titleFR: 'INCENDIE DE VÉHICULE ÉLECTRIQUE',
  titleEN: 'ELECTRIC VEHICLE FIRE',
  icon: '🔋',
  headerColor: COLORS.garnet,
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    // ── Coordonnateur d'urgence ────────────────────────────
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.garnet,
      steps: [
        // ── Confirmation de la situation ────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Confirmation de la situation**',
          textEN: '**Confirming the situation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Confirmer si l\'événement implique :',
          textEN: 'Confirm if the event involves:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 3),
              textFR: 'Batterie de chariot élévateur (intérieur entrepôt)',
              textEN: 'Forklift battery (interior warehouse)',
              isList: true,
            },
            {
              id: sid(CODE, 4),
              textFR: 'Borne de recharge extérieure pour véhicule',
              textEN: 'Exterior vehicle charging station',
              isList: true,
            },
          ],
        },
        // ── Appeler immédiatement le 9-1-1 ─────────────────
        {
          id: sid(CODE, 5),
          textFR: '**Appeler immédiatement le 9-1-1**',
          textEN: '**Call 9-1-1 immediately**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Composer le 9-1-1 et indiquer :',
          textEN: 'Dial 9-1-1 and indicate:',
          isBold: false,
        },
        {
          id: sid(CODE, 7),
          textFR: '« Incendie impliquant une batterie au lithium au [ADRESSE COMPLÈTE DU SITE], dans l\'entrepôt / ou à une borne de recharge extérieure. »',
          textEN: '"Fire involving a lithium battery at [COMPLETE SITE ADDRESS], in the warehouse / or at an exterior charging station."',
          isBold: false,
          isRed: true,
        },
        // ── Mesures d'évacuation ou de confinement ──────────
        {
          id: sid(CODE, 8),
          textFR: '**Mesures d\'évacuation ou de confinement**',
          textEN: '**Evacuation or containment measures**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 9),
          textFR: 'Si incendie à l\'extérieur (borne de recharge) :',
          textEN: 'If fire is outside (charging station):',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 10),
              textFR: 'Surveiller l\'évolution via les caméras',
              textEN: 'Monitor the evolution via cameras',
              isList: true,
            },
            {
              id: sid(CODE, 11),
              textFR: 'Interdire immédiatement l\'accès à la zone touchée',
              textEN: 'Immediately restrict access to the affected area',
              isList: true,
            },
            {
              id: sid(CODE, 12),
              textFR: 'Ne pas intervenir à proximité sauf pour la coupure de courant si sécuritaire',
              textEN: 'Do not intervene nearby except to cut power if safe to do so',
              isList: true,
            },
            {
              id: sid(CODE, 13),
              textFR: 'Se préparer à déclencher l\'évacuation si risque de propagation au bâtiment',
              textEN: 'Prepare to trigger evacuation if risk of spread to the building',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 14),
          textFR: 'Si incendie à l\'intérieur (centre de distribution ou borne de recharge intérieure) :',
          textEN: 'If fire is inside (distribution centre or interior charging station):',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 15),
              textFR: 'Déclencher l\'évacuation complète du bâtiment',
              textEN: 'Trigger complete building evacuation',
              isList: true,
            },
            {
              id: sid(CODE, 16),
              textFR: 'Utiliser un déclencheur manuel d\'alarme incendie si nécessaire',
              textEN: 'Use a manual fire alarm pull station if necessary',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 17),
          textFR: '⚠️ Les gicleurs ne peuvent pas éteindre un incendie de batterie lithium-ion — la fumée se propage rapidement par les conduits de ventilation. **Ne jamais tenter de déplacer le véhicule.**',
          textEN: '⚠️ Sprinklers cannot extinguish a lithium-ion battery fire — smoke spreads quickly through ventilation ducts. **Never attempt to move the vehicle.**',
          isBold: false,
          isRed: true,
        },
        // ── Informer les gestionnaires via Teams ────────────
        {
          id: sid(CODE, 18),
          textFR: '**Informer les gestionnaires via Teams**',
          textEN: '**Inform managers via Teams**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 19),
          textFR: 'Message si incendie à l\'intérieur :',
          textEN: 'Message if fire is inside:',
          isBold: false,
        },
        {
          id: sid(CODE, 20),
          textFR: '« ALARME INCENDIE – évacuation immédiate de tout le bâtiment. Suivez les procédures d\'évacuation. »',
          textEN: '"FIRE ALARM – immediate evacuation of the entire building. Follow evacuation procedures."',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 21),
          textFR: 'Message si incendie à l\'extérieur :',
          textEN: 'Message if fire is outside:',
          isBold: false,
        },
        {
          id: sid(CODE, 22),
          textFR: '« INCENDIE au niveau du stationnement [préciser le secteur] – évitez le secteur. »',
          textEN: '"FIRE at parking level [specify sector] – avoid the area."',
          isBold: false,
          isRed: true,
        },
        // ── Coupure d'alimentation — borne extérieure ───────
        {
          id: sid(CODE, 23),
          textFR: '**Coupure d\'alimentation — borne extérieure**',
          textEN: '**Power cutoff — exterior charging station**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 24),
          textFR: 'Si borne impliquée :',
          textEN: 'If charging station is involved:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 25),
              textFR: 'Envoyer un agent ou personnel désigné',
              textEN: 'Send a designated agent or personnel',
              isList: true,
            },
            {
              id: sid(CODE, 26),
              textFR: 'Couper le disjoncteur principal des bornes',
              textEN: 'Cut the main circuit breaker for the charging stations',
              isList: true,
            },
            {
              id: sid(CODE, 27),
              textFR: 'Ne pas approcher si la borne est en feu ou enfumée',
              textEN: 'Do not approach if the station is on fire or smoky',
              isList: true,
            },
          ],
        },
        // ── Interdiction d'intervention ─────────────────────
        {
          id: sid(CODE, 28),
          textFR: '**Interdiction d\'intervention**',
          textEN: '**Prohibition of intervention**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 29),
          textFR: 'Ne pas tenter d\'extinction',
          textEN: 'Do not attempt to extinguish',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Intervention réservée au Service de sécurité incendie municipal — les pompiers doivent arroser sous l\'habitacle pour atteindre et refroidir les batteries',
          textEN: 'Intervention reserved for the municipal fire safety service — firefighters must spray under the vehicle to reach and cool the batteries',
          isBold: false,
          isRed: true,
        },
        // ── Collaboration avec le service d'incendie ────────
        {
          id: sid(CODE, 31),
          textFR: '**Collaboration avec le service d\'incendie**',
          textEN: '**Collaboration with the fire department**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 32),
          textFR: 'Fournir :',
          textEN: 'Provide:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 33),
              textFR: 'Localisation exacte de l\'incendie',
              textEN: 'Exact location of the fire',
              isList: true,
            },
            {
              id: sid(CODE, 34),
              textFR: 'Nature du matériel impliqué',
              textEN: 'Nature of the equipment involved',
              isList: true,
            },
            {
              id: sid(CODE, 35),
              textFR: 'Plan des lieux et accès rapides',
              textEN: 'Site plan and quick access routes',
              isList: true,
            },
            {
              id: sid(CODE, 36),
              textFR: 'Information sur coupure de courant (si applicable)',
              textEN: 'Information on power cutoff (if applicable)',
              isList: true,
            },
          ],
        },
        // ── Documentation post-événement ────────────────────
        {
          id: sid(CODE, 37),
          textFR: '**Documentation post-événement**',
          textEN: '**Post-event documentation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 38),
          textFR: 'Rédiger un rapport incluant :',
          textEN: 'Write a report including:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 39),
              textFR: 'Heure, secteur touché, cause probable',
              textEN: 'Time, affected sector, probable cause',
              isList: true,
            },
            {
              id: sid(CODE, 40),
              textFR: 'Mesures prises',
              textEN: 'Measures taken',
              isList: true,
            },
            {
              id: sid(CODE, 41),
              textFR: 'Communications avec les services d\'urgence',
              textEN: 'Communications with emergency services',
              isList: true,
            },
            {
              id: sid(CODE, 42),
              textFR: 'Dommages observés',
              textEN: 'Observed damage',
              isList: true,
            },
            {
              id: sid(CODE, 43),
              textFR: 'Photos ou captures caméra (si disponibles)',
              textEN: 'Photos or camera captures (if available)',
              isList: true,
            },
          ],
        },
      ],
    },
    // ── Équipe de première intervention ───────────────────
    {
      roleCode: 'ROLE-EPI',
      roleLabelFR: 'Équipe de première intervention',
      roleLabelEN: 'First Response Team',
      headerColor: COLORS.garnet,
      steps: [
        // ── Surveillance — signes de défaillance ────────────
        {
          id: sid(CODE, 44),
          textFR: '**Surveillance — Signes de défaillance d\'une batterie**',
          textEN: '**Surveillance — Signs of battery failure**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 45),
          textFR: 'Observer lors des rondes ou après signalement :',
          textEN: 'Observe during rounds or after a report:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 46),
              textFR: 'Échauffement anormal de la batterie',
              textEN: 'Abnormal battery overheating',
              isList: true,
            },
            {
              id: sid(CODE, 47),
              textFR: 'Fuite ou suintement suspect',
              textEN: 'Suspicious leak or seepage',
              isList: true,
            },
            {
              id: sid(CODE, 48),
              textFR: 'Gonflement ou déformation du boîtier',
              textEN: 'Swelling or deformation of the casing',
              isList: true,
            },
            {
              id: sid(CODE, 49),
              textFR: 'Odeur âcre, chimique ou de plastique brûlé',
              textEN: 'Acrid, chemical, or burning plastic smell',
              isList: true,
            },
            {
              id: sid(CODE, 50),
              textFR: 'Fumée blanche ou grise, même minime',
              textEN: 'White or grey smoke, even minimal',
              isList: true,
            },
            {
              id: sid(CODE, 51),
              textFR: 'Éclairs, étincelles ou crépitements',
              textEN: 'Sparks, flashes, or crackling sounds',
              isList: true,
            },
            {
              id: sid(CODE, 52),
              textFR: 'Voyant d\'alerte sur l\'interface du chariot',
              textEN: 'Warning light on the forklift interface',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 53),
          textFR: 'Si un ou plusieurs signes sont présents :',
          textEN: 'If one or more signs are present:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 54),
              textFR: 'Ne pas approcher',
              textEN: 'Do not approach',
              isList: true,
            },
            {
              id: sid(CODE, 55),
              textFR: 'Informer immédiatement le coordonnateur d\'urgence',
              textEN: 'Immediately inform the emergency coordinator',
              isList: true,
            },
          ],
        },
        // ── Confirmation de l'alerte ────────────────────────
        {
          id: sid(CODE, 56),
          textFR: '**Confirmation de l\'alerte**',
          textEN: '**Confirming the alert**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 57),
          textFR: 'Approcher avec précaution pour confirmer visuellement à distance sécuritaire',
          textEN: 'Approach with caution to visually confirm from a safe distance',
          isBold: false,
        },
        {
          id: sid(CODE, 58),
          textFR: 'Ne pas ouvrir ou toucher la batterie',
          textEN: 'Do not open or touch the battery',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 59),
          textFR: 'Aviser immédiatement le coordonnateur via cellulaire ou radio',
          textEN: 'Immediately notify the coordinator via cell phone or radio',
          isBold: false,
        },
        // ── Interdiction d'intervention ─────────────────────
        {
          id: sid(CODE, 60),
          textFR: '**Interdiction d\'intervention**',
          textEN: '**Prohibition of intervention**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 61),
          textFR: 'Ne pas utiliser d\'extincteur',
          textEN: 'Do not use a fire extinguisher',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 62),
          textFR: 'Se tenir à distance et éviter les vapeurs',
          textEN: 'Keep distance and avoid fumes',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 63),
          textFR: 'Empêcher l\'accès au secteur',
          textEN: 'Prevent access to the sector',
          isBold: false,
        },
        // ── Surveillance et contrôle des accès ──────────────
        {
          id: sid(CODE, 64),
          textFR: '**Surveillance et contrôle des accès**',
          textEN: '**Surveillance and access control**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 65),
          textFR: 'Feu extérieur (borne de recharge) :',
          textEN: 'Exterior fire (charging station):',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 66),
              textFR: 'Surveiller via caméras',
              textEN: 'Monitor via cameras',
              isList: true,
            },
            {
              id: sid(CODE, 67),
              textFR: 'Bloquer les accès au périmètre',
              textEN: 'Block access to the perimeter',
              isList: true,
            },
            {
              id: sid(CODE, 68),
              textFR: 'Attendre les directives du coordonnateur',
              textEN: 'Await coordinator directives',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 69),
          textFR: 'Feu intérieur (entrepôt) :',
          textEN: 'Interior fire (warehouse):',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 70),
              textFR: 'Faciliter l\'évacuation des zones adjacentes',
              textEN: 'Facilitate evacuation of adjacent areas',
              isList: true,
            },
            {
              id: sid(CODE, 71),
              textFR: 'Orienter les occupants vers les sorties prévues au plan',
              textEN: 'Direct occupants to exits indicated on the plan',
              isList: true,
            },
          ],
        },
        // ── Coordination avec le coordonnateur ──────────────
        {
          id: sid(CODE, 72),
          textFR: '**Coordination avec le Coordonnateur**',
          textEN: '**Coordination with the Coordinator**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 73),
          textFR: 'Fournir :',
          textEN: 'Provide:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 74),
              textFR: 'Nature de l\'événement (défaillance ou feu)',
              textEN: 'Nature of the event (failure or fire)',
              isList: true,
            },
            {
              id: sid(CODE, 75),
              textFR: 'Localisation exacte',
              textEN: 'Exact location',
              isList: true,
            },
            {
              id: sid(CODE, 76),
              textFR: 'Type d\'équipement impliqué',
              textEN: 'Type of equipment involved',
              isList: true,
            },
            {
              id: sid(CODE, 77),
              textFR: 'Présence de fumée, odeur, flammes',
              textEN: 'Presence of smoke, odour, flames',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 78),
          textFR: 'Attendre instructions pour toute coupure de courant à la tourelle si borne impliquée',
          textEN: 'Await instructions for any power cutoff to the station if a charging station is involved',
          isBold: false,
        },
        // ── Accueil du service incendie ─────────────────────
        {
          id: sid(CODE, 79),
          textFR: '**Accueil du service incendie**',
          textEN: '**Receiving the fire department**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 80),
          textFR: 'Diriger les pompiers vers :',
          textEN: 'Direct firefighters to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 81),
              textFR: 'Le foyer d\'incendie',
              textEN: 'The fire source',
              isList: true,
            },
            {
              id: sid(CODE, 82),
              textFR: 'L\'accès au panneau électrique de la tourelle (si borne)',
              textEN: 'Access to the electrical panel of the station (if charging station)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 83),
          textFR: 'Ne pas quitter le poste avant ordre',
          textEN: 'Do not leave your post until ordered',
          isBold: false,
        },
        // ── Documentation post-événement ────────────────────
        {
          id: sid(CODE, 84),
          textFR: '**Documentation post-événement**',
          textEN: '**Post-event documentation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 85),
          textFR: 'Inclure dans le rapport :',
          textEN: 'Include in the report:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 86),
              textFR: 'Heure de détection',
              textEN: 'Detection time',
              isList: true,
            },
            {
              id: sid(CODE, 87),
              textFR: 'Signes observés',
              textEN: 'Observed signs',
              isList: true,
            },
            {
              id: sid(CODE, 88),
              textFR: 'Emplacement exact',
              textEN: 'Exact location',
              isList: true,
            },
            {
              id: sid(CODE, 89),
              textFR: 'Actions entreprises',
              textEN: 'Actions taken',
              isList: true,
            },
            {
              id: sid(CODE, 90),
              textFR: 'Coordonnées du personnel impliqué',
              textEN: 'Contact information of involved personnel',
              isList: true,
            },
            {
              id: sid(CODE, 91),
              textFR: 'Détails des interactions avec le service incendie',
              textEN: 'Details of interactions with the fire department',
              isList: true,
            },
          ],
        },
      ],
    },
  ],
};