// ============================================================
// CORO — P005 : Fuite de gaz naturel
// Activé si : has_gas
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P005';

export const P005_FUITE_GAZ: ProcedureTemplate = {
  id: 'p005_fuite_gaz',
  code: CODE,
  titleFR: 'FUITE DE GAZ NATUREL',
  titleEN: 'NATURAL GAS LEAK',
  icon: '💨',
  headerColor: COLORS.gray,
  activationRule: 'has_gas',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.gray,
      steps: [
        // ── Réception d'une suspicion de fuite ─────────────
        {
          id: sid(CODE, 1),
          textFR: '**Réception d\'une suspicion de fuite**',
          textEN: '**Receiving a suspected leak**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Recevoir un avis (appel ou en personne) d\'un occupant ou gestionnaire signalant :',
          textEN: 'Receive a report (call or in person) from an occupant or manager indicating:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 3),
              textFR: 'Odeur de gaz (type « œufs pourris »)',
              textEN: 'Gas odour (like rotten eggs)',
              isList: true,
            },
            {
              id: sid(CODE, 4),
              textFR: 'Bruit anormal (sifflement, fuite) près d\'un appareil au gaz ou d\'un local technique',
              textEN: 'Abnormal noise (hissing, leak) near a gas appliance or mechanical room',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 5),
          textFR: 'Ne jamais tenter de confirmer la fuite soi-même',
          textEN: 'Never attempt to confirm the leak yourself',
          isBold: false,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Ne pas activer d\'interrupteur, lumière ou équipement électrique dans le secteur concerné',
          textEN: 'Do not activate any switch, light, or electrical equipment in the affected area',
          isBold: false,
        },
        // ── Envoi d'un agent sur place ──────────────────────
        {
          id: sid(CODE, 7),
          textFR: '**Envoi d\'un agent sur place**',
          textEN: '**Sending an agent on site**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 8),
          textFR: 'Désigner un agent pour se rendre sur place avec prudence',
          textEN: 'Designate an agent to proceed to the site with caution',
          isBold: false,
        },
        {
          id: sid(CODE, 9),
          textFR: 'Vérifier uniquement :',
          textEN: 'Verify only:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 10),
              textFR: 'Odeur prononcée de gaz',
              textEN: 'Strong gas odour',
              isList: true,
            },
            {
              id: sid(CODE, 11),
              textFR: 'Bruit de sifflement',
              textEN: 'Hissing sound',
              isList: true,
            },
            {
              id: sid(CODE, 12),
              textFR: 'Fermer la valve',
              textEN: 'Close the valve',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 13),
          textFR: 'Si odeur confirmée, revenir immédiatement sans activer d\'équipement',
          textEN: 'If odour confirmed, return immediately without activating any equipment',
          isBold: false,
        },
        // ── Confirmation de la fuite – Actions immédiates ───
        {
          id: sid(CODE, 14),
          textFR: '**Confirmation de la fuite – Actions immédiates**',
          textEN: '**Leak confirmed – Immediate actions**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 15),
          textFR: 'Envoyer un message sur le groupe Teams d\'urgence (gestionnaires seulement) :',
          textEN: 'Send a message on the emergency Teams group (managers only):',
          isBold: false,
        },
        {
          id: sid(CODE, 16),
          textFR: 'SUSPICION DE FUITE DE GAZ AU *** Donnez le secteur ***. Évacuation en cours de ce secteur. Plus d\'information à suivre.',
          textEN: 'SUSPECTED GAS LEAK AT *** Provide sector ***. Evacuation underway in this sector. More information to follow.',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 17),
          textFR: '**Appeler le 9-1-1** et indiquer :',
          textEN: '**Call 9-1-1** and indicate:',
          isBold: true,
          subSteps: [
            {
              id: sid(CODE, 18),
              textFR: 'Adresse : [ADRESSE COMPLÈTE DU SITE]',
              textEN: 'Address: [COMPLETE SITE ADDRESS]',
              isList: true,
            },
            {
              id: sid(CODE, 19),
              textFR: 'Suspicion de fuite de gaz naturel au ___________',
              textEN: 'Suspected natural gas leak at ___________',
              isList: true,
            },
            {
              id: sid(CODE, 20),
              textFR: 'Évacuation en cours du secteur impacté',
              textEN: 'Evacuation underway in the affected sector',
              isList: true,
            },
            {
              id: sid(CODE, 21),
              textFR: 'Informations pertinentes supplémentaires',
              textEN: 'Additional relevant information',
              isList: true,
            },
          ],
        },
        // ── Évacuation du lieu ──────────────────────────────
        {
          id: sid(CODE, 22),
          textFR: '**Évacuation du lieu**',
          textEN: '**Evacuation of the area**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 23),
          textFR: 'Ordonner l\'évacuation immédiate de tous les bureaux du lieu de détection',
          textEN: 'Order the immediate evacuation of all offices at the detection site',
          isBold: false,
        },
        {
          id: sid(CODE, 24),
          textFR: 'Diriger un ou plusieurs agents pour aviser directement les occupants',
          textEN: 'Direct one or more agents to notify occupants directly',
          isBold: false,
        },
        {
          id: sid(CODE, 25),
          textFR: 'Ne pas déclencher l\'alarme incendie (risque d\'étincelle)',
          textEN: 'Do not activate the fire alarm (risk of spark)',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 26),
          textFR: 'Diriger les occupants vers un secteur sécuritaire à l\'étage supérieur ou à l\'extérieur selon les consignes des pompiers – Si suspicion de dégradation de la situation, évacuer le bâtiment',
          textEN: 'Direct occupants to a safe area on the upper floor or outside per firefighter instructions – If situation may worsen, evacuate the building',
          isBold: false,
        },
        // ── Limiter l'accès ─────────────────────────────────
        {
          id: sid(CODE, 27),
          textFR: '**Limiter l\'accès**',
          textEN: '**Restrict access**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 28),
          textFR: 'Empêcher toute descente vers le lieu de la détection pendant l\'intervention',
          textEN: 'Prevent anyone from going toward the detection site during the intervention',
          isBold: false,
        },
        // ── Accueil des pompiers ────────────────────────────
        {
          id: sid(CODE, 29),
          textFR: '**Accueil des pompiers**',
          textEN: '**Receiving firefighters**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Informer que la valve interne est située [LOCALISATION VALVE GAZ]',
          textEN: 'Inform that the internal valve is located [GAS VALVE LOCATION]',
          isBold: false,
        },
        {
          id: sid(CODE, 31),
          textFR: 'Fournir :',
          textEN: 'Provide:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 32),
              textFR: 'Plan des lieux',
              textEN: 'Site plan',
              isList: true,
            },
            {
              id: sid(CODE, 33),
              textFR: 'Cartes d\'accès et clés',
              textEN: 'Access cards and keys',
              isList: true,
            },
            {
              id: sid(CODE, 34),
              textFR: 'Emplacement de la valve',
              textEN: 'Valve location',
              isList: true,
            },
            {
              id: sid(CODE, 35),
              textFR: 'Chronologie des événements',
              textEN: 'Chronology of events',
              isList: true,
            },
            {
              id: sid(CODE, 36),
              textFR: 'État d\'occupation du sous-sol',
              textEN: 'Basement occupancy status',
              isList: true,
            },
          ],
        },
        // ── Suivi avec les gestionnaires ────────────────────
        {
          id: sid(CODE, 37),
          textFR: '**Suivi avec les gestionnaires**',
          textEN: '**Follow-up with managers**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 38),
          textFR: 'Une fois la situation sous contrôle, publier sur Teams :',
          textEN: 'Once the situation is under control, post on Teams:',
          isBold: false,
        },
        {
          id: sid(CODE, 39),
          textFR: 'Fuite de gaz sous contrôle. Pompiers sur place. Retour progressif à la normale selon leurs consignes.',
          textEN: 'Gas leak under control. Firefighters on site. Gradual return to normal per their instructions.',
          isBold: false,
          isRed: true,
        },
        // ── Rapport d'événement ─────────────────────────────
        {
          id: sid(CODE, 40),
          textFR: '**Rapport d\'événement**',
          textEN: '**Incident report**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 41),
          textFR: 'Inclure :',
          textEN: 'Include:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 42),
              textFR: 'Heure de la détection',
              textEN: 'Time of detection',
              isList: true,
            },
            {
              id: sid(CODE, 43),
              textFR: 'Personne ayant donné l\'alerte',
              textEN: 'Person who gave the alert',
              isList: true,
            },
            {
              id: sid(CODE, 44),
              textFR: 'Observations du premier agent',
              textEN: 'First agent\'s observations',
              isList: true,
            },
            {
              id: sid(CODE, 45),
              textFR: 'Heure d\'appel au 9-1-1',
              textEN: 'Time of 9-1-1 call',
              isList: true,
            },
            {
              id: sid(CODE, 46),
              textFR: 'Nombre de personnes évacuées',
              textEN: 'Number of persons evacuated',
              isList: true,
            },
            {
              id: sid(CODE, 47),
              textFR: 'Mesures prises',
              textEN: 'Measures taken',
              isList: true,
            },
            {
              id: sid(CODE, 48),
              textFR: 'Recommandations futures (détection, ventilation, entretien)',
              textEN: 'Future recommendations (detection, ventilation, maintenance)',
              isList: true,
            },
          ],
        },
        // ── Note technique ──────────────────────────────────
        {
          id: sid(CODE, 49),
          textFR: '💡 La substance odorante ajoutée au gaz naturel, le mercaptan, dégage une forte odeur d\'œufs pourris.',
          textEN: '💡 The odorant added to natural gas, mercaptan, produces a strong rotten egg smell.',
          isBold: false,
          isRed: false,
        },
      ],
    },
  ],
};