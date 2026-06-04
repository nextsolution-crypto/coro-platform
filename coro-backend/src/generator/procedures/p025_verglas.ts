// ============================================================
// CORO — P025 : Verglas
// Activé si : boma_certified
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P025';

export const P025_VERGLAS: ProcedureTemplate = {
  id: 'p025_verglas',
  code: CODE,
  titleFR: 'PROCÉDURES EN CAS DE VERGLAS',
  titleEN: 'ICE STORM PROCEDURES',
  icon: '🧊',
  headerColor: COLORS.glacier,
  activationRule: 'boma_certified',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence — Agent de sécurité console',
      roleLabelEN: 'Emergency Coordinator — Console Security Agent',
      headerColor: COLORS.glacier,
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
          textFR: 'Assurer la sécurité des occupants et la continuité minimale des activités lors d\'un épisode de verglas, en prévenant les chutes, en sécurisant les accès, en coordonnant les ressources internes et externes, et en maintenant une communication claire jusqu\'au retour à des conditions sécuritaires',
          textEN: 'Ensure the safety of occupants and minimum continuity of activities during an ice event, by preventing falls, securing access points, coordinating internal and external resources, and maintaining clear communication until return to safe conditions',
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
          textFR: 'La procédure est déclenchée lorsqu\'un épisode de verglas est : annoncé par les services météorologiques compétents ; observé sur les surfaces extérieures (entrées, trottoirs, stationnements, rampes) ; susceptible d\'affecter l\'accès au bâtiment, la circulation des personnes ou la sécurité des installations',
          textEN: 'The procedure is activated when an ice event is: announced by competent meteorological services; observed on exterior surfaces (entrances, sidewalks, parking lots, ramps); likely to affect building access, movement of persons, or the safety of facilities',
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
          textFR: 'Réduire les risques de chutes et de blessures',
          textEN: 'Reduce the risk of falls and injuries',
          isBold: false,
        },
        {
          id: sid(CODE, 7),
          textFR: 'Assurer un accès sécuritaire minimal au bâtiment',
          textEN: 'Ensure minimum safe access to the building',
          isBold: false,
        },
        {
          id: sid(CODE, 8),
          textFR: 'Maintenir la sécurité des occupants présents',
          textEN: 'Maintain the safety of occupants present',
          isBold: false,
        },
        {
          id: sid(CODE, 9),
          textFR: 'Soutenir la prise de décision quant à la limitation ou la suspension des activités',
          textEN: 'Support decision-making regarding limitation or suspension of activities',
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
          textFR: '1. Surveillance et alerte :',
          textEN: '1. Surveillance and alert:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 12),
              textFR: 'Surveiller les bulletins météorologiques et les alertes de verglas',
              textEN: 'Monitor weather bulletins and ice alerts',
              isList: true,
            },
            {
              id: sid(CODE, 13),
              textFR: 'Évaluer les périodes critiques (arrivées des employés, pauses, fin de quart)',
              textEN: 'Assess critical periods (employee arrivals, breaks, end of shift)',
              isList: true,
            },
            {
              id: sid(CODE, 14),
              textFR: 'Informer l\'équipe d\'urgence et la gestion de la situation anticipée',
              textEN: 'Inform the emergency team and management of the anticipated situation',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 15),
          textFR: '2. Préparation du site :',
          textEN: '2. Site preparation:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 16),
              textFR: 'Aviser le responsable de l\'entretien ou le fournisseur de déneigement/épandage',
              textEN: 'Notify the maintenance supervisor or snow removal/salting contractor',
              isList: true,
            },
            {
              id: sid(CODE, 17),
              textFR: 'Vérifier la disponibilité des abrasifs (sel, sable, gravier)',
              textEN: 'Verify availability of abrasives (salt, sand, gravel)',
              isList: true,
            },
            {
              id: sid(CODE, 18),
              textFR: 'Identifier les zones extérieures à risque élevé (escaliers, pentes, quais de chargement)',
              textEN: 'Identify high-risk exterior areas (stairs, slopes, loading docks)',
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
              textFR: 'Demander aux ressources prévues au PMU (agents de sécurité, entretien, responsables de secteur) de se présenter à la console de sécurité afin de récupérer leur équipement requis (radios, dossards, bottes antidérapantes) et recevoir les directives initiales',
              textEN: 'Ask resources designated in the ERP (security agents, maintenance, sector supervisors) to report to the security console to retrieve required equipment (radios, vests, non-slip boots) and receive initial directives',
              isList: true,
            },
            {
              id: sid(CODE, 22),
              textFR: 'Orienter chaque ressource vers son emplacement désigné, où elle devra : demeurer en attente, maintenir une communication radio active, intervenir uniquement sur directive du coordonnateur',
              textEN: 'Direct each resource to their designated location, where they must: remain on standby, maintain active radio communication, intervene only on coordinator\'s directive',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 23),
          textFR: '4. Sécurisation des accès :',
          textEN: '4. Securing access points:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 24),
              textFR: 'Restreindre ou fermer temporairement les entrées jugées dangereuses (sauf les issues de secours)',
              textEN: 'Restrict or temporarily close entrances deemed dangerous (except emergency exits)',
              isList: true,
            },
            {
              id: sid(CODE, 25),
              textFR: 'Installer une signalisation de danger (surface glissante)',
              textEN: 'Install danger signage (slippery surface)',
              isList: true,
            },
            {
              id: sid(CODE, 26),
              textFR: 'Diriger les occupants vers les accès les plus sécuritaires',
              textEN: 'Direct occupants toward the safest access points',
              isList: true,
            },
            {
              id: sid(CODE, 27),
              textFR: 'Interdire l\'accès aux zones non traitées ou non sécuritaires',
              textEN: 'Prohibit access to untreated or unsafe areas',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 28),
          textFR: '5. Gestion des occupants :',
          textEN: '5. Occupant management:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 29),
              textFR: 'Informer les occupants des risques liés au verglas',
              textEN: 'Inform occupants of ice-related risks',
              isList: true,
            },
            {
              id: sid(CODE, 30),
              textFR: 'Encourager la limitation des déplacements non essentiels',
              textEN: 'Encourage limiting non-essential movement',
              isList: true,
            },
            {
              id: sid(CODE, 31),
              textFR: 'Assister les personnes à mobilité réduite, au besoin',
              textEN: 'Assist persons with reduced mobility, as needed',
              isList: true,
            },
          ],
        },
        // ── Gestion de la situation ─────────────────────────
        {
          id: sid(CODE, 32),
          textFR: '**Gestion de la situation — Évolution du verglas**',
          textEN: '**Situation management — Ice evolution**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 33),
          textFR: '6. Situation sous contrôle :',
          textEN: '6. Situation under control:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 34),
              textFR: 'Maintenir les mesures de prévention et de surveillance',
              textEN: 'Maintain prevention and monitoring measures',
              isList: true,
            },
            {
              id: sid(CODE, 35),
              textFR: 'Ajuster les accès selon l\'évolution des conditions',
              textEN: 'Adjust access points based on evolving conditions',
              isList: true,
            },
            {
              id: sid(CODE, 36),
              textFR: 'Poursuivre les communications régulières avec les occupants',
              textEN: 'Continue regular communications with occupants',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 37),
          textFR: '7. Situation aggravée :',
          textEN: '7. Aggravated situation:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 38),
              textFR: 'Si les conditions se détériorent (verglas intense, chutes multiples, accès impraticables) : recommander la suspension des activités non essentielles, restreindre les entrées et sorties, informer la gestion pour décision opérationnelle (télétravail, fermeture partielle)',
              textEN: 'If conditions deteriorate (intense ice, multiple falls, impassable access): recommend suspension of non-essential activities, restrict entries and exits, inform management for operational decision (remote work, partial closure)',
              isList: true,
            },
          ],
        },
        // ── Fin de la procédure ─────────────────────────────
        {
          id: sid(CODE, 39),
          textFR: '**Fin de la procédure — Stabilisation et retour à la normale**',
          textEN: '**End of procedure — Stabilization and return to normal**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 40),
          textFR: '8. Stabilisation :',
          textEN: '8. Stabilization:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 41),
              textFR: 'Confirmer l\'amélioration des conditions météorologiques',
              textEN: 'Confirm improvement in weather conditions',
              isList: true,
            },
            {
              id: sid(CODE, 42),
              textFR: 'Valider que les surfaces extérieures sont traitées et sécuritaires',
              textEN: 'Validate that exterior surfaces are treated and safe',
              isList: true,
            },
            {
              id: sid(CODE, 43),
              textFR: 'Lever progressivement les restrictions d\'accès',
              textEN: 'Progressively lift access restrictions',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 44),
          textFR: '9. Retour à la normale :',
          textEN: '9. Return to normal:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 45),
              textFR: 'Informer les occupants de la reprise sécuritaire des déplacements',
              textEN: 'Inform occupants of the safe resumption of movement',
              isList: true,
            },
            {
              id: sid(CODE, 46),
              textFR: 'Maintenir une vigilance accrue lors du dégel et du regel',
              textEN: 'Maintain heightened vigilance during thaw and refreeze periods',
              isList: true,
            },
            {
              id: sid(CODE, 47),
              textFR: 'Coordonner avec l\'entretien pour les inspections finales',
              textEN: 'Coordinate with maintenance for final inspections',
              isList: true,
            },
          ],
        },
        // ── À la suite de l'événement ───────────────────────
        {
          id: sid(CODE, 48),
          textFR: '**À la suite de l\'événement**',
          textEN: '**After the event**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 49),
          textFR: '10. Débriefing et rapport :',
          textEN: '10. Debriefing and report:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 50),
              textFR: 'Procéder à un court post-mortem avec l\'équipe d\'urgence',
              textEN: 'Conduct a brief post-mortem with the emergency team',
              isList: true,
            },
            {
              id: sid(CODE, 51),
              textFR: 'Documenter : les zones problématiques, les incidents ou chutes signalés, l\'efficacité des mesures mises en place, les améliorations à apporter',
              textEN: 'Document: problematic areas, reported incidents or falls, effectiveness of measures implemented, improvements to be made',
              isList: true,
            },
          ],
        },
        // ── Note importante ─────────────────────────────────
        {
          id: sid(CODE, 52),
          textFR: '⚠️ Le verglas constitue un risque majeur de blessures graves. Toute décision de maintien des activités doit prioriser la sécurité des personnes avant les considérations opérationnelles.',
          textEN: '⚠️ Ice represents a major risk of serious injury. Any decision to maintain activities must prioritize people\'s safety over operational considerations.',
          isBold: false,
          isRed: true,
        },
        // ── Messages types ──────────────────────────────────
        {
          id: sid(CODE, 53),
          textFR: '**Messages types à diffuser aux occupants** *(Les messages doivent être mentionnés 2 fois de suite)*',
          textEN: '**Standard messages to broadcast to occupants** *(Messages must be repeated twice consecutively)*',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 54),
          textFR: 'Cadence recommandée : au minimum toutes les 30 minutes durant un épisode actif, immédiatement lors de toute modification des accès ou des conditions, à la levée des mesures',
          textEN: 'Recommended cadence: at least every 30 minutes during an active episode, immediately upon any change in access or conditions, when measures are lifted',
          isBold: false,
        },
        {
          id: sid(CODE, 55),
          textFR: '① Alerte préventive (verglas annoncé) — canaux : courriel, affichage, SMS, intranet :',
          textEN: '① Early warning (ice forecast) — channels: email, posting, SMS, intranet:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 56),
          textFR: 'ALERTE MÉTÉO — VERGLAS PRÉVU. ATTENTION ATTENTION. Des conditions de verglas sont prévues. Par mesure de sécurité, nous vous demandons de : limiter vos déplacements extérieurs ; porter des chaussures antidérapantes ; redoubler de prudence dans les entrées et zones de transition.',
          textEN: 'WEATHER ALERT — ICE FORECAST. ATTENTION ATTENTION. Icy conditions are forecast. As a safety precaution, we ask that you: limit your outdoor travel; wear non-slip shoes; exercise extra caution at entrances and transition areas.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 57),
          textFR: '② Mesures en cours (verglas en cours) — canaux : intercom, SMS, courriel :',
          textEN: '② Actions in progress (ice in progress) — channels: intercom, SMS, email:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 58),
          textFR: 'MESURES DE SÉCURITÉ EN COURS — VERGLAS. ATTENTION ATTENTION. En raison des conditions actuelles : certains accès extérieurs sont temporairement fermés ; les déplacements doivent se faire lentement et prudemment ; suivez les parcours sécurisés indiqués.',
          textEN: 'SAFETY MEASURES IN PROGRESS — ICE. ATTENTION ATTENTION. Due to current conditions: some exterior accesses are temporarily closed; movement must be done slowly and carefully; follow the marked safe routes.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 59),
          textFR: '③ Restriction ou fermeture de zones extérieures — canaux : affichage, SMS, agents :',
          textEN: '③ Restriction or closure of outdoor areas — channels: display, SMS, agents:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 60),
          textFR: 'AVIS — ZONES EXTÉRIEURES TEMPORAIREMENT FERMÉES. ATTENTION ATTENTION. En raison du verglas, l\'accès à certaines zones extérieures est interdit jusqu\'à nouvel avis. Merci de respecter cette consigne pour votre sécurité.',
          textEN: 'NOTICE — OUTDOOR AREAS TEMPORARILY CLOSED. ATTENTION ATTENTION. Due to the ice storm, access to certain outdoor areas is prohibited until further notice. Please respect this instruction for your safety.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 61),
          textFR: '④ Fin de l\'événement / retour à la normale — canaux : courriel, affichage, intercom :',
          textEN: '④ End of event / return to normal — channels: email, display, intercom:',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 62),
          textFR: 'FIN DES MESURES — RETOUR PROGRESSIF À LA NORMALE. ATTENTION ATTENTION. Les conditions se sont améliorées. Les accès seront rouverts progressivement après traitement et inspection. Merci de votre vigilance.',
          textEN: 'END OF MEASURES — GRADUAL RETURN TO NORMAL. ATTENTION ATTENTION. Conditions have improved. The accesses will be reopened gradually after treatment and inspection. Thank you for your vigilance.',
          isBold: false,
          isRed: true,
        },
        // ── Consignes internes ──────────────────────────────
        {
          id: sid(CODE, 63),
          textFR: '**Consignes internes — équipe de gestion / sécurité** *(Non diffusées aux occupants)*',
          textEN: '**Internal instructions — management/safety team** *(Not released to occupants)*',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 64),
          textFR: 'Ne jamais minimiser le risque de chute',
          textEN: 'Never minimize the risk of falling',
          isBold: false,
        },
        {
          id: sid(CODE, 65),
          textFR: 'Adapter les messages selon l\'évolution des surfaces',
          textEN: 'Adapt messages according to the evolution of surfaces',
          isBold: false,
        },
        {
          id: sid(CODE, 66),
          textFR: 'Coordonner étroitement avec l\'entretien',
          textEN: 'Coordinate closely with maintenance',
          isBold: false,
        },
        {
          id: sid(CODE, 67),
          textFR: 'Maintenir une présence visible aux points d\'entrée',
          textEN: 'Maintain a visible presence at ports of entry',
          isBold: false,
        },
      ],
    },
  ],
};