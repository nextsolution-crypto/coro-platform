"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P115_FUITE_AMMONIAC_OCC = void 0;
const types_1 = require("./types");
const CODE = 'P115';
exports.P115_FUITE_AMMONIAC_OCC = {
    id: 'p115_fuite_ammoniac_occ', code: CODE,
    titleFR: 'FUITE D\'AMMONIAC — OCCUPANTS',
    titleEN: 'AMMONIA LEAK — OCCUPANTS',
    icon: '☣️', headerColor: types_1.COLORS.purple,
    activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
    roleSections: [{
            roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
            headerColor: types_1.COLORS.purple,
            steps: [
                { id: (0, types_1.sid)(CODE, 1), textFR: 'Cesser immédiatement toute activité dès que l\'alarme signale une fuite d\'ammoniac', textEN: 'Immediately stop all activity when the alarm signals an ammonia leak', isBold: false },
                { id: (0, types_1.sid)(CODE, 2), textFR: 'Évacuer rapidement les lieux par la sortie la plus proche sans tenter de localiser ou de contenir la fuite', textEN: 'Quickly evacuate the premises through the nearest exit without attempting to locate or contain the leak', isBold: false, isRed: true },
                { id: (0, types_1.sid)(CODE, 3), textFR: 'Ne pas prendre ses effets personnels et se diriger vers l\'extérieur calmement', textEN: 'Do not take personal belongings and calmly proceed outside', isBold: false },
                { id: (0, types_1.sid)(CODE, 4), textFR: 'À l\'extérieur, repérer la direction du vent à l\'aide des manches à air, de la fumée ou des odeurs perceptibles — se diriger dans la direction opposée au vent', textEN: 'Outside, identify wind direction using wind socks, smoke, or perceptible odors — proceed in the direction opposite to the wind', isBold: false, isRed: true },
                { id: (0, types_1.sid)(CODE, 5), textFR: 'Éviter de rester près du bâtiment ou dans toute zone potentiellement exposée au nuage d\'ammoniac', textEN: 'Avoid staying near the building or in any area potentially exposed to the ammonia cloud', isBold: false },
                { id: (0, types_1.sid)(CODE, 6), textFR: 'Rester calme et attendre les consignes de l\'équipe d\'urgence', textEN: 'Stay calm and await emergency team instructions', isBold: false },
                { id: (0, types_1.sid)(CODE, 7), textFR: 'Ne pas retourner dans le bâtiment sans autorisation des services d\'incendie ou du chef du poste de contrôle', textEN: 'Do not return to the building without authorization from fire services or the control post supervisor', isBold: false, isRed: true },
                { id: (0, types_1.sid)(CODE, 8), textFR: 'Signaler immédiatement tout malaise ou difficulté respiratoire à un responsable', textEN: 'Immediately report any discomfort or breathing difficulty to a supervisor', isBold: false },
                { id: (0, types_1.sid)(CODE, 9), textFR: 'Contacter les services d\'urgence (9-1-1) dès que possible et fournir : l\'adresse complète du site, la nature de l\'incident (fuite d\'ammoniac), le nombre de personnes évacuées, tout symptôme observé', textEN: 'Contact emergency services (9-1-1) as soon as possible and provide: complete site address, nature of incident (ammonia leak), number of evacuated persons, any observed symptoms', isBold: false },
                { id: (0, types_1.sid)(CODE, 10), textFR: 'Ne pas fumer et ne pas utiliser d\'appareils électriques ou radio à proximité de la zone affectée — ces équipements peuvent générer des étincelles dangereuses et aggraver la situation', textEN: 'Do not smoke and do not use electrical or radio devices near the affected area — these devices can generate dangerous sparks and worsen the situation', isBold: false, isRed: true },
                { id: (0, types_1.sid)(CODE, 11), textFR: 'Une fois la situation maîtrisée, attendre l\'autorisation des autorités avant de réintégrer le bâtiment — participer au bilan post-incident pour améliorer les mesures préventives futures', textEN: 'Once the situation is under control, wait for authority authorization before re-entering the building — participate in the post-incident debrief to improve future preventive measures', isBold: false },
                { id: (0, types_1.sid)(CODE, 12), textFR: '⚠️ L\'ammoniac est un gaz toxique et corrosif dont l\'odeur piquante peut être détectée dès 0,043 ppm — même à faible concentration, il peut provoquer des irritations des voies respiratoires et des yeux — l\'utilisation de téléphones cellulaires, d\'appareils radio ou de tout matériel électrique est strictement interdite à proximité du nuage', textEN: '⚠️ Ammonia is a toxic and corrosive gas whose pungent odor can be detected at 0.043 ppm — even at low concentration, it can cause respiratory and eye irritation — use of cell phones, radio devices, or any electrical equipment is strictly prohibited near the cloud', isBold: false, isRed: true },
            ],
        }],
};
//# sourceMappingURL=p115_fuite_ammoniac_occ.js.map