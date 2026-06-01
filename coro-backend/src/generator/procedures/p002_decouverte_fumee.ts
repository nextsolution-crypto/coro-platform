// ============================================================
// CORO — P002 : Découverte de fumée ou de flamme
// Présent par défaut dans PMU et PSI
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P002';

export const P002_DECOUVERTE_FUMEE: ProcedureTemplate = {
  id: 'p002_decouverte_fumee',
  code: CODE,
  titleFR: 'DÉCOUVERTE DE FUMÉE OU DE FLAMME',
  titleEN: 'DISCOVERY OF SMOKE OR FLAME',
  icon: '🔥',
  headerColor: COLORS.red,
  incidentCode: 'CODE_ROUGE',
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'TOUS',
      roleLabelFR: 'Procédure générale — Tous les occupants',
      roleLabelEN: 'General procedure — All occupants',
      headerColor: COLORS.red,
      steps: [
        {
          id: sid(CODE, 1),
          textFR: '**Restez** calme – Concentrez-vous sur votre sécurité et celle des autres.',
          textEN: '**Stay** calm – Focus on your safety and the safety of others.',
          isBold: true,
        },
        {
          id: sid(CODE, 2),
          textFR: '**Déclenchez** l\'alarme incendie via la station manuelle la plus près.',
          textEN: '**Activate** the fire alarm at the nearest manual pull station.',
          isBold: true,
        },
        {
          id: sid(CODE, 3),
          textFR: '**Avertissez** immédiatement les occupants du secteur.',
          textEN: '**Alert** all occupants in the area immediately.',
          isBold: true,
        },
        {
          id: sid(CODE, 4),
          textFR: '**Tentez** d\'éteindre le début d\'incendie uniquement si :',
          textEN: '**Attempt** to extinguish the early-stage fire only if:',
          isBold: true,
          subSteps: [
            {
              id: sid(CODE, 5),
              textFR: 'Vous êtes formé à utiliser un extincteur ;',
              textEN: 'You are trained to use a fire extinguisher;',
              isList: true,
            },
            {
              id: sid(CODE, 6),
              textFR: 'Votre santé et votre sécurité ne sont pas compromise.',
              textEN: 'Your health and safety are not compromised.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 7),
          textFR: '**Évacuez** par la sortie la plus près (ne pas utiliser les ascenseurs).',
          textEN: '**Evacuate** via the nearest exit (do not use elevators).',
          isBold: true,
          isCommentable: true,
          subSteps: [
            {
              id: sid(CODE, 8),
              textFR: 'Fermez les portes derrière vous.',
              textEN: 'Close doors behind you.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 9),
          textFR: '**Rejoignez** le point de rassemblement à l\'extérieur, à distance sécuritaire du bâtiment.',
          textEN: '**Proceed** to the assembly point outside, at a safe distance from the building.',
          isBold: true,
        },
        {
          id: sid(CODE, 10),
          textFR: '**Composez** le 9-1-1 une fois en sécurité et donnez :',
          textEN: '**Call** 9-1-1 once you are safe and provide:',
          isBold: true,
          isRed: true,
          subSteps: [
            {
              id: sid(CODE, 11),
              textFR: 'L\'adresse complète du bâtiment : [ADRESSE COMPLÈTE DU SITE] ;',
              textEN: 'The complete building address: [COMPLETE SITE ADDRESS];',
              isList: true,
            },
            {
              id: sid(CODE, 12),
              textFR: 'Les détails de l\'incident.',
              textEN: 'The details of the incident.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 13),
          textFR: '**Ne réintégrez pas** le bâtiment sans l\'autorisation des services d\'urgence.',
          textEN: '**Do not re-enter** the building without authorization from emergency services.',
          isBold: true,
          isRed: true,
        },
      ],
    },
  ],
};