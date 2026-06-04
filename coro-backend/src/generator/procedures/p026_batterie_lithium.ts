// ============================================================
// CORO — P026 : Feu de batterie au lithium
// Toujours présent dans PMU et PSI
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P026';

export const P026_BATTERIE_LITHIUM: ProcedureTemplate = {
  id: 'p026_batterie_lithium',
  code: CODE,
  titleFR: 'FEU DE BATTERIE AU LITHIUM',
  titleEN: 'LITHIUM BATTERY FIRE',
  icon: '🔥',
  headerColor: COLORS.garnet,
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.garnet,
      steps: [
        // ── Contexte ────────────────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Contexte**',
          textEN: '**Context**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Applicable à tout appareil équipé d\'une batterie lithium-ion : vélo électrique, trottinette, outil électrique, ordinateur portable, tablette, téléphone, appareil ménager, etc.',
          textEN: 'Applicable to any device equipped with a lithium-ion battery: electric bike, scooter, power tool, laptop, tablet, phone, home appliance, etc.',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'L\'emballement thermique peut se déclencher en quelques secondes, même sans flamme visible, et produit des fumées toxiques difficiles à maîtriser',
          textEN: 'Thermal runaway can trigger in seconds, even without visible flames, and produces toxic fumes that are difficult to control',
          isBold: false,
          isRed: true,
        },
        // ── Signes précurseurs ──────────────────────────────
        {
          id: sid(CODE, 4),
          textFR: '**Signes précurseurs — Appeler le 9-1-1 immédiatement**',
          textEN: '**Warning signs — Call 9-1-1 immediately**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 5),
          textFR: 'Intervenir dès l\'apparition de l\'un de ces signes, sans attendre les flammes :',
          textEN: 'Act upon any of these signs, without waiting for flames:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 6),
              textFR: 'Odeur chimique ou de brûlé',
              textEN: 'Chemical or burning smell',
              isList: true,
            },
            {
              id: sid(CODE, 7),
              textFR: 'Gonflement, déformation ou fuite de l\'appareil ou de la batterie',
              textEN: 'Swelling, deformation, or leakage of the device or battery',
              isList: true,
            },
            {
              id: sid(CODE, 8),
              textFR: 'Fumée blanche ou grise, même minime',
              textEN: 'White or grey smoke, even minimal',
              isList: true,
            },
            {
              id: sid(CODE, 9),
              textFR: 'Bruits inhabituels (crépitements, sifflement)',
              textEN: 'Unusual sounds (crackling, hissing)',
              isList: true,
            },
            {
              id: sid(CODE, 10),
              textFR: 'Chaleur excessive autour de l\'appareil',
              textEN: 'Excessive heat around the device',
              isList: true,
            },
          ],
        },
        // ── S'éloigner immédiatement ────────────────────────
        {
          id: sid(CODE, 11),
          textFR: '**S\'éloigner immédiatement**',
          textEN: '**Move away immediately**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 12),
          textFR: 'Garder une distance sécuritaire pour éviter les brûlures et l\'inhalation de fumées toxiques',
          textEN: 'Keep a safe distance to avoid burns and inhalation of toxic fumes',
          isBold: false,
        },
        {
          id: sid(CODE, 13),
          textFR: 'Si en espace clos (ex. : garage à vélo) : évacuer les occupants et fermer la porte derrière vous',
          textEN: 'If in an enclosed space (e.g., bike room): evacuate occupants and close the door behind you',
          isBold: false,
        },
        {
          id: sid(CODE, 14),
          textFR: 'Évacuer immédiatement le secteur — un feu de batterie au lithium (véhicule ou vélo électrique) peut provoquer une violente explosion',
          textEN: 'Immediately evacuate the area — a lithium battery fire (vehicle or electric bike) can cause a violent explosion',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 15),
          textFR: 'Si la recharge se faisait dans un couloir ou une entrée : **priorité absolue à dégager les voies d\'évacuation**',
          textEN: 'If charging was occurring in a corridor or entrance: **absolute priority to clear evacuation routes**',
          isBold: true,
          isRed: true,
        },
        // ── Donner l'alerte ─────────────────────────────────
        {
          id: sid(CODE, 16),
          textFR: '**Donner l\'alerte**',
          textEN: '**Raise the alarm**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 17),
          textFR: 'Déclencher la station manuelle la plus proche',
          textEN: 'Activate the nearest manual pull station',
          isBold: false,
        },
        {
          id: sid(CODE, 18),
          textFR: 'En lieu sûr, composer immédiatement le 9-1-1 et signaler un feu de batterie au lithium en précisant l\'emplacement et les détails pertinents (type d\'appareil, intensité du feu)',
          textEN: 'From a safe location, immediately dial 9-1-1 and report a lithium battery fire specifying the location and relevant details (device type, fire intensity)',
          isBold: false,
        },
        // ── Gestion de l'incident ───────────────────────────
        {
          id: sid(CODE, 19),
          textFR: '**Gestion de l\'incident**',
          textEN: '**Incident management**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 20),
          textFR: 'Se reporter à la procédure « En cas d\'incendie » pour la coordination de l\'évacuation',
          textEN: 'Refer to the "In case of fire" procedure for evacuation coordination',
          isBold: false,
        },
        {
          id: sid(CODE, 21),
          textFR: 'Ne pas intervenir soi-même — laisser l\'extinction au service d\'incendie',
          textEN: 'Do not intervene yourself — leave firefighting to the fire department',
          isBold: false,
          isRed: true,
        },
        // ── Précaution sanitaire ────────────────────────────
        {
          id: sid(CODE, 22),
          textFR: '**Précaution sanitaire**',
          textEN: '**Health precautions**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 23),
          textFR: 'Éviter toute inhalation de fumée',
          textEN: 'Avoid any smoke inhalation',
          isBold: false,
        },
        {
          id: sid(CODE, 24),
          textFR: 'En cas de symptômes (irritation, toux, essoufflement), consulter immédiatement un professionnel de santé',
          textEN: 'In case of symptoms (irritation, cough, shortness of breath), immediately consult a health professional',
          isBold: false,
        },
        // ── Note technique ──────────────────────────────────
        {
          id: sid(CODE, 25),
          textFR: '💡 Évitez de respirer les fumées qui sont extrêmement toxiques. Si des symptômes d\'inhalation surviennent, signalez-le aux pompiers ou aux secours. Le SIM a rapporté une hausse de 195% des incendies lithium-ion à Montréal depuis 2022.',
          textEN: '💡 Avoid breathing the fumes which are extremely toxic. If inhalation symptoms occur, report them to firefighters or emergency services. The SIM reported a 195% increase in lithium-ion fires in Montreal since 2022.',
          isBold: false,
          isRed: false,
        },
      ],
    },
  ],
};