// ============================================================
// CORO — P024 : Inondations
// Activé si : boma_certified
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P024';

export const P024_INONDATIONS: ProcedureTemplate = {
  id: 'p024_inondations',
  code: CODE,
  titleFR: 'PROCÉDURES EN CAS D\'INONDATIONS',
  titleEN: 'FLOOD PROCEDURES',
  icon: '🌊',
  headerColor: COLORS.sapphire,
  activationRule: 'boma_certified',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence — Agent de sécurité console',
      roleLabelEN: 'Emergency Coordinator — Console Security Agent',
      headerColor: COLORS.sapphire,
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
          textFR: 'Assurer la sécurité des occupants et la protection du bâtiment lors d\'une inondation ou d\'un risque d\'inondation, en coordonnant les mesures de prévention, de confinement, en limitant les dommages aux infrastructures et en maintenant une communication efficace jusqu\'au rétablissement des conditions normales',
          textEN: 'Ensure the safety of occupants and protection of the building during a flood or flood risk, by coordinating prevention and containment measures, limiting infrastructure damage, and maintaining effective communication until normal conditions are restored',
          isBold: false,
        },
        // ── Situation déclenchante ──────────────────────────
        {
          id: sid(CODE, 3),
          textFR: '**Situation déclenchante**',
          textEN: '**Triggering situation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 4),
          textFR: 'Déclenchement de la procédure lorsqu\'une inondation est constatée ou anticipée à la suite de : fortes pluies ou pluies torrentielles, refoulement d\'égout, rupture ou fuite de conduites d\'eau, infiltration d\'eau par la toiture / les fondations / les ouvertures, avis d\'inondation émis par une autorité compétente',
          textEN: 'Procedure activation when a flood is observed or anticipated following: heavy or torrential rain, sewer backup, water pipe rupture or leak, water infiltration through roof/foundations/openings, flood advisory issued by a competent authority',
          isBold: false,
        },
        // ── Objectif ────────────────────────────────────────
        {
          id: sid(CODE, 5),
          textFR: '**Objectif de la procédure**',
          textEN: '**Procedure objective**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Protéger la vie et l\'intégrité physique des occupants',
          textEN: 'Protect the life and physical integrity of occupants',
          isBold: false,
        },
        {
          id: sid(CODE, 7),
          textFR: 'Prévenir les risques électriques et structuraux',
          textEN: 'Prevent electrical and structural risks',
          isBold: false,
        },
        {
          id: sid(CODE, 8),
          textFR: 'Limiter la propagation de l\'eau et les dommages matériels',
          textEN: 'Limit the spread of water and material damage',
          isBold: false,
        },
        {
          id: sid(CODE, 9),
          textFR: 'Assurer une prise en charge rapide par les ressources internes et externes',
          textEN: 'Ensure rapid response by internal and external resources',
          isBold: false,
        },
        // ── Phase de préparation ────────────────────────────
        {
          id: sid(CODE, 10),
          textFR: '**Phase de préparation**',
          textEN: '**Preparation phase**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 11),
          textFR: '1. Surveillance et évaluation initiale :',
          textEN: '1. Surveillance and initial assessment:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 12),
              textFR: 'Prendre connaissance de l\'alerte ou du signalement d\'inondation',
              textEN: 'Acknowledge the flood alert or report',
              isList: true,
            },
            {
              id: sid(CODE, 13),
              textFR: 'Identifier la source présumée de l\'eau (interne ou externe)',
              textEN: 'Identify the presumed water source (internal or external)',
              isList: true,
            },
            {
              id: sid(CODE, 14),
              textFR: 'Évaluer rapidement les zones touchées (sous-sols, locaux techniques, cages d\'ascenseur, étages)',
              textEN: 'Quickly assess affected areas (basements, technical rooms, elevator shafts, floors)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 15),
          textFR: '2. Préparation du bâtiment :',
          textEN: '2. Building preparation:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 16),
              textFR: 'Demander au responsable mécanique de se présenter à la console de sécurité',
              textEN: 'Ask the mechanical supervisor to report to the security console',
              isList: true,
            },
            {
              id: sid(CODE, 17),
              textFR: 'Vérifier les risques électriques (présence d\'eau près des panneaux, équipements, prises) — ne jamais toucher un panneau électrique immergé',
              textEN: 'Check electrical risks (water near panels, equipment, outlets) — never touch an immersed electrical panel',
              isList: true,
            },
            {
              id: sid(CODE, 18),
              textFR: 'Identifier les zones à risque nécessitant un accès restreint',
              textEN: 'Identify risk areas requiring restricted access',
              isList: true,
            },
          ],
        },
        // ── Phase d'intervention ────────────────────────────
        {
          id: sid(CODE, 19),
          textFR: '**Phase d\'intervention**',
          textEN: '**Intervention phase**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 20),
          textFR: '3. Pré-positionnement des ressources :',
          textEN: '3. Pre-positioning of resources:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 21),
              textFR: 'Demander aux ressources prévues au PMU (responsable mécanique, responsables de secteur) de se présenter à la console de sécurité afin de récupérer leur équipement requis, recevoir les directives initiales et être prêts à intervenir uniquement sur directive du coordonnateur',
              textEN: 'Ask resources designated in the ERP (mechanical supervisor, sector supervisors) to report to the security console to retrieve required equipment, receive initial directives, and be ready to intervene only on coordinator\'s directive',
              isList: true,
            },
            {
              id: sid(CODE, 22),
              textFR: 'Orienter chaque ressource vers son emplacement désigné',
              textEN: 'Direct each resource to their designated location',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 23),
          textFR: '4. Mesures de protection immédiates :',
          textEN: '4. Immediate protective measures:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 24),
              textFR: 'Restreindre l\'accès aux zones inondées ou à risque',
              textEN: 'Restrict access to flooded or at-risk areas',
              isList: true,
            },
            {
              id: sid(CODE, 25),
              textFR: 'Interdire l\'utilisation des ascenseurs si l\'eau est présente dans les fosses ou les locaux techniques',
              textEN: 'Prohibit elevator use if water is present in pits or technical rooms',
              isList: true,
            },
            {
              id: sid(CODE, 26),
              textFR: 'Si requis, demander la coupure préventive de l\'électricité dans les zones touchées — contacter Hydro-Québec au 1 800 790-2424 si nécessaire',
              textEN: 'If required, request preventive power cutoff in affected areas — contact Hydro-Québec at 1 800 790-2424 if necessary',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 27),
          textFR: '5. Gestion des occupants :',
          textEN: '5. Occupant management:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 28),
              textFR: 'Informer les occupants des secteurs concernés de la situation',
              textEN: 'Inform occupants in affected sectors of the situation',
              isList: true,
            },
            {
              id: sid(CODE, 29),
              textFR: 'Diriger les occupants vers des zones sécuritaires, à l\'écart de l\'eau',
              textEN: 'Direct occupants to safe areas, away from water',
              isList: true,
            },
            {
              id: sid(CODE, 30),
              textFR: 'Éviter toute circulation inutile dans les zones affectées',
              textEN: 'Avoid any unnecessary movement in affected areas',
              isList: true,
            },
          ],
        },
        // ── Gestion de la situation ─────────────────────────
        {
          id: sid(CODE, 31),
          textFR: '**Gestion de la situation — Évolution de l\'inondation**',
          textEN: '**Situation management — Flood evolution**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 32),
          textFR: '6. Situation contrôlée :',
          textEN: '6. Controlled situation:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 33),
              textFR: 'Maintenir le confinement des zones touchées',
              textEN: 'Maintain containment of affected areas',
              isList: true,
            },
            {
              id: sid(CODE, 34),
              textFR: 'Permettre la poursuite partielle des activités dans les zones sécuritaires',
              textEN: 'Allow partial continuation of activities in safe areas',
              isList: true,
            },
            {
              id: sid(CODE, 35),
              textFR: 'Surveiller l\'évolution de la situation',
              textEN: 'Monitor the situation\'s evolution',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 36),
          textFR: '7. Situation aggravée :',
          textEN: '7. Aggravated situation:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 37),
              textFR: 'Si l\'eau progresse ou présente un danger pour les occupants : recommander l\'évacuation partielle ou complète du bâtiment',
              textEN: 'If water advances or poses a danger to occupants: recommend partial or complete building evacuation',
              isList: true,
            },
            {
              id: sid(CODE, 38),
              textFR: 'Déclencher la procédure générale d\'évacuation, si requis',
              textEN: 'Trigger the general evacuation procedure, if required',
              isList: true,
            },
            {
              id: sid(CODE, 39),
              textFR: 'Contacter le 9-1-1 et fournir : adresse du bâtiment, nature de l\'inondation, zones touchées, nombre approximatif d\'occupants concernés',
              textEN: 'Contact 9-1-1 and provide: building address, nature of the flood, affected areas, approximate number of occupants concerned',
              isList: true,
            },
          ],
        },
        // ── Fin de la procédure ─────────────────────────────
        {
          id: sid(CODE, 40),
          textFR: '**Fin de la procédure — Stabilisation et réintégration**',
          textEN: '**End of procedure — Stabilization and re-entry**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 41),
          textFR: '8. Stabilisation :',
          textEN: '8. Stabilization:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 42),
              textFR: 'Confirmer l\'arrêt de la source d\'eau',
              textEN: 'Confirm the water source has been stopped',
              isList: true,
            },
            {
              id: sid(CODE, 43),
              textFR: 'Demander au responsable mécanique de valider la sécurité des systèmes (électricité, CVAC, ascenseurs)',
              textEN: 'Ask the mechanical supervisor to validate the safety of systems (electricity, HVAC, elevators)',
              isList: true,
            },
            {
              id: sid(CODE, 44),
              textFR: 'Maintenir l\'interdiction d\'accès aux zones non sécuritaires',
              textEN: 'Maintain access prohibition to unsafe areas',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 45),
          textFR: '9. Réintégration progressive :',
          textEN: '9. Progressive re-entry:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 46),
              textFR: 'Autoriser, au besoin, la réintégration partielle des zones jugées sécuritaires',
              textEN: 'Authorize, if needed, partial re-entry to areas deemed safe',
              isList: true,
            },
            {
              id: sid(CODE, 47),
              textFR: 'Informer clairement les occupants des zones toujours restreintes',
              textEN: 'Clearly inform occupants of areas still restricted',
              isList: true,
            },
            {
              id: sid(CODE, 48),
              textFR: 'Coordonner avec la gestion immobilière pour les travaux de nettoyage et de remise en état',
              textEN: 'Coordinate with property management for cleanup and restoration work',
              isList: true,
            },
          ],
        },
        // ── À la suite de l'événement ───────────────────────
        {
          id: sid(CODE, 49),
          textFR: '**À la suite de l\'événement**',
          textEN: '**After the event**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 50),
          textFR: '10. Débriefing et rapport :',
          textEN: '10. Debriefing and report:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 51),
              textFR: 'Procéder à un post-mortem avec l\'équipe d\'urgence',
              textEN: 'Conduct a post-mortem with the emergency team',
              isList: true,
            },
            {
              id: sid(CODE, 52),
              textFR: 'Compléter un rapport d\'événement incluant : la cause de l\'inondation, les zones affectées, les mesures prises, les impacts sur les opérations, les recommandations correctives',
              textEN: 'Complete an event report including: flood cause, affected areas, measures taken, operational impacts, corrective recommendations',
              isList: true,
            },
          ],
        },
        // ── Note importante ─────────────────────────────────
        {
          id: sid(CODE, 53),
          textFR: '⚠️ Toute présence d\'eau à proximité d\'installations électriques représente un danger grave. Aucune intervention technique ne doit être effectuée sans validation du responsable mécanique ou des services d\'urgence.',
          textEN: '⚠️ Any presence of water near electrical installations represents a serious danger. No technical intervention should be performed without validation from the mechanical supervisor or emergency services.',
          isBold: false,
          isRed: true,
        },
        // ── Messages types ──────────────────────────────────
        {
          id: sid(CODE, 54),
          textFR: '**Messages types à diffuser aux occupants** *(Les messages doivent être mentionnés 2 fois de suite)*',
          textEN: '**Standard messages to broadcast to occupants** *(Messages must be repeated twice consecutively)*',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 55),
          textFR: 'Cadence recommandée : au minimum toutes les 15 minutes en situation évolutive, immédiatement lors de toute aggravation ou modification des zones touchées, à la levée des restrictions',
          textEN: 'Recommended cadence: at least every 15 minutes in an evolving situation, immediately upon any aggravation or modification of affected areas, when restrictions are lifted',
          isBold: false,
        },
        {
          id: sid(CODE, 56),
          textFR: '① Alerte préventive (risque d\'inondation) — canaux : courriel, affichage, SMS, intranet :',
          textEN: '① Early warning (flood risk) — channels: email, posting, SMS, intranet:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 57),
          textFR: 'ALERTE — RISQUE D\'INONDATION. ATTENTION ATTENTION. Des conditions météorologiques exceptionnelles peuvent entraîner des accumulations d\'eau à proximité ou à l\'intérieur du bâtiment. Par mesure de sécurité, nous vous demandons de : éviter les sous-sols et stationnements si non essentiels ; ne pas circuler dans les zones où de l\'eau est présente ; signaler toute infiltration ou accumulation à la sécurité.',
          textEN: 'FLOOD ALERT. ATTENTION ATTENTION. Extreme weather conditions can cause water to pool near or inside the building. As a safety precaution, we ask that you: avoid basements and parking lots if not essential; do not drive in areas where water is present; report any infiltration or build-up to security.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 58),
          textFR: '② Mesures en cours (inondation en cours) — canaux : intercom, SMS, courriel :',
          textEN: '② Actions in progress (flooding in progress) — channels: intercom, SMS, email:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 59),
          textFR: 'MESURES DE SÉCURITÉ EN COURS — INONDATION. ATTENTION ATTENTION. En raison de la situation actuelle : certaines zones du bâtiment sont temporairement fermées ; l\'accès aux sous-sols et aux zones techniques est restreint ; ne pas rester ou se déplacer dans les endroits inondés. Merci de suivre strictement les consignes émises par l\'équipe de sécurité.',
          textEN: 'CURRENT SAFETY MEASURES — FLOODING. ATTENTION ATTENTION. Due to the current situation: some areas of the building are temporarily closed; access to basements and technical areas is restricted; do not stay or move in flooded areas. Please strictly follow the instructions issued by the security team.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 60),
          textFR: '③ Directive de confinement ou restriction ciblée (au besoin) — canaux : intercom, agents sur le terrain, SMS :',
          textEN: '③ Lockdown directive or targeted restriction (if required) — channels: intercom, field agents, SMS:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 61),
          textFR: 'CONSIGNE DE SÉCURITÉ — PRÉSENCE D\'EAU. ATTENTION ATTENTION. Pour votre sécurité : ne touchez à aucun équipement électrique exposé à l\'eau ; demeurez dans les zones sécuritaires identifiées ; attendez les directives avant tout déplacement.',
          textEN: 'SAFETY NOTICE — PRESENCE OF WATER. ATTENTION ATTENTION. For your safety: do not touch any electrical equipment exposed to water; remain in the identified secure areas; wait for instructions before moving.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 62),
          textFR: '④ Fin de l\'événement / retour à la normale — canaux : courriel, affichage, intercom :',
          textEN: '④ End of event / return to normal — channels: email, display, intercom:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 63),
          textFR: 'FIN DES MESURES — RETOUR PROGRESSIF À LA NORMALE. ATTENTION ATTENTION. La situation est désormais sous contrôle. Les zones touchées seront rouvertes progressivement après inspection et validation. Merci de votre collaboration.',
          textEN: 'END OF MEASURES — GRADUAL RETURN TO NORMAL. ATTENTION ATTENTION. The situation is now under control. The affected areas will be reopened gradually after inspection and validation. Thank you for your cooperation.',
          isBold: false,
          isRed: true,
        },
        // ── Consignes internes ──────────────────────────────
        {
          id: sid(CODE, 64),
          textFR: '**Consignes internes — équipe de gestion / sécurité** *(Non diffusées aux occupants)*',
          textEN: '**Internal instructions — management/safety team** *(Not released to occupants)*',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 65),
          textFR: 'Ne jamais autoriser un accès sans validation technique',
          textEN: 'Never allow access without technical validation',
          isBold: false,
        },
        {
          id: sid(CODE, 66),
          textFR: 'Prioriser la prévention des risques électriques',
          textEN: 'Prioritize the prevention of electrical risks',
          isBold: false,
        },
        {
          id: sid(CODE, 67),
          textFR: 'Maintenir un suivi visuel constant des zones à risque',
          textEN: 'Maintain constant visual monitoring of risk areas',
          isBold: false,
        },
        {
          id: sid(CODE, 68),
          textFR: 'Documenter toute évolution de la situation',
          textEN: 'Document any changes in the situation',
          isBold: false,
        },
      ],
    },
  ],
};