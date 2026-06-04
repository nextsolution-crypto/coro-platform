"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P017_BRIS_GICLEURS = void 0;
const types_1 = require("./types");
const CODE = 'P017';
exports.P017_BRIS_GICLEURS = {
    id: 'p017_bris_gicleurs',
    code: CODE,
    titleFR: 'BRIS DE GICLEURS',
    titleEN: 'SPRINKLER SYSTEM FAILURE',
    icon: '💧',
    headerColor: types_1.COLORS.turquoise,
    activationRule: 'has_sprinklers',
    documentTypes: ['PMU', 'PSI'],
    roleSections: [
        {
            roleCode: 'ROLE-CU',
            roleLabelFR: 'Coordonnateur d\'urgence',
            roleLabelEN: 'Emergency Coordinator',
            headerColor: types_1.COLORS.turquoise,
            steps: [
                {
                    id: (0, types_1.sid)(CODE, 1),
                    textFR: '**Évaluation initiale**',
                    textEN: '**Initial assessment**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 2),
                    textFR: 'Recevoir l\'alerte (témoin ou débit détecté au panneau incendie)',
                    textEN: 'Receive the alert (witness or flow detected at the fire panel)',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 3),
                    textFR: 'Identifier la zone impactée',
                    textEN: 'Identify the affected area',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 4),
                    textFR: 'Envoyer un agent pour confirmer :',
                    textEN: 'Send an agent to confirm:',
                    isBold: false,
                    subSteps: [
                        {
                            id: (0, types_1.sid)(CODE, 5),
                            textFR: 'L\'étendue des dégâts',
                            textEN: 'The extent of the damage',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 6),
                            textFR: 'L\'absence d\'incendie',
                            textEN: 'The absence of fire',
                            isList: true,
                        },
                    ],
                },
                {
                    id: (0, types_1.sid)(CODE, 7),
                    textFR: 'Rappeler que le débit active une alarme incendie — éviter la panique',
                    textEN: 'Remind that flow activates a fire alarm — avoid panic',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 8),
                    textFR: '**Mise en sécurité de la zone**',
                    textEN: '**Securing the area**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 9),
                    textFR: 'Ordonner l\'évacuation :',
                    textEN: 'Order evacuation of:',
                    isBold: false,
                    subSteps: [
                        {
                            id: (0, types_1.sid)(CODE, 10),
                            textFR: 'Zone touchée',
                            textEN: 'Affected area',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 11),
                            textFR: 'Étage en dessous',
                            textEN: 'Floor below',
                            isList: true,
                        },
                    ],
                },
                {
                    id: (0, types_1.sid)(CODE, 12),
                    textFR: 'Demander l\'extinction de tout appareil électrique à proximité',
                    textEN: 'Request shutdown of all nearby electrical equipment',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 13),
                    textFR: 'Faire installer des bâches pour protéger les équipements sensibles non déplaçables',
                    textEN: 'Have tarps installed to protect sensitive equipment that cannot be moved',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 14),
                    textFR: '**Alerte aux services d\'urgence**',
                    textEN: '**Emergency services alert**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 15),
                    textFR: 'Contacter le 9-1-1 :',
                    textEN: 'Contact 9-1-1:',
                    isBold: false,
                    subSteps: [
                        {
                            id: (0, types_1.sid)(CODE, 16),
                            textFR: 'Signaler le bris de gicleur',
                            textEN: 'Report the sprinkler failure',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 17),
                            textFR: 'Indiquer la zone touchée',
                            textEN: 'Indicate the affected area',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 18),
                            textFR: 'Mentionner tout risque de court-circuit ou d\'inondation',
                            textEN: 'Mention any risk of short-circuit or flooding',
                            isList: true,
                        },
                    ],
                },
                {
                    id: (0, types_1.sid)(CODE, 19),
                    textFR: 'Aviser rapidement le gestionnaire d\'immeuble',
                    textEN: 'Quickly notify the building manager',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 20),
                    textFR: '**Coupure d\'eau**',
                    textEN: '**Water shutoff**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 21),
                    textFR: 'Demander à la sécurité ou à la maintenance de fermer la valve sectorielle des gicleurs',
                    textEN: 'Ask security or maintenance to close the sectional sprinkler valve',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 22),
                    textFR: 'En cas de difficulté à identifier la valve : solliciter immédiatement l\'équipe technique ou le responsable des installations',
                    textEN: 'If difficulty identifying the valve: immediately contact the technical team or facilities manager',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 23),
                    textFR: '⚠️ **Responsabilité lors de la coupure sectorielle**',
                    textEN: '⚠️ **Responsibility during sectional shutoff**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 24),
                    textFR: 'La personne qui effectue la coupure de la valve sectorielle est imputable de tout ce qui se produit dans la zone ainsi isolée',
                    textEN: 'The person who closes the sectional valve is accountable for everything that occurs in the isolated area',
                    isBold: false,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 25),
                    textFR: 'Avant de fermer une valve, cette personne doit :',
                    textEN: 'Before closing a valve, this person must:',
                    isBold: false,
                    subSteps: [
                        {
                            id: (0, types_1.sid)(CODE, 26),
                            textFR: 'S\'assurer que l\'absence de feu a bien été confirmée par inspection visuelle et par le panneau incendie',
                            textEN: 'Ensure that the absence of fire has been confirmed by visual inspection and the fire panel',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 27),
                            textFR: 'Informer le coordonnateur d\'urgence et obtenir son approbation verbale',
                            textEN: 'Inform the emergency coordinator and obtain their verbal approval',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 28),
                            textFR: 'Consigner l\'heure et la zone concernée dans le registre d\'événement',
                            textEN: 'Record the time and affected area in the event log',
                            isList: true,
                        },
                    ],
                },
                {
                    id: (0, types_1.sid)(CODE, 29),
                    textFR: 'La reprise de l\'alimentation en eau doit se faire uniquement après validation par la compagnie de gicleurs ou le service incendie',
                    textEN: 'Water supply restoration must only occur after validation by the sprinkler company or fire department',
                    isBold: false,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 30),
                    textFR: '**Coordination avec entreprises spécialisées**',
                    textEN: '**Coordination with specialized companies**',
                    isBold: true,
                    isRed: true,
                },
                {
                    id: (0, types_1.sid)(CODE, 31),
                    textFR: 'Aviser la compagnie de gicleurs pour réparation rapide et vérification du reste du système',
                    textEN: 'Notify the sprinkler company for quick repair and verification of the rest of the system',
                    isBold: false,
                },
                {
                    id: (0, types_1.sid)(CODE, 32),
                    textFR: 'Contacter une firme après-sinistre pour :',
                    textEN: 'Contact a disaster recovery firm to:',
                    isBold: false,
                    subSteps: [
                        {
                            id: (0, types_1.sid)(CODE, 33),
                            textFR: 'Gérer les dégâts d\'eau',
                            textEN: 'Manage water damage',
                            isList: true,
                        },
                        {
                            id: (0, types_1.sid)(CODE, 34),
                            textFR: 'Procéder à la déshumidification et au nettoyage — agir rapidement pour prévenir les moisissures',
                            textEN: 'Proceed with dehumidification and cleanup — act quickly to prevent mold growth',
                            isList: true,
                        },
                    ],
                },
            ],
        },
    ],
};
//# sourceMappingURL=p017_bris_gicleurs.js.map