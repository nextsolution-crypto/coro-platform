// ============================================================
// CORO — P018 : Déversement de matières dangereuses
// Activé si : has_hazmat
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P018';

export const P018_MATIERES_DANGEREUSES: ProcedureTemplate = {
  id: 'p018_matieres_dangereuses',
  code: CODE,
  titleFR: 'DÉVERSEMENT DE MATIÈRES DANGEREUSES',
  titleEN: 'HAZARDOUS MATERIALS SPILL',
  icon: '☣️',
  headerColor: COLORS.brown,
  activationRule: 'has_hazmat',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.brown,
      steps: [
        // ── Zone de déversement ─────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Zone de déversement**',
          textEN: '**Spill area**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Éloigner immédiatement toute personne de la zone affectée',
          textEN: 'Immediately move all persons away from the affected area',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Aviser le surintendant pour sécuriser le secteur',
          textEN: 'Notify the superintendent to secure the sector',
          isBold: false,
        },
        // ── Communication de l'incident ─────────────────────
        {
          id: sid(CODE, 4),
          textFR: '**Communication de l\'incident**',
          textEN: '**Incident communication**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 5),
          textFR: 'Informer immédiatement le coordonnateur des mesures d\'urgence',
          textEN: 'Immediately inform the emergency measures coordinator',
          isBold: false,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Transmettre, si connue, l\'identité du produit déversé',
          textEN: 'Transmit the identity of the spilled product if known',
          isBold: false,
        },
        // ── Consultation de la FDS ──────────────────────────
        {
          id: sid(CODE, 7),
          textFR: '**Consultation de la Fiche de données de sécurité (FDS)**',
          textEN: '**Consulting the Safety Data Sheet (SDS)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 8),
          textFR: 'Consulter la FDS (section 6 — Mesures à prendre en cas de déversement) pour identifier :',
          textEN: 'Consult the SDS (section 6 — Accidental release measures) to identify:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 9),
              textFR: 'Les risques pour la santé et la sécurité',
              textEN: 'Health and safety risks',
              isList: true,
            },
            {
              id: sid(CODE, 10),
              textFR: 'Les mesures de protection nécessaires',
              textEN: 'Required protective measures',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 11),
          textFR: 'Porter l\'EPI recommandé dans la FDS (gants, masque, combinaison, etc.) — toutes les FDS doivent être conformes au Règlement sur les produits dangereux (SIMDUT 2015, mis à jour décembre 2025)',
          textEN: 'Wear the PPE recommended in the SDS (gloves, mask, suit, etc.) — all SDS must comply with the Hazardous Products Regulations (WHMIS 2015, updated December 2025)',
          isBold: false,
        },
        // ── Évaluation de la quantité ───────────────────────
        {
          id: sid(CODE, 12),
          textFR: '**Évaluation de la quantité**',
          textEN: '**Quantity assessment**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 13),
          textFR: 'Si moins de 10 litres et sans danger immédiat : nettoyer avec la trousse de déversement',
          textEN: 'If less than 10 litres and no immediate danger: clean up with the spill kit',
          isBold: false,
        },
        {
          id: sid(CODE, 14),
          textFR: 'Si 10 litres ou plus, ou danger pour la santé :',
          textEN: 'If 10 litres or more, or health hazard:',
          isBold: false,
          isRed: true,
          subSteps: [
            {
              id: sid(CODE, 15),
              textFR: 'Faire évacuer le secteur',
              textEN: 'Evacuate the sector',
              isList: true,
            },
            {
              id: sid(CODE, 16),
              textFR: 'Composer le 9-1-1',
              textEN: 'Dial 9-1-1',
              isList: true,
            },
          ],
        },
        // ── Alerte aux services d'urgence ───────────────────
        {
          id: sid(CODE, 17),
          textFR: '**Alerte aux services d\'urgence**',
          textEN: '**Emergency services alert**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 18),
          textFR: 'Appeler le 9-1-1 en cas de danger immédiat',
          textEN: 'Call 9-1-1 in case of immediate danger',
          isBold: false,
        },
        {
          id: sid(CODE, 19),
          textFR: 'Préparer la fiche SIMDUT/FDS pour remise aux intervenants à leur arrivée',
          textEN: 'Prepare the WHMIS/SDS sheet to hand over to responders upon their arrival',
          isBold: false,
        },
        // ── Coordination avec les équipes sur place ─────────
        {
          id: sid(CODE, 20),
          textFR: '**Coordination avec les équipes sur place**',
          textEN: '**Coordination with on-site teams**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 21),
          textFR: 'Aviser la maintenance et la sécurité pour évaluation',
          textEN: 'Notify maintenance and security for assessment',
          isBold: false,
        },
        {
          id: sid(CODE, 22),
          textFR: 'Préparer les intervenants équipés d\'EPI appropriés si l\'intervention est sécuritaire',
          textEN: 'Prepare responders equipped with appropriate PPE if intervention is safe',
          isBold: false,
        },
        // ── Communication interne et externe ────────────────
        {
          id: sid(CODE, 23),
          textFR: '**Communication interne et externe**',
          textEN: '**Internal and external communication**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 24),
          textFR: 'Informer locataires/occupants via intercom, courriel ou SMS des mesures à suivre',
          textEN: 'Inform tenants/occupants via intercom, email, or SMS of measures to follow',
          isBold: false,
        },
        {
          id: sid(CODE, 25),
          textFR: 'Servir de point de contact pour les services d\'urgence et fournir :',
          textEN: 'Serve as point of contact for emergency services and provide:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 26),
              textFR: 'Localisation précise',
              textEN: 'Precise location',
              isList: true,
            },
            {
              id: sid(CODE, 27),
              textFR: 'Produit impliqué',
              textEN: 'Product involved',
              isList: true,
            },
            {
              id: sid(CODE, 28),
              textFR: 'Quantité estimée',
              textEN: 'Estimated quantity',
              isList: true,
            },
          ],
        },
        // ── Gestion post-intervention ───────────────────────
        {
          id: sid(CODE, 29),
          textFR: '**Gestion post-intervention**',
          textEN: '**Post-intervention management**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Confirmer avec les services d\'urgence et experts que la zone est sécurisée avant réintégration',
          textEN: 'Confirm with emergency services and experts that the area is secured before re-entry',
          isBold: false,
        },
        {
          id: sid(CODE, 31),
          textFR: 'Organiser un bilan post-incident pour :',
          textEN: 'Organize a post-incident review to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 32),
              textFR: 'Évaluer la réponse',
              textEN: 'Evaluate the response',
              isList: true,
            },
            {
              id: sid(CODE, 33),
              textFR: 'Identifier les points à améliorer',
              textEN: 'Identify areas for improvement',
              isList: true,
            },
            {
              id: sid(CODE, 34),
              textFR: 'Déterminer les besoins en formation ou ajustements',
              textEN: 'Determine training needs or adjustments',
              isList: true,
            },
          ],
        },
        // ── Note ────────────────────────────────────────────
        {
          id: sid(CODE, 35),
          textFR: '💡 Connaître l\'emplacement et l\'usage des EPI. Ne jamais intervenir sans formation adéquate — s\'éloigner et attendre les professionnels si nécessaire.',
          textEN: '💡 Know the location and use of PPE. Never intervene without adequate training — move away and wait for professionals if necessary.',
          isBold: false,
          isRed: false,
        },
        {
          id: sid(CODE, 36),
          textFR: '💡 En cas de déversement mineur, une trousse de déversement est disponible dans le bâtiment (voir plan d\'opération).',
          textEN: '💡 In case of a minor spill, a spill kit is available in the building (see operations plan).',
          isBold: false,
          isRed: false,
        },
      ],
    },
  ],
};