// ============================================================
// CORO — P028 : Incendie service alimentaire
// Activé si : has_kitchen
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P028';

export const P028_INCENDIE_CUISINE: ProcedureTemplate = {
  id: 'p028_incendie_cuisine',
  code: CODE,
  titleFR: 'INCENDIE SERVICE ALIMENTAIRE',
  titleEN: 'FOOD SERVICE FIRE',
  icon: '🍳',
  headerColor: COLORS.red,
  activationRule: 'has_kitchen',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-RS',
      roleLabelFR: 'Personne qui constate le début d\'incendie',
      roleLabelEN: 'Person who discovers the fire',
      headerColor: COLORS.red,
      steps: [
        // ── Assurer la sécurité ─────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Assurer la sécurité**',
          textEN: '**Ensure safety**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Rester calme et évaluer l\'étendue du feu',
          textEN: 'Stay calm and assess the extent of the fire',
          isBold: false,
        },
        // ── Évacuer les personnes ───────────────────────────
        {
          id: sid(CODE, 3),
          textFR: '**Évacuer les personnes**',
          textEN: '**Evacuate persons**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 4),
          textFR: 'Faire sortir immédiatement toutes les personnes présentes dans l\'aire de cuisson et de préparation',
          textEN: 'Immediately evacuate all persons present in the cooking and preparation area',
          isBold: false,
        },
        // ── Action d'extinction ─────────────────────────────
        {
          id: sid(CODE, 5),
          textFR: '**Action d\'extinction**',
          textEN: '**Firefighting action**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Activer manuellement le système fixe (station manuelle système K dans l\'aire de cuisson)',
          textEN: 'Manually activate the fixed system (manual K system station in the cooking area)',
          isBold: false,
        },
        {
          id: sid(CODE, 7),
          textFR: 'En cas de défaillance du système fixe et si vous êtes à l\'aise : utiliser un extincteur de classe K pour la zone de cuisson (à moins de 9 mètres des équipements, norme ULC/ORD-C1254.6)',
          textEN: 'If the fixed system fails and you are comfortable doing so: use a Class K extinguisher for the cooking area (within 9 metres of equipment, standard ULC/ORD-C1254.6)',
          isBold: false,
        },
        {
          id: sid(CODE, 8),
          textFR: 'Fermer la valve sectorielle de gaz',
          textEN: 'Close the sectional gas valve',
          isBold: false,
        },
        // ── Alerter ────────────────────────────────────────
        {
          id: sid(CODE, 9),
          textFR: '**Alerter**',
          textEN: '**Alert**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 10),
          textFR: 'Contacter immédiatement le 9-1-1 et signaler un incendie dans le service alimentaire',
          textEN: 'Immediately contact 9-1-1 and report a fire in the food service area',
          isBold: false,
          isRed: true,
        },
        // ── Évacuer la zone à risque ────────────────────────
        {
          id: sid(CODE, 11),
          textFR: '**Évacuer la zone à risque**',
          textEN: '**Evacuate the risk area**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 12),
          textFR: 'Fermer portes et fenêtres du secteur alimentaire',
          textEN: 'Close doors and windows of the food service sector',
          isBold: false,
        },
        {
          id: sid(CODE, 13),
          textFR: 'Quitter le bâtiment et diriger les occupants vers la sortie de secours la plus proche',
          textEN: 'Exit the building and direct occupants to the nearest emergency exit',
          isBold: false,
        },
        // ── Note technique ──────────────────────────────────
        {
          id: sid(CODE, 14),
          textFR: '💡 N\'utiliser l\'extincteur que si vous êtes formé et que le feu est maîtrisable. Les systèmes d\'extinction automatiques doivent être inspectés deux fois par an par un entrepreneur qualifié (norme canadienne).',
          textEN: '💡 Only use the extinguisher if trained and the fire is controllable. Automatic suppression systems must be inspected twice a year by a qualified contractor (Canadian standard).',
          isBold: false,
          isRed: false,
        },
      ],
    },
  ],
};