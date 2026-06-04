// ============================================================
// CORO — P019 : Menace ou alerte à la bombe
// Toujours présent dans PMU et PSI
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P019';

export const P019_ALERTE_BOMBE: ProcedureTemplate = {
  id: 'p019_alerte_bombe',
  code: CODE,
  titleFR: 'MENACE OU ALERTE À LA BOMBE',
  titleEN: 'BOMB THREAT OR ALERT',
  icon: '💣',
  headerColor: COLORS.onyx,
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    // ── Coordonnateur d'urgence ────────────────────────────
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.onyx,
      steps: [
        // ── Principes de base ───────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Principes de base**',
          textEN: '**Basic principles**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Considérer toute menace ou colis suspect comme réelle',
          textEN: 'Treat every threat or suspicious package as real',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Éviter de créer un mouvement de panique',
          textEN: 'Avoid creating a panic movement',
          isBold: false,
        },
        {
          id: sid(CODE, 4),
          textFR: 'Prioriser la protection des usagers, employés et visiteurs',
          textEN: 'Prioritize the protection of users, employees, and visitors',
          isBold: false,
        },
        // ── Réception de la menace ou du signalement ────────
        {
          id: sid(CODE, 5),
          textFR: '**Réception de la menace ou du signalement**',
          textEN: '**Receiving the threat or report**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Menace reçue par téléphone :',
          textEN: 'Threat received by phone:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 7),
              textFR: 'Rester calme et prolonger la conversation',
              textEN: 'Stay calm and extend the conversation',
              isList: true,
            },
            {
              id: sid(CODE, 8),
              textFR: 'Noter la formulation exacte, la voix, le ton, les sons de fond, l\'accent, etc.',
              textEN: 'Note the exact wording, voice, tone, background sounds, accent, etc.',
              isList: true,
            },
            {
              id: sid(CODE, 9),
              textFR: 'Recueillir toute information possible : lieu ciblé, heure prévue, motifs invoqués',
              textEN: 'Gather all possible information: targeted location, planned time, stated motives',
              isList: true,
            },
            {
              id: sid(CODE, 10),
              textFR: 'Remplir dès que possible la Fiche d\'alerte à la bombe (voir annexe)',
              textEN: 'Fill out the Bomb Threat Record Form as soon as possible (see appendix)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 11),
          textFR: 'Menace reçue par écrit ou découverte d\'un objet suspect :',
          textEN: 'Threat received in writing or discovery of a suspicious object:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 12),
              textFR: 'Ne rien toucher — préserver les preuves pour la police',
              textEN: 'Do not touch anything — preserve evidence for police',
              isList: true,
            },
            {
              id: sid(CODE, 13),
              textFR: 'Isoler la zone en attendant les autorités',
              textEN: 'Isolate the area while awaiting authorities',
              isList: true,
            },
            {
              id: sid(CODE, 14),
              textFR: 'Noter les circonstances de la découverte dans la fiche d\'alerte',
              textEN: 'Note the circumstances of the discovery in the alert form',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 15),
          textFR: 'Menace reçue par courriel :',
          textEN: 'Threat received by email:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 16),
              textFR: 'Ne pas supprimer le message — contacter immédiatement le responsable TI pour préserver les preuves numériques',
              textEN: 'Do not delete the message — immediately contact the IT manager to preserve digital evidence',
              isList: true,
            },
            {
              id: sid(CODE, 17),
              textFR: 'Faire une capture d\'écran si possible',
              textEN: 'Take a screenshot if possible',
              isList: true,
            },
          ],
        },
        // ── Aviser les autorités ────────────────────────────
        {
          id: sid(CODE, 18),
          textFR: '**Aviser les autorités**',
          textEN: '**Notifying authorities**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 19),
          textFR: 'Contacter immédiatement le 9-1-1 et annoncer :',
          textEN: 'Immediately contact 9-1-1 and announce:',
          isBold: false,
        },
        {
          id: sid(CODE, 20),
          textFR: '« Alerte à la bombe confirmée/suspectée au [ADRESSE COMPLÈTE DU SITE]. Type : [appel/objet/message]. Zone concernée : [à préciser]. Équipe en place. En attente de directives. »',
          textEN: '"Confirmed/suspected bomb threat at [COMPLETE SITE ADDRESS]. Type: [call/object/message]. Affected area: [to specify]. Team in place. Awaiting instructions."',
          isBold: false,
          isRed: true,
        },
        // ── Aviser les gestionnaires ────────────────────────
        {
          id: sid(CODE, 21),
          textFR: '**Aviser les gestionnaires**',
          textEN: '**Notifying managers**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 22),
          textFR: 'Diffuser sur le groupe Teams d\'urgence :',
          textEN: 'Broadcast on the emergency Teams group:',
          isBold: false,
        },
        {
          id: sid(CODE, 23),
          textFR: 'ALERTE À LA BOMBE EN COURS – ZONE EN ÉVALUATION. Restez à vos postes et attendez les consignes. Évitez les déplacements inutiles. Pas de message public.',
          textEN: 'BOMB ALERT IN PROGRESS – AREA UNDER EVALUATION. Stay at your posts and await instructions. Avoid unnecessary movement. No public message.',
          isBold: false,
          isRed: true,
        },
        // ── Isolement de la zone ciblée ─────────────────────
        {
          id: sid(CODE, 24),
          textFR: '**Isolement de la zone ciblée**',
          textEN: '**Isolation of the targeted area**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 25),
          textFR: 'Évacuer les occupants dans un rayon sécuritaire',
          textEN: 'Evacuate occupants within a safe radius',
          isBold: false,
        },
        {
          id: sid(CODE, 26),
          textFR: 'Fermer les accès et interdire toute entrée non autorisée',
          textEN: 'Close access points and prohibit all unauthorized entry',
          isBold: false,
        },
        {
          id: sid(CODE, 27),
          textFR: 'Maintenir la surveillance du périmètre',
          textEN: 'Maintain perimeter surveillance',
          isBold: false,
        },
        {
          id: sid(CODE, 28),
          textFR: 'Si un emplacement précis est mentionné, laisser portes et fenêtres ouvertes pour disperser la pression de souffle en cas d\'explosion',
          textEN: 'If a specific location is mentioned, leave doors and windows open to disperse blast pressure in case of explosion',
          isBold: false,
          isRed: true,
        },
        // ── Collaboration avec le SPVM ──────────────────────
        {
          id: sid(CODE, 29),
          textFR: '**Collaboration avec le SPVM / service de police**',
          textEN: '**Collaboration with SPVM / police service**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Se tenir disponible comme point de contact',
          textEN: 'Be available as a point of contact',
          isBold: false,
        },
        {
          id: sid(CODE, 31),
          textFR: 'Fournir toute information collectée',
          textEN: 'Provide all collected information',
          isBold: false,
        },
        {
          id: sid(CODE, 32),
          textFR: 'Assister à l\'établissement du périmètre de sécurité',
          textEN: 'Assist in establishing the security perimeter',
          isBold: false,
        },
        {
          id: sid(CODE, 33),
          textFR: 'Remettre la fiche d\'alerte complétée',
          textEN: 'Submit the completed alert form',
          isBold: false,
        },
        {
          id: sid(CODE, 34),
          textFR: 'Transmettre tous les éléments recueillis : notes, messages, description de l\'objet suspect',
          textEN: 'Transmit all gathered elements: notes, messages, description of the suspicious object',
          isBold: false,
        },
        {
          id: sid(CODE, 35),
          textFR: 'Offrir l\'appui des agents de sécurité pour la fouille interne, selon directives policières :',
          textEN: 'Offer security agents\' support for internal search, per police directives:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 36),
              textFR: 'Chaque agent inspecte son secteur sous supervision',
              textEN: 'Each agent inspects their sector under supervision',
              isList: true,
            },
            {
              id: sid(CODE, 37),
              textFR: 'Aucun contact avec les objets suspects',
              textEN: 'No contact with suspicious objects',
              isList: true,
            },
            {
              id: sid(CODE, 38),
              textFR: 'Rapport immédiat de toute anomalie',
              textEN: 'Immediate report of any anomaly',
              isList: true,
            },
          ],
        },
        // ── Communication continue ──────────────────────────
        {
          id: sid(CODE, 39),
          textFR: '**Communication continue**',
          textEN: '**Ongoing communication**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 40),
          textFR: 'Fournir des mises à jour claires sur le groupe Teams, selon l\'évolution et les directives du SPVM',
          textEN: 'Provide clear updates on the Teams group, based on developments and SPVM directives',
          isBold: false,
        },
        {
          id: sid(CODE, 41),
          textFR: '« Fouille en cours. Évacuation préventive secteur A, 2e étage. Aucune menace confirmée à ce stade. »',
          textEN: '"Search in progress. Preventive evacuation sector A, 2nd floor. No confirmed threat at this stage."',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 42),
          textFR: 'Attendre les directives policières avant toute réintégration',
          textEN: 'Wait for police directives before any re-entry',
          isBold: false,
        },
        // ── Suivi et documentation ──────────────────────────
        {
          id: sid(CODE, 43),
          textFR: '**Suivi et documentation**',
          textEN: '**Follow-up and documentation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 44),
          textFR: 'Compléter intégralement la fiche d\'alerte à la bombe (heure, contenu, témoin, actions)',
          textEN: 'Fully complete the bomb threat form (time, content, witness, actions)',
          isBold: false,
        },
        {
          id: sid(CODE, 45),
          textFR: 'Joindre tout document ou preuve pertinente',
          textEN: 'Attach any relevant document or evidence',
          isBold: false,
        },
        {
          id: sid(CODE, 46),
          textFR: 'Classer dans les dossiers de sécurité et transmettre au responsable corporatif de la sécurité si requis',
          textEN: 'File in security records and transmit to the corporate security officer if required',
          isBold: false,
        },
        // ── Après l'intervention ────────────────────────────
        {
          id: sid(CODE, 47),
          textFR: '**Après l\'intervention**',
          textEN: '**After the intervention**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 48),
          textFR: 'Autoriser la réintégration uniquement après levée de l\'alerte par les autorités',
          textEN: 'Authorize re-entry only after the alert has been lifted by authorities',
          isBold: false,
        },
        {
          id: sid(CODE, 49),
          textFR: 'Rédiger un rapport d\'incident incluant :',
          textEN: 'Write an incident report including:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 50),
              textFR: 'Heure, lieu, nature de la menace',
              textEN: 'Time, location, nature of the threat',
              isList: true,
            },
            {
              id: sid(CODE, 51),
              textFR: 'Description et photos du colis (si sécuritaire)',
              textEN: 'Description and photos of the package (if safe)',
              isList: true,
            },
            {
              id: sid(CODE, 52),
              textFR: 'Actions entreprises',
              textEN: 'Actions taken',
              isList: true,
            },
            {
              id: sid(CODE, 53),
              textFR: 'Coordonnées des témoins',
              textEN: 'Witness contact information',
              isList: true,
            },
            {
              id: sid(CODE, 54),
              textFR: 'Recommandations pour amélioration',
              textEN: 'Recommendations for improvement',
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
      headerColor: COLORS.dark,
      steps: [
        {
          id: sid(CODE, 55),
          textFR: '**Réception de l\'ordre d\'intervention**',
          textEN: '**Receiving the intervention order**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 56),
          textFR: 'Recevoir un mandat du Coordonnateur d\'urgence pour soutenir une fouille des espaces communs après menace ou signalement',
          textEN: 'Receive a mandate from the Emergency Coordinator to support a search of common areas after a threat or report',
          isBold: false,
        },
        {
          id: sid(CODE, 57),
          textFR: 'Ne pas intervenir de sa propre initiative',
          textEN: 'Do not intervene on your own initiative',
          isBold: false,
        },
        {
          id: sid(CODE, 58),
          textFR: 'Agir uniquement sous coordination du service de police',
          textEN: 'Act only under coordination of the police service',
          isBold: false,
        },
        // ── Règles générales de conduite ────────────────────
        {
          id: sid(CODE, 59),
          textFR: '**Règles générales de conduite**',
          textEN: '**General rules of conduct**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 60),
          textFR: 'Rester calme, méthodique et vigilant',
          textEN: 'Stay calm, methodical, and vigilant',
          isBold: false,
        },
        {
          id: sid(CODE, 61),
          textFR: 'Ne toucher à aucun objet suspect, même en cas de doute',
          textEN: 'Do not touch any suspicious object, even if in doubt',
          isBold: false,
        },
        {
          id: sid(CODE, 62),
          textFR: 'En cas de doute : s\'immobiliser, sécuriser le périmètre, reculer et informer immédiatement le Coordonnateur',
          textEN: 'If in doubt: stop, secure the perimeter, step back, and immediately inform the Coordinator',
          isBold: false,
        },
        {
          id: sid(CODE, 63),
          textFR: 'Ne pas utiliser de radio à proximité d\'un objet suspect',
          textEN: 'Do not use radio near a suspicious object',
          isBold: false,
          isRed: true,
        },
        // ── Fouille interne ─────────────────────────────────
        {
          id: sid(CODE, 64),
          textFR: '**Fouille interne — en collaboration avec le service de police**',
          textEN: '**Internal search — in collaboration with the police service**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 65),
          textFR: 'Effectuer la fouille uniquement sur demande du service de police et sous leur supervision',
          textEN: 'Conduct the search only at the request of the police service and under their supervision',
          isBold: false,
        },
        {
          id: sid(CODE, 66),
          textFR: 'Fouiller seulement les zones autorisées, en priorité :',
          textEN: 'Search only authorized areas, in priority order:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 67),
              textFR: 'Sorties de secours',
              textEN: 'Emergency exits',
              isList: true,
            },
            {
              id: sid(CODE, 68),
              textFR: 'Aires communes du secteur visé',
              textEN: 'Common areas of the targeted sector',
              isList: true,
            },
            {
              id: sid(CODE, 69),
              textFR: 'Bureaux, studios, ateliers',
              textEN: 'Offices, studios, workshops',
              isList: true,
            },
            {
              id: sid(CODE, 70),
              textFR: 'Espaces techniques (si sécuritaires)',
              textEN: 'Technical spaces (if safe)',
              isList: true,
            },
          ],
        },
        // ── Technique de fouille systématique ───────────────
        {
          id: sid(CODE, 71),
          textFR: '**Technique de fouille systématique**',
          textEN: '**Systematic search technique**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 72),
          textFR: 'Pour chaque pièce :',
          textEN: 'For each room:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 73),
              textFR: 'Entrer calmement et se placer au centre',
              textEN: 'Enter calmly and position yourself in the center',
              isList: true,
            },
            {
              id: sid(CODE, 74),
              textFR: 'Entrer en silence pour détecter bruits inhabituels (tic-tac, sifflement, vibration, etc.)',
              textEN: 'Enter in silence to detect unusual sounds (ticking, hissing, vibration, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 75),
              textFR: 'Si bruit suspect : reculer sans alerter la source',
              textEN: 'If suspicious sound: step back without alerting the source',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 76),
          textFR: 'Balayer visuellement la pièce de gauche à droite :',
          textEN: 'Visually scan the room from left to right:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 77),
              textFR: 'Sol à hauteur de ceinture',
              textEN: 'Floor to waist height',
              isList: true,
            },
            {
              id: sid(CODE, 78),
              textFR: 'Ceinture à tête',
              textEN: 'Waist to head height',
              isList: true,
            },
            {
              id: sid(CODE, 79),
              textFR: 'Tête au plafond',
              textEN: 'Head to ceiling',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 80),
          textFR: 'Procéder à la fouille matérielle :',
          textEN: 'Proceed with material search:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 81),
              textFR: 'Armoires ouvertes',
              textEN: 'Open cabinets',
              isList: true,
            },
            {
              id: sid(CODE, 82),
              textFR: 'Tiroirs ou classeurs déverrouillés',
              textEN: 'Unlocked drawers or filing cabinets',
              isList: true,
            },
            {
              id: sid(CODE, 83),
              textFR: 'Garde-robes',
              textEN: 'Closets',
              isList: true,
            },
            {
              id: sid(CODE, 84),
              textFR: 'Panneaux de plafond suspendu',
              textEN: 'Suspended ceiling panels',
              isList: true,
            },
            {
              id: sid(CODE, 85),
              textFR: 'Plafonniers, lampes, bouches de ventilation',
              textEN: 'Light fixtures, lamps, ventilation openings',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 86),
          textFR: 'Ne rien manipuler d\'inhabituel',
          textEN: 'Do not handle anything unusual',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 87),
          textFR: 'Ne forcer aucun accès fermé',
          textEN: 'Do not force any closed access',
          isBold: false,
          isRed: true,
        },
        // ── Découverte d'un objet suspect ───────────────────
        {
          id: sid(CODE, 88),
          textFR: '**Découverte d\'un objet ou colis suspect**',
          textEN: '**Discovery of a suspicious object or package**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 89),
          textFR: 'Ne pas toucher l\'objet',
          textEN: 'Do not touch the object',
          isBold: false,
        },
        {
          id: sid(CODE, 90),
          textFR: 'Éloigner calmement les personnes à proximité',
          textEN: 'Calmly move people away from the area',
          isBold: false,
        },
        {
          id: sid(CODE, 91),
          textFR: 'Alerter immédiatement le Coordonnateur d\'urgence et le service de police',
          textEN: 'Immediately alert the Emergency Coordinator and police service',
          isBold: false,
        },
        {
          id: sid(CODE, 92),
          textFR: 'Suivre attentivement les consignes du service de police et rester en retrait',
          textEN: 'Carefully follow police instructions and remain at a distance',
          isBold: false,
        },
        // ── Documentation ───────────────────────────────────
        {
          id: sid(CODE, 93),
          textFR: '**Documentation — Fiche d\'alerte à la bombe**',
          textEN: '**Documentation — Bomb threat record form**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 94),
          textFR: 'Remplir immédiatement la fiche d\'alerte à la bombe (annexe) si :',
          textEN: 'Immediately fill out the bomb threat record form (appendix) if:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 95),
              textFR: 'Menace reçue directement',
              textEN: 'Threat received directly',
              isList: true,
            },
            {
              id: sid(CODE, 96),
              textFR: 'Fouille effectuée',
              textEN: 'Search conducted',
              isList: true,
            },
            {
              id: sid(CODE, 97),
              textFR: 'Découverte ou signalement effectué',
              textEN: 'Discovery or report made',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 98),
          textFR: 'Inclure :',
          textEN: 'Include:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 99),
              textFR: 'Heure, lieu, observations précises',
              textEN: 'Time, location, precise observations',
              isList: true,
            },
            {
              id: sid(CODE, 100),
              textFR: 'Description de tout objet suspect',
              textEN: 'Description of any suspicious object',
              isList: true,
            },
            {
              id: sid(CODE, 101),
              textFR: 'Actions entreprises',
              textEN: 'Actions taken',
              isList: true,
            },
          ],
        },
        // ── Fin d'intervention ──────────────────────────────
        {
          id: sid(CODE, 102),
          textFR: '**Fin d\'intervention**',
          textEN: '**End of intervention**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 103),
          textFR: 'Attendre que le secteur soit déclaré sécuritaire par le service de police avant reprise des activités',
          textEN: 'Wait for the sector to be declared safe by the police before resuming activities',
          isBold: false,
        },
        {
          id: sid(CODE, 104),
          textFR: 'Ne pas communiquer d\'informations sensibles à des occupants ou collègues non impliqués',
          textEN: 'Do not communicate sensitive information to uninvolved occupants or colleagues',
          isBold: false,
        },
      ],
    },
    // ── Responsable de secteur ─────────────────────────────
    {
      roleCode: 'ROLE-RS',
      roleLabelFR: 'Responsable de secteur',
      roleLabelEN: 'Sector Supervisor',
      headerColor: COLORS.dark,
      steps: [
        {
          id: sid(CODE, 105),
          textFR: '**Avis de l\'alerte par le Coordonnateur d\'urgence**',
          textEN: '**Alert notice from the Emergency Coordinator**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 106),
          textFR: 'Recevoir une alerte via le groupe Teams d\'urgence indiquant une situation suspecte (menace, colis, évacuation sectorielle, etc.)',
          textEN: 'Receive an alert via the emergency Teams group indicating a suspicious situation (threat, package, sectoral evacuation, etc.)',
          isBold: false,
        },
        {
          id: sid(CODE, 107),
          textFR: '« ALERTE À LA BOMBE – Évaluation en cours. Ne bougez pas tant que vous n\'avez pas de consigne. »',
          textEN: '"BOMB ALERT – Evaluation in progress. Do not move until you receive instructions."',
          isBold: false,
          isRed: true,
        },
        // ── Aviser immédiatement les occupants ───────────────
        {
          id: sid(CODE, 108),
          textFR: '**Aviser immédiatement les occupants**',
          textEN: '**Immediately notify occupants**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 109),
          textFR: 'Transmettre la nature de l\'alerte et les zones concernées',
          textEN: 'Transmit the nature of the alert and the areas concerned',
          isBold: false,
        },
        // ── Gérer les occupants du secteur ──────────────────
        {
          id: sid(CODE, 110),
          textFR: '**Gérer les occupants du secteur**',
          textEN: '**Managing occupants of the sector**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 111),
          textFR: 'Rassurer le personnel sans utiliser les mots « bombe » ou « explosif »',
          textEN: 'Reassure staff without using the words "bomb" or "explosive"',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 112),
          textFR: 'Employer un ton calme : « Une situation est en cours. Restez à votre poste et attendez les consignes officielles. »',
          textEN: 'Use a calm tone: "A situation is in progress. Stay at your post and await official instructions."',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 113),
          textFR: 'Suivre strictement les consignes du Coordonnateur d\'urgence',
          textEN: 'Strictly follow the Emergency Coordinator\'s instructions',
          isBold: false,
        },
        {
          id: sid(CODE, 114),
          textFR: 'Ne pas prendre d\'initiative personnelle sans directive du service de police ou du Coordonnateur',
          textEN: 'Do not take personal initiative without directive from the police service or Coordinator',
          isBold: false,
        },
        {
          id: sid(CODE, 115),
          textFR: 'En cas d\'évacuation sectorielle demandée :',
          textEN: 'If sectoral evacuation is requested:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 116),
              textFR: 'Diriger les occupants vers la sortie la plus sécuritaire',
              textEN: 'Direct occupants to the safest exit',
              isList: true,
            },
            {
              id: sid(CODE, 117),
              textFR: 'Noter les personnes à mobilité réduite ou ayant des besoins particuliers',
              textEN: 'Note persons with reduced mobility or special needs',
              isList: true,
            },
          ],
        },
        // ── Communiquer avec le Coordonnateur ───────────────
        {
          id: sid(CODE, 118),
          textFR: '**Communiquer avec le Coordonnateur d\'urgence (Teams)**',
          textEN: '**Communicate with the Emergency Coordinator (Teams)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 119),
          textFR: 'Utiliser le groupe Teams d\'urgence pour confirmer l\'état du secteur (ex. : évacué, calme, activité suspendue)',
          textEN: 'Use the emergency Teams group to confirm sector status (e.g., evacuated, calm, activity suspended)',
          isBold: false,
        },
        {
          id: sid(CODE, 120),
          textFR: 'Signaler toute anomalie constatée au Coordonnateur',
          textEN: 'Report any anomaly observed to the Coordinator',
          isBold: false,
        },
        // ── Interdire l'accès au secteur ────────────────────
        {
          id: sid(CODE, 121),
          textFR: '**Interdire l\'accès au secteur concerné**',
          textEN: '**Prohibit access to the affected sector**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 122),
          textFR: 'Ne pas toucher à un objet suspect signalé dans le secteur',
          textEN: 'Do not touch any suspicious object reported in the sector',
          isBold: false,
        },
        {
          id: sid(CODE, 123),
          textFR: 'Interdire l\'accès au local ou à la zone concernée',
          textEN: 'Prohibit access to the room or area concerned',
          isBold: false,
        },
        {
          id: sid(CODE, 124),
          textFR: 'Attendre l\'arrivée de la sécurité ou des policiers',
          textEN: 'Await the arrival of security or police',
          isBold: false,
        },
        // ── Après intervention ──────────────────────────────
        {
          id: sid(CODE, 125),
          textFR: '**Après intervention**',
          textEN: '**After intervention**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 126),
          textFR: 'Attendre l\'autorisation du Coordonnateur ou du service de police avant toute reprise d\'activité',
          textEN: 'Wait for authorization from the Coordinator or police service before resuming any activity',
          isBold: false,
        },
        {
          id: sid(CODE, 127),
          textFR: 'Si des employés sont incommodés ou stressés, offrir un soutien adapté ou les diriger vers les ressources internes',
          textEN: 'If employees are distressed or stressed, offer appropriate support or refer them to internal resources',
          isBold: false,
        },
      ],
    },
  ],
};