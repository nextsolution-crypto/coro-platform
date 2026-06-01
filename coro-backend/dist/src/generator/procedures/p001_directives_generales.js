"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P001_DIRECTIVES_GENERALES = void 0;
const types_1 = require("./types");
const CODE = 'P001';
exports.P001_DIRECTIVES_GENERALES = {
    id: 'p001_directives_generales',
    code: CODE,
    titleFR: 'DIRECTIVES GÉNÉRALES LORS D\'UNE URGENCE',
    titleEN: 'GENERAL DIRECTIVES DURING AN EMERGENCY',
    headerColor: types_1.COLORS.dark,
    activationRule: 'always',
    documentTypes: ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'],
    directivesGenerales: [
        {
            id: (0, types_1.sid)(CODE, 1),
            textFR: 'Garder son calme en toute circonstance ;',
            textEN: 'Remain calm in all circumstances;',
            isList: true,
        },
        {
            id: (0, types_1.sid)(CODE, 2),
            textFR: 'Chaque action demandée par le coordonnateur d\'urgence doit faire l\'objet d\'un retour de cette même communication ;',
            textEN: 'Every action requested by the emergency coordinator must be confirmed back through the same communication channel;',
            isList: true,
        },
        {
            id: (0, types_1.sid)(CODE, 3),
            textFR: 'Il est important d\'évacuer les lieux si votre santé ou votre sécurité est compromise ;',
            textEN: 'It is important to evacuate the premises if your health or safety is compromised;',
            isList: true,
        },
        {
            id: (0, types_1.sid)(CODE, 4),
            textFR: 'Chaque événement majeur dépassant l\'utilisation des ressources doit faire l\'objet d\'une communication avec l\'agent de liaison corporative.',
            textEN: 'Every major event exceeding available resources must be communicated to the corporate liaison officer.',
            isList: true,
            isBold: true,
        },
    ],
    roleSections: [],
};
//# sourceMappingURL=p001_directives_generales.js.map