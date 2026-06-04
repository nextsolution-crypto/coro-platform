"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P027_NOYADE = void 0;
const types_1 = require("./types");
const CODE = 'P027';
exports.P027_NOYADE = {
    id: 'p027_noyade',
    code: CODE,
    titleFR: 'NOYADE — ÉTABLISSEMENT SANS SAUVETEUR',
    titleEN: 'DROWNING — FACILITY WITHOUT LIFEGUARD',
    icon: '🏊',
    headerColor: types_1.COLORS.blue,
    activationRule: 'has_pool',
    documentTypes: ['PMU', 'PSI'],
    roleSections: [
        {
            roleCode: 'ROLE-CU',
            roleLabelFR: 'Personne qui constate l\'incident',
            roleLabelEN: 'Person who discovers the incident',
            headerColor: types_1.COLORS.blue,
            steps: [
                {
                    id: (0, types_1.sid)(CODE, 1),
                    textFR: '**Réagir immédiatement**',
                    textEN: '**React immediately**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 2),
                    textFR: 'Se rendre sur place dès le signalement pour évaluer la situation',
                    textEN: 'Proceed to the scene immediately upon report to assess the situation',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 3),
                    textFR: 'Utiliser bouée, perche ou autre équipement pour extraire la victime — pas d\'intervention à la nage sans formation',
                    textEN: 'Use a buoy, pole, or other equipment to extract the victim — no swimming intervention without training',
                    isBold: false,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 4),
                    textFR: 'Faire évacuer la piscine et désigner une personne pour garder l\'accès libre aux secours',
                    textEN: 'Evacuate the pool and designate a person to keep access clear for emergency services',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 5),
                    textFR: '**Alerter les services d\'urgence**',
                    textEN: '**Alert emergency services**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 6),
                    textFR: 'Composer le 9-1-1 et préciser :',
                    textEN: 'Dial 9-1-1 and specify:',
                    isBold: false,
                    subSteps: [
                        {
                            id: (0, types_1.sid)(CODE, 7),
                            textFR: 'État de la victime (consciente/inconsciente, respire ou non)',
                            textEN: 'Victim\'s condition (conscious/unconscious, breathing or not)',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 8),
                            textFR: 'Adresse complète du bâtiment',
                            textEN: 'Complete building address',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 9),
                            textFR: 'Détails pertinents (âge estimé, durée dans l\'eau si connue)',
                            textEN: 'Relevant details (estimated age, time in water if known)',
                            isList: true,
                        },
                    ],
                },
                {
                    id: (0, types_1.sid)(CODE, 10),
                    textFR: 'Rester en ligne et suivre les instructions du répartiteur',
                    textEN: 'Stay on the line and follow the dispatcher\'s instructions',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 11),
                    textFR: '**Premiers secours (si victime hors de l\'eau)**',
                    textEN: '**First aid (if victim is out of the water)**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 12),
                    textFR: 'Évaluer la respiration et le pouls',
                    textEN: 'Assess breathing and pulse',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 13),
                    textFR: 'Débuter la RCR si nécessaire et si formé',
                    textEN: 'Begin CPR if necessary and if trained',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 14),
                    textFR: 'Utiliser le DEA (situé entre le gym et la piscine) — suivre les instructions vocales, éloigner la victime de toute eau',
                    textEN: 'Use the AED (located between the gym and pool) — follow voice instructions, keep victim away from any water',
                    isBold: false,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 15),
                    textFR: '**Accueillir les secours**',
                    textEN: '**Welcome emergency services**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 16),
                    textFR: 'Ouvrir les accès et guider les services d\'urgence',
                    textEN: 'Open access points and guide emergency services',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 17),
                    textFR: 'Fournir l\'heure de l\'incident, les actions entreprises et l\'état de la victime',
                    textEN: 'Provide the time of the incident, actions taken, and victim\'s condition',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 18),
                    textFR: '**Suivi après l\'incident**',
                    textEN: '**Post-incident follow-up**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 19),
                    textFR: 'Compléter un rapport (heure d\'appel, actions, état, témoins)',
                    textEN: 'Complete a report (call time, actions, condition, witnesses)',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 20),
                    textFR: 'Informer les occupants des mesures prises et rappeler les règles de sécurité aquatique',
                    textEN: 'Inform occupants of measures taken and remind them of aquatic safety rules',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 21),
                    textFR: 'Vérifier et remettre à niveau tout l\'équipement de sécurité (bouées, perches, DEA)',
                    textEN: 'Inspect and replenish all safety equipment (buoys, poles, AED)',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 22),
                    textFR: '**Révision et amélioration**',
                    textEN: '**Review and improvement**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 23),
                    textFR: 'Mener une enquête interne sur les causes et facteurs contributifs',
                    textEN: 'Conduct an internal investigation into causes and contributing factors',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 24),
                    textFR: 'Former le personnel et résidents aux premiers soins et à la RCR',
                    textEN: 'Train staff and residents in first aid and CPR',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 25),
                    textFR: 'Diffuser régulièrement les règles de sécurité en piscine',
                    textEN: 'Regularly communicate pool safety rules',
                    isBold: false,
                },
            ],
        },
    ],
};
//# sourceMappingURL=p027_noyade.js.map