// ============================================================
// CORO — P016 : Coupure de courant
// Toujours présent dans PMU et PSI
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P016';

export const P016_COUPURE_COURANT: ProcedureTemplate = {
  id: 'p016_coupure_courant',
  code: CODE,
  titleFR: 'COUPURE DE COURANT',
  titleEN: 'POWER OUTAGE',
  icon: '⚡',
  headerColor: COLORS.orange,
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.orange,
      steps: [
        // ── Détection de la panne ───────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Détection de la panne**',
          textEN: '**Outage detection**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Confirmer la panne par alerte interne ou signalement',
          textEN: 'Confirm the outage via internal alert or report',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Vérifier que les génératrices de secours prennent le relais',
          textEN: 'Verify that backup generators have taken over',
          isBold: false,
        },
        {
          id: sid(CODE, 4),
          textFR: 'Si l\'alimentation est maintenue sans interruption notable, considérer que le système fonctionne normalement',
          textEN: 'If power is maintained without notable interruption, consider the system operating normally',
          isBold: false,
        },
        // ── Consultation Hydro-Québec ───────────────────────
        {
          id: sid(CODE, 5),
          textFR: '**Consultation du site d\'Hydro-Québec**',
          textEN: '**Consulting the Hydro-Québec website**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Accéder à : https://pannes.hydroquebec.com',
          textEN: 'Access: https://pannes.hydroquebec.com',
          isBold: false,
        },
        {
          id: sid(CODE, 7),
          textFR: 'Noter :',
          textEN: 'Note:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 8),
              textFR: 'Heure estimée du retour à la normale',
              textEN: 'Estimated time of restoration',
              isList: true,
            },
            {
              id: sid(CODE, 9),
              textFR: 'Secteur touché',
              textEN: 'Affected sector',
              isList: true,
            },
            {
              id: sid(CODE, 10),
              textFR: 'Numéro d\'événement ou de panne (si disponible)',
              textEN: 'Event or outage number (if available)',
              isList: true,
            },
          ],
        },
        // ── Vérification technique ──────────────────────────
        {
          id: sid(CODE, 11),
          textFR: '**Vérification technique**',
          textEN: '**Technical verification**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 12),
          textFR: 'Demander au technicien en bâtiment de :',
          textEN: 'Ask the building technician to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 13),
              textFR: 'Confirmer visuellement le bon fonctionnement des deux génératrices',
              textEN: 'Visually confirm proper operation of both generators',
              isList: true,
            },
            {
              id: sid(CODE, 14),
              textFR: 'Vérifier voyants, régime moteur et systèmes de commutation',
              textEN: 'Check indicator lights, engine speed, and switching systems',
              isList: true,
            },
            {
              id: sid(CODE, 15),
              textFR: 'Vérifier les niveaux de diesel dans les réservoirs (norme CSA C282 : minimum 2 heures à pleine charge)',
              textEN: 'Check diesel levels in tanks (CSA C282 standard: minimum 2 hours at full load)',
              isList: true,
            },
          ],
        },
        // ── Ravitaillement en carburant ─────────────────────
        {
          id: sid(CODE, 16),
          textFR: '**Ravitaillement en carburant (préventif)**',
          textEN: '**Fuel resupply (preventive)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 17),
          textFR: 'Contacter la compagnie de ravitaillement en diesel',
          textEN: 'Contact the diesel fuel supplier',
          isBold: false,
        },
        {
          id: sid(CODE, 18),
          textFR: 'Informer de la panne en cours',
          textEN: 'Inform them of the ongoing outage',
          isBold: false,
        },
        {
          id: sid(CODE, 19),
          textFR: 'Demander mise en disponibilité ou livraison préventive si panne estimée à plus de 4–6 heures',
          textEN: 'Request standby or preventive delivery if outage is estimated at more than 4–6 hours',
          isBold: false,
        },
        // ── Communication aux gestionnaires ─────────────────
        {
          id: sid(CODE, 20),
          textFR: '**Communication aux gestionnaires (si nécessaire)**',
          textEN: '**Communication to managers (if necessary)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 21),
          textFR: 'Ne pas déclencher d\'alerte générale si aucune interruption perceptible pour les occupants',
          textEN: 'Do not trigger a general alert if there is no perceptible interruption for occupants',
          isBold: false,
        },
        {
          id: sid(CODE, 22),
          textFR: 'Informer les gestionnaires via Teams si requis :',
          textEN: 'Inform managers via Teams if required:',
          isBold: false,
        },
        {
          id: sid(CODE, 23),
          textFR: 'Panne confirmée – génératrices fonctionnelles. Aucun impact pour les opérations et occupants. Durée estimée selon HQ : X heures.',
          textEN: 'Outage confirmed – generators operational. No impact on operations or occupants. Estimated duration per HQ: X hours.',
          isBold: false,
          isRed: true,
        },
        // ── Vérification après rétablissement ───────────────
        {
          id: sid(CODE, 24),
          textFR: '**Vérification après rétablissement du courant**',
          textEN: '**Verification after power restoration**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 25),
          textFR: 'Vérifier le retour automatique vers le réseau principal',
          textEN: 'Verify automatic switchover back to the main grid',
          isBold: false,
        },
        {
          id: sid(CODE, 26),
          textFR: 'Confirmer le bon fonctionnement :',
          textEN: 'Confirm proper operation of:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 27),
              textFR: 'Panneau incendie',
              textEN: 'Fire alarm panel',
              isList: true,
            },
            {
              id: sid(CODE, 28),
              textFR: 'Systèmes de caméras de sécurité',
              textEN: 'Security camera systems',
              isList: true,
            },
            {
              id: sid(CODE, 29),
              textFR: 'Contrôle d\'accès',
              textEN: 'Access control',
              isList: true,
            },
            {
              id: sid(CODE, 30),
              textFR: 'Systèmes de communication internes',
              textEN: 'Internal communication systems',
              isList: true,
            },
          ],
        },
        // ── Réinitialisation des équipements critiques ──────
        {
          id: sid(CODE, 31),
          textFR: '**Réinitialisation des équipements critiques**',
          textEN: '**Critical equipment reset**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 32),
          textFR: 'Tester ascenseurs et monte-charges',
          textEN: 'Test elevators and freight lifts',
          isBold: false,
        },
        {
          id: sid(CODE, 33),
          textFR: 'Contacter un technicien si un système ne redémarre pas correctement',
          textEN: 'Contact a technician if a system does not restart properly',
          isBold: false,
        },
        // ── Communication de retour à la normale ────────────
        {
          id: sid(CODE, 34),
          textFR: '**Communication de retour à la normale**',
          textEN: '**Communication of return to normal**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 35),
          textFR: 'Envoyer message ou note aux gestionnaires / occupants si requis :',
          textEN: 'Send message or note to managers / occupants if required:',
          isBold: false,
        },
        {
          id: sid(CODE, 36),
          textFR: 'L\'alimentation principale est rétablie. Les systèmes ont été vérifiés. Aucune anomalie détectée. Merci pour votre collaboration.',
          textEN: 'Main power has been restored. Systems have been verified. No anomalies detected. Thank you for your cooperation.',
          isBold: false,
          isRed: true,
        },
        // ── Rapport d'incident ──────────────────────────────
        {
          id: sid(CODE, 37),
          textFR: '**Rapport d\'incident**',
          textEN: '**Incident report**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 38),
          textFR: 'Inclure :',
          textEN: 'Include:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 39),
              textFR: 'Heure de début et de fin de la panne',
              textEN: 'Outage start and end time',
              isList: true,
            },
            {
              id: sid(CODE, 40),
              textFR: 'Durée d\'utilisation des génératrices',
              textEN: 'Generator usage duration',
              isList: true,
            },
            {
              id: sid(CODE, 41),
              textFR: 'Vérifications effectuées',
              textEN: 'Verifications performed',
              isList: true,
            },
            {
              id: sid(CODE, 42),
              textFR: 'Communications internes et externes',
              textEN: 'Internal and external communications',
              isList: true,
            },
            {
              id: sid(CODE, 43),
              textFR: 'Situations problématiques rencontrées',
              textEN: 'Problematic situations encountered',
              isList: true,
            },
            {
              id: sid(CODE, 44),
              textFR: 'Points à améliorer',
              textEN: 'Areas for improvement',
              isList: true,
            },
          ],
        },
      ],
    },
  ],
};