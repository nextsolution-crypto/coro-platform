"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P119_URGENCE_MEDICALE_OCC = void 0;
const types_1 = require("./types");
const CODE = 'P119';
exports.P119_URGENCE_MEDICALE_OCC = {
    id: 'p119_urgence_medicale_occ', code: CODE,
    titleFR: 'URGENCE MÉDICALE — OCCUPANTS',
    titleEN: 'MEDICAL EMERGENCY — OCCUPANTS',
    icon: '🚑', headerColor: types_1.COLORS.blue,
    activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
    roleSections: [{
            roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
            headerColor: types_1.COLORS.blue,
            steps: [
                { id: (0, types_1.sid)(CODE, 1), textFR: 'Garder son calme — rester maître de la situation et rassurer les personnes présentes', textEN: 'Stay calm — remain in control of the situation and reassure persons present', isBold: false },
                { id: (0, types_1.sid)(CODE, 2), textFR: 'Évaluer rapidement la gravité de l\'incident : saignement abondant, inconscience, douleur thoracique, chute, crise ou détresse respiratoire', textEN: 'Quickly assess the severity of the incident: heavy bleeding, unconsciousness, chest pain, fall, seizure, or respiratory distress', isBold: false },
                { id: (0, types_1.sid)(CODE, 3), textFR: 'Alerter immédiatement un secouriste interne ou le responsable d\'urgence du site', textEN: 'Immediately alert an internal first aider or the site emergency supervisor', isBold: false },
                { id: (0, types_1.sid)(CODE, 4), textFR: 'Si la situation est critique (arrêt cardiaque, perte de conscience prolongée, hémorragie sévère), composer le 9-1-1 sans délai et fournir : adresse exacte du lieu, nature de l\'urgence (blessure, malaise, symptômes observés) et état général de la victime (âge approximatif, conscience, respiration, etc.)', textEN: 'If the situation is critical (cardiac arrest, prolonged loss of consciousness, severe hemorrhage), dial 9-1-1 without delay and provide: exact address, nature of emergency (injury, discomfort, observed symptoms) and general condition of the victim (approximate age, consciousness, breathing, etc.)', isBold: false, isRed: true },
                { id: (0, types_1.sid)(CODE, 5), textFR: 'Si formé, administrer les premiers soins essentiels — en cas d\'arrêt cardiorespiratoire, commencer la RCR immédiatement (compressions thoraciques et insufflations, si formé)', textEN: 'If trained, administer essential first aid — in case of cardiorespiratory arrest, immediately begin CPR (chest compressions and ventilations, if trained)', isBold: false },
                { id: (0, types_1.sid)(CODE, 6), textFR: 'Si la personne est inconsciente mais respire, la placer en position latérale de sécurité', textEN: 'If the person is unconscious but breathing, place them in the recovery position', isBold: false },
                { id: (0, types_1.sid)(CODE, 7), textFR: 'En cas de saignement, appliquer une pression directe sur la plaie avec un tissu propre', textEN: 'In case of bleeding, apply direct pressure to the wound with a clean cloth', isBold: false },
                { id: (0, types_1.sid)(CODE, 8), textFR: 'Si un défibrillateur externe automatisé (DEA) est disponible, l\'utiliser dès que possible en suivant les instructions vocales de l\'appareil', textEN: 'If an automated external defibrillator (AED) is available, use it as soon as possible following the device\'s voice instructions', isBold: false },
                { id: (0, types_1.sid)(CODE, 9), textFR: 'Faciliter l\'accès des secours : désigner une personne pour attendre les ambulanciers à l\'entrée principale et les guider jusqu\'à la victime', textEN: 'Facilitate emergency services access: designate a person to wait for paramedics at the main entrance and guide them to the victim', isBold: false },
                { id: (0, types_1.sid)(CODE, 10), textFR: 'Une fois la situation stabilisée, communiquer avec le contact d\'urgence de la victime en respectant les règles de confidentialité', textEN: 'Once the situation is stabilized, communicate with the victim\'s emergency contact respecting confidentiality rules', isBold: false },
                { id: (0, types_1.sid)(CODE, 11), textFR: 'Rédiger un rapport post-incident complet : noter la nature de l\'urgence, les gestes posés, les délais d\'intervention et toute observation utile — organiser ensuite une courte séance de débriefing', textEN: 'Write a complete post-incident report: note the nature of the emergency, actions taken, intervention times, and any useful observation — then organize a brief debriefing session', isBold: false },
                { id: (0, types_1.sid)(CODE, 12), textFR: '⚠️ En tout temps, la priorité absolue est la sécurité de la victime et des témoins — n\'intervenir que dans les limites de ses compétences et suivre les consignes du 9-1-1 ou des secouristes formés — ne jamais déplacer une victime à moins qu\'elle ne soit exposée à un danger immédiat (incendie, explosion, fuite chimique)', textEN: '⚠️ At all times, the absolute priority is the safety of the victim and witnesses — only intervene within the limits of your competence and follow 9-1-1 or trained first aider instructions — never move a victim unless they are exposed to immediate danger (fire, explosion, chemical leak)', isBold: false, isRed: true },
            ],
        }],
};
//# sourceMappingURL=p119_urgence_medicale_occ.js.map