// ============================================================
// CORO — P020 : Rassemblement ou manifestation
// Toujours présent dans PMU et PSI
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P020';

export const P020_MANIFESTATION: ProcedureTemplate = {
  id: 'p020_manifestation',
  code: CODE,
  titleFR: 'RASSEMBLEMENT OU MANIFESTATION',
  titleEN: 'GATHERING OR DEMONSTRATION',
  icon: '📢',
  headerColor: COLORS.purple,
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    // ── Coordonnateur d'urgence ────────────────────────────
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.purple,
      steps: [
        // ── Manifestations extérieures ──────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**MANIFESTATIONS EXTÉRIEURES À L\'EXTÉRIEUR DE L\'IMMEUBLE**',
          textEN: '**DEMONSTRATIONS OUTSIDE THE BUILDING**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: '**Détection d\'une manifestation**',
          textEN: '**Detection of a demonstration**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Être informé par :',
          textEN: 'Be informed by:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 4),
              textFR: 'Caméras de surveillance (rassemblement à l\'entrée, sur le trottoir ou dans le stationnement)',
              textEN: 'Surveillance cameras (gathering at entrance, on sidewalk, or in parking lot)',
              isList: true,
            },
            {
              id: sid(CODE, 5),
              textFR: 'Courriel reçu par le service de police',
              textEN: 'Email received from the police service',
              isList: true,
            },
            {
              id: sid(CODE, 6),
              textFR: 'Appel d\'un gestionnaire ou agent',
              textEN: 'Call from a manager or agent',
              isList: true,
            },
            {
              id: sid(CODE, 7),
              textFR: 'Observation directe de manifestants sur le site ou aux abords',
              textEN: 'Direct observation of demonstrators on or near the site',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 8),
          textFR: 'Évaluer immédiatement :',
          textEN: 'Immediately assess:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 9),
              textFR: 'Nombre de personnes impliquées',
              textEN: 'Number of persons involved',
              isList: true,
            },
            {
              id: sid(CODE, 10),
              textFR: 'Lieu précis (entrée principale, ruelle, stationnement, intérieur)',
              textEN: 'Precise location (main entrance, alley, parking, interior)',
              isList: true,
            },
            {
              id: sid(CODE, 11),
              textFR: 'Comportement : pacifique, bruyant, agressif, bloquant les accès',
              textEN: 'Behaviour: peaceful, noisy, aggressive, blocking access',
              isList: true,
            },
            {
              id: sid(CODE, 12),
              textFR: 'Présence ou non d\'un meneur identifié',
              textEN: 'Presence or absence of an identified leader',
              isList: true,
            },
          ],
        },
        // ── Aviser le 9-1-1 ────────────────────────────────
        {
          id: sid(CODE, 13),
          textFR: '**Aviser le 9-1-1 (si nécessaire)**',
          textEN: '**Notify 9-1-1 (if necessary)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 14),
          textFR: 'Appeler si la manifestation devient perturbatrice ou illégale (intimidation, intrusion, blocage d\'accès, violence, vandalisme)',
          textEN: 'Call if the demonstration becomes disruptive or illegal (intimidation, intrusion, access blockage, violence, vandalism)',
          isBold: false,
        },
        {
          id: sid(CODE, 15),
          textFR: '« Ici le coordonnateur de la sécurité au [adresse]. Une manifestation est en cours [préciser le lieu]. Elle est [pacifique/bruyante/menaçante/bloquant l\'entrée]. Nous demandons une évaluation policière. »',
          textEN: '"This is the security coordinator at [address]. A demonstration is in progress [specify location]. It is [peaceful/noisy/threatening/blocking entry]. We are requesting a police assessment."',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 16),
          textFR: 'Aviser le service de police à titre préventif si la manifestation est pacifique mais sous observation',
          textEN: 'Notify police as a preventive measure if the demonstration is peaceful but under observation',
          isBold: false,
        },
        {
          id: sid(CODE, 17),
          textFR: '**Ne pas intervenir et ne pas tenter de relocaliser les manifestants** — contacter uniquement le service de police compétent',
          textEN: '**Do not intervene and do not attempt to relocate demonstrators** — contact only the competent police service',
          isBold: true,
          isRed: true,
        },
        // ── Informer les gestionnaires ──────────────────────
        {
          id: sid(CODE, 18),
          textFR: '**Informer les gestionnaires (Teams)**',
          textEN: '**Inform managers (Teams)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 19),
          textFR: 'Envoyer un message clair :',
          textEN: 'Send a clear message:',
          isBold: false,
        },
        {
          id: sid(CODE, 20),
          textFR: 'Manifestation en cours à l\'entrée principale. Situation en observation. Aucun déplacement vers cette zone. Plus d\'infos à suivre.',
          textEN: 'Demonstration in progress at main entrance. Situation under observation. No movement toward this area. More info to follow.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 21),
          textFR: 'Préciser si les accès sont restreints',
          textEN: 'Specify if access is restricted',
          isBold: false,
        },
        {
          id: sid(CODE, 22),
          textFR: 'Demander aux gestionnaires de rester à leur poste et de limiter les déplacements non essentiels',
          textEN: 'Ask managers to stay at their post and limit non-essential movement',
          isBold: false,
        },
        // ── Sécuriser les accès ─────────────────────────────
        {
          id: sid(CODE, 23),
          textFR: '**Sécuriser les accès**',
          textEN: '**Secure access points**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 24),
          textFR: 'Verrouiller les accès secondaires si non requis',
          textEN: 'Lock secondary access points if not needed',
          isBold: false,
        },
        {
          id: sid(CODE, 25),
          textFR: 'Verrouiller les portes principales',
          textEN: 'Lock main doors',
          isBold: false,
        },
        {
          id: sid(CODE, 26),
          textFR: 'Désigner un agent pour surveiller les caméras',
          textEN: 'Designate an agent to monitor cameras',
          isBold: false,
        },
        // ── Surveillance et documentation ───────────────────
        {
          id: sid(CODE, 27),
          textFR: '**Surveillance et documentation**',
          textEN: '**Surveillance and documentation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 28),
          textFR: 'Observer la manifestation à distance via caméras ou en personne si sécuritaire',
          textEN: 'Observe the demonstration from a distance via cameras or in person if safe',
          isBold: false,
        },
        {
          id: sid(CODE, 29),
          textFR: 'Noter :',
          textEN: 'Note:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 30),
              textFR: 'Heure de début',
              textEN: 'Start time',
              isList: true,
            },
            {
              id: sid(CODE, 31),
              textFR: 'Comportements observés',
              textEN: 'Observed behaviours',
              isList: true,
            },
            {
              id: sid(CODE, 32),
              textFR: 'Obstruction des accès ou non',
              textEN: 'Access obstruction or not',
              isList: true,
            },
            {
              id: sid(CODE, 33),
              textFR: 'Interactions avec les occupants',
              textEN: 'Interactions with occupants',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 34),
          textFR: 'Prendre des captures d\'écran des caméras si possible',
          textEN: 'Take screenshots from cameras if possible',
          isBold: false,
        },
        // ── Coordination avec le service de police ──────────
        {
          id: sid(CODE, 35),
          textFR: '**Coordination avec le service de police**',
          textEN: '**Coordination with the police service**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 36),
          textFR: 'Fournir aux policiers les détails observés',
          textEN: 'Provide police with observed details',
          isBold: false,
        },
        {
          id: sid(CODE, 37),
          textFR: 'Montrer les images disponibles',
          textEN: 'Show available footage',
          isBold: false,
        },
        {
          id: sid(CODE, 38),
          textFR: 'Coopérer avec leurs consignes (ex. : ne pas interagir, évacuer un secteur, suspendre des accès)',
          textEN: 'Cooperate with their instructions (e.g., do not interact, evacuate a sector, suspend access)',
          isBold: false,
        },
        // ── Communication aux occupants ─────────────────────
        {
          id: sid(CODE, 39),
          textFR: '**Communication aux occupants (via les gestionnaires)**',
          textEN: '**Communication to occupants (via managers)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 40),
          textFR: 'Ne pas communiquer directement avec les occupants',
          textEN: 'Do not communicate directly with occupants',
          isBold: false,
        },
        {
          id: sid(CODE, 41),
          textFR: 'Demander aux gestionnaires de :',
          textEN: 'Ask managers to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 42),
              textFR: 'Rassurer les équipes',
              textEN: 'Reassure teams',
              isList: true,
            },
            {
              id: sid(CODE, 43),
              textFR: 'Éviter tout contact avec les manifestants',
              textEN: 'Avoid all contact with demonstrators',
              isList: true,
            },
            {
              id: sid(CODE, 44),
              textFR: 'Maintenir les occupants à l\'intérieur si nécessaire',
              textEN: 'Keep occupants inside if necessary',
              isList: true,
            },
          ],
        },
        // ── Escalade ────────────────────────────────────────
        {
          id: sid(CODE, 45),
          textFR: '**Si la manifestation dégénère**',
          textEN: '**If the demonstration escalates**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 46),
          textFR: 'Verrouiller les accès aux ascenseurs et aux escaliers pour limiter l\'accès des manifestants aux étages',
          textEN: 'Lock elevator and stairway access to limit demonstrators\' access to floors',
          isBold: false,
        },
        {
          id: sid(CODE, 47),
          textFR: 'Demander aux employés de rester dans des bureaux sécurisés, loin des fenêtres et des zones exposées, sans obstruer ni condamner les voies d\'évacuation',
          textEN: 'Ask employees to remain in secured offices, away from windows and exposed areas, without blocking evacuation routes',
          isBold: false,
        },
        {
          id: sid(CODE, 48),
          textFR: 'Demander aux occupants de demeurer dans les bureaux et d\'attendre de nouvelles directives',
          textEN: 'Ask occupants to remain in offices and await further instructions',
          isBold: false,
        },
        // ── Évaluation et assistance ────────────────────────
        {
          id: sid(CODE, 49),
          textFR: '**Évaluation et assistance**',
          textEN: '**Assessment and assistance**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 50),
          textFR: 'Fournir une évaluation aux policiers en temps réel et les assister selon leurs demandes',
          textEN: 'Provide real-time assessment to police and assist them as requested',
          isBold: false,
        },
        {
          id: sid(CODE, 51),
          textFR: 'Sur demande des policiers, assurer-leur un accès au visionnement du système de vidéosurveillance et un plan détaillé du bâtiment',
          textEN: 'At police request, provide access to the video surveillance system and a detailed building plan',
          isBold: false,
        },
        // ── Gestion post-incident ───────────────────────────
        {
          id: sid(CODE, 52),
          textFR: '**Gestion post-incident**',
          textEN: '**Post-incident management**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 53),
          textFR: 'Rédiger un rapport d\'incident détaillé',
          textEN: 'Write a detailed incident report',
          isBold: false,
        },
        {
          id: sid(CODE, 54),
          textFR: 'Organiser une rencontre avec les gestionnaires et les représentants de l\'immeuble pour analyser les mesures prises et identifier des axes d\'amélioration',
          textEN: 'Organize a meeting with managers and building representatives to analyze measures taken and identify areas for improvement',
          isBold: false,
        },
        {
          id: sid(CODE, 55),
          textFR: 'Si requis, actualiser les procédures en fonction des leçons apprises et communiquer les ajustements aux parties prenantes',
          textEN: 'If required, update procedures based on lessons learned and communicate adjustments to stakeholders',
          isBold: false,
        },
        // ── Rapport d'événement ─────────────────────────────
        {
          id: sid(CODE, 56),
          textFR: '**Rapport d\'événement**',
          textEN: '**Event report**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 57),
          textFR: 'Rédiger un rapport complet incluant :',
          textEN: 'Write a complete report including:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 58),
              textFR: 'Heure de début et de fin',
              textEN: 'Start and end time',
              isList: true,
            },
            {
              id: sid(CODE, 59),
              textFR: 'Nombre estimé de manifestants',
              textEN: 'Estimated number of demonstrators',
              isList: true,
            },
            {
              id: sid(CODE, 60),
              textFR: 'Comportements notables',
              textEN: 'Notable behaviours',
              isList: true,
            },
            {
              id: sid(CODE, 61),
              textFR: 'Interventions policières',
              textEN: 'Police interventions',
              isList: true,
            },
            {
              id: sid(CODE, 62),
              textFR: 'Impacts sur les activités',
              textEN: 'Impact on operations',
              isList: true,
            },
            {
              id: sid(CODE, 63),
              textFR: 'Captures d\'écran si disponibles',
              textEN: 'Screenshots if available',
              isList: true,
            },
            {
              id: sid(CODE, 64),
              textFR: 'Nom des policiers présents (si applicable)',
              textEN: 'Names of police officers present (if applicable)',
              isList: true,
            },
            {
              id: sid(CODE, 65),
              textFR: 'Copies ou captures d\'écran pertinentes',
              textEN: 'Relevant copies or screenshots',
              isList: true,
            },
          ],
        },
        // ── Manifestations intérieures ──────────────────────
        {
          id: sid(CODE, 66),
          textFR: '**MANIFESTATIONS À L\'INTÉRIEUR DE L\'IMMEUBLE**',
          textEN: '**DEMONSTRATIONS INSIDE THE BUILDING**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 67),
          textFR: '**Signalement**',
          textEN: '**Report**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 68),
          textFR: 'Demander à un représentant de l\'immeuble (ex. : agent de sécurité, coordonnateur de site) de se présenter à la console de sécurité ou à l\'emplacement où se déroule la manifestation',
          textEN: 'Ask a building representative (e.g., security agent, site coordinator) to report to the security console or the location of the demonstration',
          isBold: false,
        },
        {
          id: sid(CODE, 69),
          textFR: 'Contacter immédiatement la police (9-1-1)',
          textEN: 'Immediately contact police (9-1-1)',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 70),
          textFR: 'Aviser immédiatement l\'équipe de gestion — elle informera, si requis, les occupants de la situation et des mesures mises en place par le moyen de communication approprié',
          textEN: 'Immediately notify the management team — they will inform occupants of the situation and measures in place via appropriate communication means if required',
          isBold: false,
        },
        // ── Équipe de sécurité ──────────────────────────────
        {
          id: sid(CODE, 71),
          textFR: '**Équipe de sécurité**',
          textEN: '**Security team**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 72),
          textFR: 'Contenir les manifestants dans des zones publiques accessibles (hall d\'entrée, rez-de-chaussée)',
          textEN: 'Contain demonstrators in accessible public areas (entrance hall, ground floor)',
          isBold: false,
        },
        {
          id: sid(CODE, 73),
          textFR: 'Éviter toute confrontation physique directe',
          textEN: 'Avoid any direct physical confrontation',
          isBold: false,
        },
        {
          id: sid(CODE, 74),
          textFR: 'Suivre les directives de policiers et de l\'équipe de gestion',
          textEN: 'Follow the directives of police and the management team',
          isBold: false,
        },
        // ── Confinement ─────────────────────────────────────
        {
          id: sid(CODE, 75),
          textFR: '**Confinement (lorsque requis seulement)**',
          textEN: '**Lockdown (when required only)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 76),
          textFR: 'Fin d\'événement :',
          textEN: 'End of event:',
          isBold: false,
        },
        {
          id: sid(CODE, 77),
          textFR: 'Recevoir le message de retour à la normale via Teams',
          textEN: 'Receive the return-to-normal message via Teams',
          isBold: false,
        },
        {
          id: sid(CODE, 78),
          textFR: 'Transmettre l\'information aux occupants avec calme',
          textEN: 'Transmit information to occupants calmly',
          isBold: false,
        },
        {
          id: sid(CODE, 79),
          textFR: 'Diriger le personnel vers les ressources internes si un soutien psychologique est nécessaire',
          textEN: 'Direct staff to internal resources if psychological support is needed',
          isBold: false,
        },
      ],
    },
    // ── Équipe de première intervention ───────────────────
    {
      roleCode: 'ROLE-EPI',
      roleLabelFR: 'Équipe de première intervention',
      roleLabelEN: 'First Response Team',
      headerColor: COLORS.purple,
      steps: [
        {
          id: sid(CODE, 80),
          textFR: '**Surveillance et détection**',
          textEN: '**Surveillance and detection**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 81),
          textFR: 'Observer les zones extérieures à l\'aide du réseau de caméras :',
          textEN: 'Observe exterior areas using the camera network:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 82),
              textFR: 'Entrée principale',
              textEN: 'Main entrance',
              isList: true,
            },
            {
              id: sid(CODE, 83),
              textFR: 'Stationnements',
              textEN: 'Parking areas',
              isList: true,
            },
            {
              id: sid(CODE, 84),
              textFR: 'Ruelle ou quai de livraison',
              textEN: 'Alley or loading dock',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 85),
          textFR: 'Noter :',
          textEN: 'Note:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 86),
              textFR: 'Nombre approximatif de manifestants',
              textEN: 'Approximate number of demonstrators',
              isList: true,
            },
            {
              id: sid(CODE, 87),
              textFR: 'Lieu exact de rassemblement',
              textEN: 'Exact gathering location',
              isList: true,
            },
            {
              id: sid(CODE, 88),
              textFR: 'Comportement (calme, bruyant, agité, bloquant, provocateur)',
              textEN: 'Behaviour (calm, noisy, agitated, blocking, provocative)',
              isList: true,
            },
            {
              id: sid(CODE, 89),
              textFR: 'Présence de pancartes ou symboles',
              textEN: 'Presence of signs or symbols',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 90),
          textFR: 'Transmettre immédiatement l\'information au coordonnateur d\'urgence',
          textEN: 'Immediately transmit information to the emergency coordinator',
          isBold: false,
        },
        // ── Sécurisation des accès ──────────────────────────
        {
          id: sid(CODE, 91),
          textFR: '**Sécurisation des accès**',
          textEN: '**Securing access points**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 92),
          textFR: 'Verrouiller les accès secondaires non essentiels',
          textEN: 'Lock non-essential secondary access points',
          isBold: false,
        },
        {
          id: sid(CODE, 93),
          textFR: 'Rester à proximité des accès stratégiques, sans confrontation',
          textEN: 'Stay near strategic access points, without confrontation',
          isBold: false,
        },
        {
          id: sid(CODE, 94),
          textFR: 'Si des manifestants approchent ou tentent d\'entrer :',
          textEN: 'If demonstrators approach or attempt to enter:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 95),
              textFR: 'Verrouiller la porte concernée si ce n\'est pas déjà fait',
              textEN: 'Lock the door in question if not already done',
              isList: true,
            },
            {
              id: sid(CODE, 96),
              textFR: 'Ne pas intervenir physiquement',
              textEN: 'Do not physically intervene',
              isList: true,
            },
            {
              id: sid(CODE, 97),
              textFR: 'Alerter immédiatement le coordonnateur',
              textEN: 'Immediately alert the coordinator',
              isList: true,
            },
          ],
        },
        // ── Documentation discrète ──────────────────────────
        {
          id: sid(CODE, 98),
          textFR: '**Documentation discrète**',
          textEN: '**Discreet documentation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 99),
          textFR: 'Noter :',
          textEN: 'Note:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 100),
              textFR: 'Heure de début',
              textEN: 'Start time',
              isList: true,
            },
            {
              id: sid(CODE, 101),
              textFR: 'Taille du groupe',
              textEN: 'Group size',
              isList: true,
            },
            {
              id: sid(CODE, 102),
              textFR: 'Comportement observé',
              textEN: 'Observed behaviour',
              isList: true,
            },
            {
              id: sid(CODE, 103),
              textFR: 'Réactions des occupants visibles',
              textEN: 'Visible occupant reactions',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 104),
          textFR: 'Capturer des images à partir des caméras de surveillance si possible',
          textEN: 'Capture images from surveillance cameras if possible',
          isBold: false,
        },
        {
          id: sid(CODE, 105),
          textFR: 'Ne pas filmer les manifestants avec un appareil mobile personnel ou visible',
          textEN: 'Do not film demonstrators with a personal or visible mobile device',
          isBold: false,
          isRed: true,
        },
        // ── Collaboration ───────────────────────────────────
        {
          id: sid(CODE, 106),
          textFR: '**Collaboration avec le Coordonnateur et le SPVM**',
          textEN: '**Collaboration with the Coordinator and SPVM**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 107),
          textFR: 'Rester à l\'écoute des directives du coordonnateur via radio ou téléphone',
          textEN: 'Stay attentive to coordinator directives via radio or phone',
          isBold: false,
        },
        {
          id: sid(CODE, 108),
          textFR: 'Si le SPVM est sur place :',
          textEN: 'If SPVM is on site:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 109),
              textFR: 'S\'identifier comme agent de sécurité',
              textEN: 'Identify yourself as a security agent',
              isList: true,
            },
            {
              id: sid(CODE, 110),
              textFR: 'Fournir les observations recueillies',
              textEN: 'Provide gathered observations',
              isList: true,
            },
            {
              id: sid(CODE, 111),
              textFR: 'Accompagner les policiers si demandé, sans interaction physique avec les manifestants',
              textEN: 'Accompany police if requested, without physical interaction with demonstrators',
              isList: true,
            },
          ],
        },
        // ── Gestion des occupants ───────────────────────────
        {
          id: sid(CODE, 112),
          textFR: '**Gestion des occupants**',
          textEN: '**Occupant management**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 113),
          textFR: 'Ne pas ouvrir les portes vers l\'extérieur si des manifestants sont présents',
          textEN: 'Do not open doors to the outside if demonstrators are present',
          isBold: false,
        },
        {
          id: sid(CODE, 114),
          textFR: 'Éviter toute interaction verbale ou visuelle avec les manifestants',
          textEN: 'Avoid any verbal or visual interaction with demonstrators',
          isBold: false,
        },
        {
          id: sid(CODE, 115),
          textFR: 'Rediriger les occupants vers un autre accès ou leur demander d\'attendre si l\'entrée est compromise',
          textEN: 'Redirect occupants to another access point or ask them to wait if the entrance is compromised',
          isBold: false,
        },
        // ── Fin de manifestation ────────────────────────────
        {
          id: sid(CODE, 116),
          textFR: '**Fin de manifestation — Surveillance renforcée**',
          textEN: '**End of demonstration — Enhanced surveillance**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 117),
          textFR: 'Effectuer une ronde complète du périmètre extérieur :',
          textEN: 'Conduct a complete round of the exterior perimeter:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 118),
              textFR: 'Vérifier les portes, fenêtres et vitrages',
              textEN: 'Check doors, windows, and glass',
              isList: true,
            },
            {
              id: sid(CODE, 119),
              textFR: 'Noter tout bris, graffiti ou objet suspect',
              textEN: 'Note any breakage, graffiti, or suspicious object',
              isList: true,
            },
            {
              id: sid(CODE, 120),
              textFR: 'Signaler toute anomalie au coordonnateur',
              textEN: 'Report any anomaly to the coordinator',
              isList: true,
            },
          ],
        },
        // ── Rapport d'événement ─────────────────────────────
        {
          id: sid(CODE, 121),
          textFR: '**Rapport d\'événement**',
          textEN: '**Event report**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 122),
          textFR: 'Rédiger un rapport complet incluant :',
          textEN: 'Write a complete report including:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 123),
              textFR: 'Heure de début et de fin',
              textEN: 'Start and end time',
              isList: true,
            },
            {
              id: sid(CODE, 124),
              textFR: 'Nombre approximatif de manifestants',
              textEN: 'Approximate number of demonstrators',
              isList: true,
            },
            {
              id: sid(CODE, 125),
              textFR: 'Comportements ou incidents observés',
              textEN: 'Observed behaviours or incidents',
              isList: true,
            },
            {
              id: sid(CODE, 126),
              textFR: 'Mesures prises',
              textEN: 'Measures taken',
              isList: true,
            },
          ],
        },
      ],
    },
    // ── Responsable de secteur ─────────────────────────────
    {
      roleCode: 'ROLE-RS',
      roleLabelFR: 'Responsable de secteur',
      roleLabelEN: 'Sector Supervisor',
      headerColor: COLORS.purple,
      steps: [
        {
          id: sid(CODE, 127),
          textFR: '**Avis de situation par le Coordonnateur d\'urgence**',
          textEN: '**Situation notice from the Emergency Coordinator**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 128),
          textFR: 'Recevoir un message via le groupe Teams d\'urgence indiquant la présence d\'une manifestation à proximité',
          textEN: 'Receive a message via the emergency Teams group indicating the presence of a demonstration nearby',
          isBold: false,
        },
        {
          id: sid(CODE, 129),
          textFR: '« Manifestation en cours à l\'entrée principale. Aucun déplacement vers cette zone. Plus d\'infos à venir. »',
          textEN: '"Demonstration in progress at main entrance. No movement toward this area. More info to come."',
          isBold: false,
          isRed: true,
        },
        // ── Rassurer les occupants ──────────────────────────
        {
          id: sid(CODE, 130),
          textFR: '**Rassurer les occupants du secteur**',
          textEN: '**Reassure occupants of the sector**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 131),
          textFR: 'Utiliser un ton calme et professionnel :',
          textEN: 'Use a calm and professional tone:',
          isBold: false,
        },
        {
          id: sid(CODE, 132),
          textFR: '« Une situation est en cours à l\'extérieur du bâtiment. Il n\'y a aucun danger immédiat, mais nous vous demandons de rester à votre poste jusqu\'à nouvel ordre. »',
          textEN: '"A situation is in progress outside the building. There is no immediate danger, but we ask you to stay at your post until further notice."',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 133),
          textFR: 'Éviter de nommer ou décrire la nature exacte de la manifestation sauf nécessité opérationnelle',
          textEN: 'Avoid naming or describing the exact nature of the demonstration unless operationally necessary',
          isBold: false,
        },
        // ── Restreindre les déplacements ────────────────────
        {
          id: sid(CODE, 134),
          textFR: '**Restreindre les déplacements**',
          textEN: '**Restrict movement**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 135),
          textFR: 'Demander aux occupants :',
          textEN: 'Ask occupants:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 136),
              textFR: 'D\'éviter les déplacements inutiles, surtout vers les sorties donnant sur la zone touchée',
              textEN: 'To avoid unnecessary movement, especially toward exits facing the affected area',
              isList: true,
            },
            {
              id: sid(CODE, 137),
              textFR: 'De ne pas interagir avec les manifestants ou observer la scène depuis les fenêtres',
              textEN: 'Not to interact with demonstrators or observe the scene from windows',
              isList: true,
            },
          ],
        },
        // ── Communiquer via Teams ───────────────────────────
        {
          id: sid(CODE, 138),
          textFR: '**Communiquer avec le Coordonnateur via Teams**',
          textEN: '**Communicate with the Coordinator via Teams**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 139),
          textFR: 'Transmettre toute information utile :',
          textEN: 'Transmit any useful information:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 140),
              textFR: 'Mouvement anormal dans le secteur',
              textEN: 'Abnormal movement in the sector',
              isList: true,
            },
            {
              id: sid(CODE, 141),
              textFR: 'Présence de manifestants visibles depuis les fenêtres',
              textEN: 'Presence of demonstrators visible from windows',
              isList: true,
            },
            {
              id: sid(CODE, 142),
              textFR: 'Réactions ou inquiétudes des occupants',
              textEN: 'Occupant reactions or concerns',
              isList: true,
            },
            {
              id: sid(CODE, 143),
              textFR: 'Problème d\'accès ou de livraison',
              textEN: 'Access or delivery problem',
              isList: true,
            },
          ],
        },
        // ── Escalade ────────────────────────────────────────
        {
          id: sid(CODE, 144),
          textFR: '**En cas d\'escalade ou de déplacement de la manifestation**',
          textEN: '**In case of escalation or movement of the demonstration**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 145),
          textFR: 'Si la manifestation se rapproche ou devient perturbatrice (cris, jets d\'objets, tentative d\'intrusion) :',
          textEN: 'If the demonstration approaches or becomes disruptive (shouting, throwing objects, attempted intrusion):',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 146),
              textFR: 'Verrouiller les accès intérieurs si requis',
              textEN: 'Lock interior access points if required',
              isList: true,
            },
            {
              id: sid(CODE, 147),
              textFR: 'Avertir immédiatement le coordonnateur via Teams',
              textEN: 'Immediately notify the coordinator via Teams',
              isList: true,
            },
            {
              id: sid(CODE, 148),
              textFR: 'Ne pas intervenir directement',
              textEN: 'Do not intervene directly',
              isList: true,
            },
          ],
        },
        // ── Fin d'événement ─────────────────────────────────
        {
          id: sid(CODE, 149),
          textFR: '**Fin d\'événement**',
          textEN: '**End of event**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 150),
          textFR: 'Recevoir le message de retour à la normale via Teams',
          textEN: 'Receive the return-to-normal message via Teams',
          isBold: false,
        },
        {
          id: sid(CODE, 151),
          textFR: 'Transmettre l\'information aux occupants avec calme',
          textEN: 'Transmit information to occupants calmly',
          isBold: false,
        },
        {
          id: sid(CODE, 152),
          textFR: 'Diriger le personnel vers les ressources internes si un soutien psychologique est nécessaire',
          textEN: 'Direct staff to internal resources if psychological support is needed',
          isBold: false,
        },
      ],
    },
  ],
};