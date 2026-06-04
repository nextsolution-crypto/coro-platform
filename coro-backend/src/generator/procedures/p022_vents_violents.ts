// ============================================================
// CORO — P022 : Alerte vent violent
// Activé si : boma_certified
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P022';

export const P022_VENTS_VIOLENTS: ProcedureTemplate = {
  id: 'p022_vents_violents',
  code: CODE,
  titleFR: 'PROCÉDURES EN CAS DE VENTS VIOLENTS',
  titleEN: 'HIGH WINDS PROCEDURES',
  icon: '🌬️',
  headerColor: COLORS.steel,
  activationRule: 'boma_certified',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.steel,
      steps: [
        // ── Mandat ──────────────────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Mandat**',
          textEN: '**Mandate**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Assurer la sécurité des occupants et la protection du bâtiment lors d\'un épisode de vents violents, en anticipant les impacts possibles, en coordonnant les mesures de prévention et en maintenant une communication claire jusqu\'au retour à la normale',
          textEN: 'Ensure the safety of occupants and protection of the building during a high winds event, by anticipating possible impacts, coordinating preventive measures, and maintaining clear communication until return to normal',
          isBold: false,
        },
        // ── Déclenchement ───────────────────────────────────
        {
          id: sid(CODE, 3),
          textFR: '**Déclenchement**',
          textEN: '**Activation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 4),
          textFR: 'La procédure est déclenchée lorsqu\'un avis ou une alerte de vents violents est émis par les services météorologiques compétents, ou lorsqu\'une dégradation des conditions climatiques est observée pouvant représenter un danger pour les occupants ou le bâtiment',
          textEN: 'The procedure is activated when a high winds advisory or alert is issued by competent meteorological services, or when a deterioration of weather conditions is observed that could represent a danger to occupants or the building',
          isBold: false,
        },
        // ── Préparation ─────────────────────────────────────
        {
          id: sid(CODE, 5),
          textFR: '**Préparation**',
          textEN: '**Preparation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 6),
          textFR: '1. Surveillance et alerte :',
          textEN: '1. Surveillance and alert:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 7),
              textFR: 'Surveiller les bulletins météorologiques et recevoir les alertes de vents violents',
              textEN: 'Monitor weather bulletins and receive high winds alerts',
              isList: true,
            },
            {
              id: sid(CODE, 8),
              textFR: 'Informer immédiatement l\'équipe d\'urgence et les occupants du bâtiment de la situation',
              textEN: 'Immediately inform the emergency team and building occupants of the situation',
              isList: true,
            },
            {
              id: sid(CODE, 9),
              textFR: 'Demander aux locataires des étages supérieurs de rester éloignés des fenêtres afin d\'éviter tout risque de blessure en cas de bris de verre',
              textEN: 'Ask tenants on upper floors to stay away from windows to avoid any risk of injury in case of glass breakage',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 10),
          textFR: '2. Sécurisation du bâtiment :',
          textEN: '2. Building security:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 11),
              textFR: 'Vérifier et sécuriser les fenêtres, portes et autres ouvertures dans les zones exposées',
              textEN: 'Check and secure windows, doors, and other openings in exposed areas',
              isList: true,
            },
            {
              id: sid(CODE, 12),
              textFR: 'Assurer la rentrée du mobilier extérieur et la fermeture des zones à risque (terrasses, espaces ouverts)',
              textEN: 'Ensure outdoor furniture is brought in and risk areas are closed (terraces, open spaces)',
              isList: true,
            },
          ],
        },
        // ── Intervention ────────────────────────────────────
        {
          id: sid(CODE, 13),
          textFR: '**Intervention**',
          textEN: '**Intervention**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 14),
          textFR: '3. Coordination de la sécurité :',
          textEN: '3. Security coordination:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 15),
              textFR: 'Coordonner avec l\'équipe de sécurité pour surveiller l\'évolution de la situation',
              textEN: 'Coordinate with the security team to monitor the situation\'s evolution',
              isList: true,
            },
            {
              id: sid(CODE, 16),
              textFR: 'Orienter les occupants vers les zones sécuritaires à l\'intérieur du bâtiment, notamment des pièces sans fenêtres',
              textEN: 'Direct occupants to safe areas inside the building, particularly rooms without windows',
              isList: true,
            },
            {
              id: sid(CODE, 17),
              textFR: 'Éviter d\'utiliser les ascenseurs pendant l\'événement',
              textEN: 'Avoid using elevators during the event',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 18),
          textFR: '4. Assistance et directives aux occupants :',
          textEN: '4. Assistance and directives to occupants:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 19),
              textFR: 'Fournir une assistance aux occupants nécessitant de l\'aide pour se déplacer ou comprendre les consignes',
              textEN: 'Provide assistance to occupants who need help moving or understanding instructions',
              isList: true,
            },
            {
              id: sid(CODE, 20),
              textFR: 'Utiliser les moyens de communication disponibles (intercom, SMS, courriels) afin de maintenir une diffusion claire et uniforme des directives',
              textEN: 'Use available communication means (intercom, SMS, emails) to maintain clear and consistent distribution of directives',
              isList: true,
            },
          ],
        },
        // ── Communication ───────────────────────────────────
        {
          id: sid(CODE, 21),
          textFR: '**Communication**',
          textEN: '**Communication**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 22),
          textFR: '5. Mises à jour régulières :',
          textEN: '5. Regular updates:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 23),
              textFR: 'Maintenir une communication continue avec l\'équipe d\'urgence et, au besoin, avec les services externes (services météorologiques, police)',
              textEN: 'Maintain continuous communication with the emergency team and, if needed, with external services (meteorological services, police)',
              isList: true,
            },
            {
              id: sid(CODE, 24),
              textFR: 'Rapporter tout changement significatif ou tout problème observé à l\'équipe de gestion de l\'immeuble afin que des mesures adaptées soient prises rapidement',
              textEN: 'Report any significant change or observed problem to the building management team so that adapted measures can be taken quickly',
              isList: true,
            },
          ],
        },
        // ── Réintégration ───────────────────────────────────
        {
          id: sid(CODE, 25),
          textFR: '**Réintégration**',
          textEN: '**Re-entry**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 26),
          textFR: 'La réintégration des zones touchées s\'effectue uniquement lorsque les conditions météorologiques sont redevenues sécuritaires et après validation par le coordonnateur d\'urgence, en coordination avec la sécurité du bâtiment',
          textEN: 'Re-entry to affected areas occurs only when weather conditions have returned to safe levels and after validation by the emergency coordinator, in coordination with building security',
          isBold: false,
        },
        // ── À la suite de l'événement ───────────────────────
        {
          id: sid(CODE, 27),
          textFR: '**À la suite de l\'événement**',
          textEN: '**After the event**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 28),
          textFR: '6. Évaluation et compte rendu :',
          textEN: '6. Assessment and report:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 29),
              textFR: 'Évaluer les dommages éventuels au bâtiment, incluant les fenêtres, portes et équipements extérieurs, et initier les réparations nécessaires',
              textEN: 'Assess any damage to the building, including windows, doors, and exterior equipment, and initiate necessary repairs',
              isList: true,
            },
            {
              id: sid(CODE, 30),
              textFR: 'Organiser un compte rendu avec l\'équipe d\'urgence afin d\'analyser la réponse apportée et d\'identifier les pistes d\'amélioration',
              textEN: 'Organize a debrief with the emergency team to analyze the response and identify areas for improvement',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 31),
          textFR: '7. Documentation :',
          textEN: '7. Documentation:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 32),
              textFR: 'Documenter l\'événement, les actions prises et les leçons apprises',
              textEN: 'Document the event, actions taken, and lessons learned',
              isList: true,
            },
            {
              id: sid(CODE, 33),
              textFR: 'Actualiser le Plan de mesures d\'urgence (PMU) en intégrant les ajustements requis pour renforcer les procédures futures',
              textEN: 'Update the Emergency Response Plan (ERP) by integrating required adjustments to strengthen future procedures',
              isList: true,
            },
          ],
        },
        // ── Note importante ─────────────────────────────────
        {
          id: sid(CODE, 34),
          textFR: '⚠️ Les vents violents peuvent provoquer des projectiles, des bris de verre et des dommages structuraux secondaires. La priorité demeure la mise à l\'abri des occupants à l\'intérieur du bâtiment, loin des façades exposées et des surfaces vitrées.',
          textEN: '⚠️ High winds can cause projectiles, glass breakage, and secondary structural damage. The priority remains sheltering occupants inside the building, away from exposed facades and glass surfaces.',
          isBold: false,
          isRed: true,
        },
        // ── Messages types ──────────────────────────────────
        {
          id: sid(CODE, 35),
          textFR: '**Messages types à diffuser aux occupants** *(Les messages doivent être mentionnés 2 fois de suite)*',
          textEN: '**Standard messages to broadcast to occupants** *(Messages must be repeated twice consecutively)*',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 36),
          textFR: 'Cadence recommandée : au minimum toutes les 15 minutes, immédiatement lors de tout changement, à la levée des mesures',
          textEN: 'Recommended cadence: at least every 15 minutes, immediately upon any change, when measures are lifted',
          isBold: false,
        },
        {
          id: sid(CODE, 37),
          textFR: '① Alerte préventive (vents violents annoncés) — canaux : courriel, affichage, SMS, intranet :',
          textEN: '① Early warning (high winds forecast) — channels: email, display, SMS, intranet:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 38),
          textFR: 'ALERTE MÉTÉO – VENTS VIOLENTS PRÉVUS. ATTENTION ATTENTION. Des vents violents sont prévus dans les prochaines heures. Par mesure de sécurité, nous vous demandons de : rester éloignés des fenêtres et des façades vitrées exposées ; éviter les terrasses, balcons et espaces extérieurs ; suivre les consignes émises par l\'équipe de gestion ou son représentant (ex. : sécurité). D\'autres communications suivront au besoin.',
          textEN: 'WEATHER ALERT – HIGH WINDS FORECAST. ATTENTION ATTENTION. Strong winds are forecast in the coming hours. As a safety precaution, we ask that you: stay away from exposed windows and glass facades; avoid terraces, balconies, and outdoor spaces; follow the instructions issued by the management team or its representative (e.g. safety). Further communications will follow as required.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 39),
          textFR: '② Mesures en cours (vents violents en cours) — canaux : intercom, SMS, courriel :',
          textEN: '② Actions in progress (high winds in progress) — channels: intercom, SMS, email:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 40),
          textFR: 'MESURES DE SÉCURITÉ EN COURS – VENTS VIOLENTS. ATTENTION ATTENTION. En raison des conditions météorologiques actuelles, certaines zones du bâtiment peuvent être temporairement restreintes. Nous vous demandons de : demeurer à l\'intérieur du bâtiment ; éviter les zones vitrées et les accès extérieurs ; suivre les directives de l\'équipe de sécurité. Merci de votre collaboration.',
          textEN: 'CURRENT SAFETY MEASURES – HIGH WINDS. ATTENTION ATTENTION. Due to current weather conditions, some areas of the building may be temporarily restricted. We ask that you: remain inside the building; avoid glazed areas and external accesses; follow the instructions of the security team. Thank you for your cooperation.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 41),
          textFR: '③ Directive de confinement partiel (au besoin) — canaux : intercom, agents sur le terrain, SMS :',
          textEN: '③ Partial lockdown directive (if required) — channels: intercom, field agents, SMS:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 42),
          textFR: 'CONSIGNE DE SÉCURITÉ – VENTS VIOLENTS. ATTENTION ATTENTION. Pour votre sécurité, veuillez-vous diriger vers les zones intérieures éloignées des fenêtres et demeurer sur place jusqu\'à nouvel avis. Veuillez respecter cette consigne pour votre sécurité.',
          textEN: 'SAFETY NOTICE – HIGH WINDS. ATTENTION ATTENTION. For your safety, please move to indoor areas away from windows and remain on site until further notice. Please follow this for your safety.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 43),
          textFR: '④ Restriction ou fermeture de zones extérieures — canaux : affichage, SMS, agents :',
          textEN: '④ Restriction or closure of outdoor areas — channels: display, SMS, agents:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 44),
          textFR: 'AVIS – ZONES EXTÉRIEURES TEMPORAIREMENT FERMÉES. ATTENTION ATTENTION. En raison des vents violents, l\'accès aux zones extérieures (terrasses, stationnements exposés, entrées secondaires) est temporairement interdit. Merci de respecter cette consigne pour votre sécurité.',
          textEN: 'NOTICE – OUTDOOR AREAS TEMPORARILY CLOSED. ATTENTION ATTENTION. Due to strong winds, access to outdoor areas (terraces, exposed parking lots, secondary entrances) is temporarily prohibited. Please respect this instruction for your safety.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 45),
          textFR: '⑤ Fin de l\'événement / retour à la normale — canaux : courriel, affichage, intercom :',
          textEN: '⑤ End of event / return to normal — channels: email, display, intercom:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 46),
          textFR: 'FIN DES MESURES – RETOUR PROGRESSIF À LA NORMALE. ATTENTION ATTENTION. Les conditions météorologiques se sont stabilisées. Les zones temporairement restreintes seront rouvertes progressivement. Merci de votre collaboration durant l\'événement.',
          textEN: 'END OF MEASURES – GRADUAL RETURN TO NORMAL. ATTENTION ATTENTION. The weather conditions have stabilized. Temporarily restricted areas will be reopened gradually. Thank you for your cooperation during the event.',
          isBold: false,
          isRed: true,
        },
        // ── Consignes internes ──────────────────────────────
        {
          id: sid(CODE, 47),
          textFR: '**Consignes internes — équipe de gestion / sécurité** *(Non diffusées aux occupants)*',
          textEN: '**Internal instructions — management/safety team** *(Not released to occupants)*',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 48),
          textFR: 'Utiliser des messages courts et cohérents',
          textEN: 'Use short and consistent messages',
          isBold: false,
        },
        {
          id: sid(CODE, 49),
          textFR: 'Éviter toute information technique inutile',
          textEN: 'Avoid any unnecessary technical information',
          isBold: false,
        },
        {
          id: sid(CODE, 50),
          textFR: 'Ne jamais minimiser le risque',
          textEN: 'Never minimize the risk',
          isBold: false,
        },
        {
          id: sid(CODE, 51),
          textFR: 'Prioriser les canaux permettant une diffusion rapide',
          textEN: 'Prioritize channels that allow for rapid distribution',
          isBold: false,
        },
        {
          id: sid(CODE, 52),
          textFR: 'Mettre à jour les occupants dès qu\'un changement de situation survient',
          textEN: 'Update occupants as soon as a change in situation occurs',
          isBold: false,
        },
      ],
    },
  ],
};