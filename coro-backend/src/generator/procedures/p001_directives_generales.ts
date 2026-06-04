// ============================================================
// CORO — P001 : Directives générales lors d'une urgence
// Toujours présent dans tous les documents
// ============================================================

import { ProcedureTemplate, ProcedureStep, COLORS, sid } from './types';

const CODE = 'P001';

export const P001_DIRECTIVES_GENERALES: ProcedureTemplate = {
  id: 'p001_directives_generales',
  code: CODE,
  titleFR: 'DIRECTIVES GÉNÉRALES LORS D\'UNE URGENCE',
  titleEN: 'GENERAL DIRECTIVES DURING AN EMERGENCY',
  headerColor: COLORS.slate,
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'],
  directivesGenerales: [
    {
      id: sid(CODE, 1),
      textFR: 'Garder son calme en toute circonstance ;',
      textEN: 'Remain calm in all circumstances;',
      isList: true,
    },
    {
      id: sid(CODE, 2),
      textFR: 'Chaque action demandée par le coordonnateur d\'urgence doit faire l\'objet d\'un retour de cette même communication ;',
      textEN: 'Every action requested by the emergency coordinator must be confirmed back through the same communication channel;',
      isList: true,
    },
    {
      id: sid(CODE, 3),
      textFR: 'Il est important d\'évacuer les lieux si votre santé ou votre sécurité est compromise ;',
      textEN: 'It is important to evacuate the premises if your health or safety is compromised;',
      isList: true,
    },
    {
      id: sid(CODE, 4),
      textFR: 'Chaque événement majeur dépassant l\'utilisation des ressources doit faire l\'objet d\'une communication avec l\'agent de liaison corporative.',
      textEN: 'Every major event exceeding available resources must be communicated to the corporate liaison officer.',
      isList: true,
      isBold: true,
    },
  ],
  roleSections: [],
};