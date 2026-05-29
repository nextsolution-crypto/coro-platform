"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfiguratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const rules_engine_service_1 = require("./rules-engine.service");
let ConfiguratorService = class ConfiguratorService {
    prisma;
    rulesEngine;
    constructor(prisma, rulesEngine) {
        this.prisma = prisma;
        this.rulesEngine = rulesEngine;
    }
    async analyzeBuilding(config) {
        return this.rulesEngine.analyzeConfiguration(config);
    }
    async saveConfiguration(projectId, config) {
        const analysis = this.rulesEngine.analyzeConfiguration(config);
        await this.prisma.project.update({
            where: { id: projectId },
            data: {
                status: 'IN_PROGRESS',
                progress: 25,
            },
        });
        return {
            projectId,
            config,
            analysis,
            savedAt: new Date(),
        };
    }
    async getQuestions() {
        return {
            sections: [
                {
                    id: 'description',
                    title: 'Description generale',
                    icon: '🏢',
                    fields: [
                        { key: 'buildingType', label: 'Type de batiment', type: 'select',
                            options: ['Tour a bureaux', 'Immeuble residentiel', 'Industriel', 'Commercial', 'Institutionnel', 'Hotel', 'Centre commercial', 'Autre'] },
                        { key: 'usagePrincipal', label: 'Usage principal', type: 'text' },
                        { key: 'floors', label: 'Nombre d etages', type: 'number' },
                        { key: 'basements', label: 'Nombre de sous-sols', type: 'number' },
                        { key: 'superficie', label: 'Superficie (pi2)', type: 'number' },
                        { key: 'anneeConstruction', label: 'Annee de construction', type: 'number' },
                        { key: 'multiLocataires', label: 'Multi-locataires', type: 'boolean' },
                        { key: 'securite24h', label: 'Securite 24h/7', type: 'boolean' },
                        { key: 'agentSecurite', label: 'Agent de securite sur place', type: 'boolean' },
                        { key: 'personnelHandicap', label: 'Personnes necessitant aide evacuation', type: 'boolean' },
                        { key: 'lieuSommeil', label: 'Lieu de sommeil (hotel, residence)', type: 'boolean' },
                    ],
                },
                {
                    id: 'emplacements',
                    title: 'Emplacements strategiques',
                    icon: '📍',
                    fields: [
                        { key: 'posteCommandement', label: 'Poste de commandement', type: 'text' },
                        { key: 'pointRassemblement', label: 'Point de rassemblement', type: 'text' },
                        { key: 'lieuAccueilTemporaire', label: 'Lieu d accueil temporaire', type: 'text' },
                        { key: 'salleElectrique', label: 'Salle electrique principale', type: 'text' },
                    ],
                },
                {
                    id: 'alarme',
                    title: 'Alarme incendie',
                    icon: '🚨',
                    fields: [
                        { key: 'panneauAlarme', label: 'Panneau alarme incendie present', type: 'boolean' },
                        { key: 'panneauType', label: 'Type de signal', type: 'select',
                            options: ['SIMPLE', 'DOUBLE', 'AUCUN'] },
                        { key: 'panneauMarque', label: 'Marque du panneau', type: 'text' },
                        { key: 'panneauModele', label: 'Modele du panneau', type: 'text' },
                        { key: 'teleSurveillance', label: 'Centrale de telesurveillance', type: 'boolean' },
                        { key: 'centraleSurveillance', label: 'Nom de la centrale', type: 'text' },
                        { key: 'telephonePompier', label: 'Telephone pompier', type: 'boolean' },
                        { key: 'stationManuelle', label: 'Stations manuelles alarme', type: 'boolean' },
                        { key: 'detecteurFumee', label: 'Detecteurs de fumee', type: 'boolean' },
                        { key: 'detecteurChaleur', label: 'Detecteurs de chaleur', type: 'boolean' },
                        { key: 'rappelAscenseurs', label: 'Rappel automatique ascenseurs', type: 'boolean' },
                        { key: 'arretVentilation', label: 'Arret automatique ventilation', type: 'boolean' },
                        { key: 'desenfumageAutomatique', label: 'Desenfumage automatique', type: 'boolean' },
                        { key: 'fermeturePortesCoupeFeu', label: 'Fermeture portes coupe-feu', type: 'boolean' },
                    ],
                },
                {
                    id: 'communication',
                    title: 'Communication',
                    icon: '📢',
                    fields: [
                        { key: 'systemePhonic', label: 'Systeme de communication phonique', type: 'boolean' },
                        { key: 'messagesAutomatises', label: 'Messages automatises', type: 'boolean' },
                        { key: 'radiosCommunication', label: 'Radios de communication', type: 'boolean' },
                        { key: 'intercomUrgence', label: 'Intercom urgence', type: 'boolean' },
                    ],
                },
                {
                    id: 'gicleurs',
                    title: 'Gicleurs et protection eau',
                    icon: '💧',
                    fields: [
                        { key: 'gicleurs', label: 'Reseau de gicleurs present', type: 'boolean' },
                        { key: 'gicleursComplet', label: 'Reseau complet (tous les etages)', type: 'boolean' },
                        { key: 'pompeIncendie', label: 'Pompe incendie', type: 'boolean' },
                        { key: 'boyauIncendie', label: 'Boyaux incendie', type: 'boolean' },
                        { key: 'raccordPompier', label: 'Raccord pompier exterieur', type: 'boolean' },
                        { key: 'bornesFontaine', label: 'Bornes-fontaines a proximite', type: 'boolean' },
                        { key: 'vannesIsolement', label: 'Vannes d isolement de zone', type: 'boolean' },
                        { key: 'salleGicleurs', label: 'Localisation salle gicleurs', type: 'text' },
                    ],
                },
                {
                    id: 'extincteurs',
                    title: 'Extincteurs et suppression',
                    icon: '🧯',
                    fields: [
                        { key: 'extincteurPortatif', label: 'Extincteurs portatifs presents', type: 'boolean' },
                        { key: 'systemeHotte', label: 'Systeme extinction hotte cuisine', type: 'boolean' },
                        { key: 'systemeHalogen', label: 'Systeme halon / halogenure', type: 'boolean' },
                        { key: 'systemeCO2', label: 'Systeme CO2 fixe', type: 'boolean' },
                    ],
                },
                {
                    id: 'mecanique',
                    title: 'Systemes mecaniques',
                    icon: '⚙️',
                    fields: [
                        { key: 'ascenseurs', label: 'Ascenseurs presents', type: 'boolean' },
                        { key: 'nbAscenseurs', label: 'Nombre d ascenseurs', type: 'number' },
                        { key: 'ascenseurPompier', label: 'Ascenseur pompier designe', type: 'boolean' },
                        { key: 'escaliersPressurises', label: 'Escaliers pressurises', type: 'boolean' },
                        { key: 'cvac', label: 'Systeme CVAC present', type: 'boolean' },
                        { key: 'desenfumage', label: 'Systeme de desenfumage', type: 'boolean' },
                        { key: 'generatrice', label: 'Generatrice presente', type: 'boolean' },
                        { key: 'autonomieGeneratrice', label: 'Autonomie generatrice (heures)', type: 'number' },
                        { key: 'gazNaturel', label: 'Gaz naturel present', type: 'boolean' },
                        { key: 'propane', label: 'Propane present', type: 'boolean' },
                    ],
                },
                {
                    id: 'detecteurs',
                    title: 'Detecteurs de gaz',
                    icon: '🔬',
                    fields: [
                        { key: 'detecteurCO', label: 'Detecteur CO (monoxyde)', type: 'boolean' },
                        { key: 'detecteurGazNaturel', label: 'Detecteur gaz naturel (CH4)', type: 'boolean' },
                        { key: 'detecteurPropane', label: 'Detecteur propane (C3H8)', type: 'boolean' },
                        { key: 'detecteurAmmoniac', label: 'Detecteur ammoniac (NH3)', type: 'boolean' },
                        { key: 'detecteurFreon', label: 'Detecteur freon', type: 'boolean' },
                        { key: 'detecteurO2', label: 'Detecteur oxygene (O2)', type: 'boolean' },
                        { key: 'detecteurFM200', label: 'Detecteur FM200', type: 'boolean' },
                    ],
                },
                {
                    id: 'matieres',
                    title: 'Matieres dangereuses',
                    icon: '⚠️',
                    fields: [
                        { key: 'matieresDangereuses', label: 'Matieres dangereuses presentes', type: 'boolean' },
                        { key: 'diesel', label: 'Diesel present', type: 'boolean' },
                        { key: 'ammoniac', label: 'Ammoniac present (NH3)', type: 'boolean' },
                        { key: 'batteriesLithium', label: 'Batteries lithium-ion', type: 'boolean' },
                        { key: 'fm200', label: 'FM200 present', type: 'boolean' },
                        { key: 'trousseDeversement', label: 'Trousse de deversement presente', type: 'boolean' },
                    ],
                },
                {
                    id: 'premiers_soins',
                    title: 'Premiers soins',
                    icon: '🏥',
                    fields: [
                        { key: 'trousseSecoursPresente', label: 'Trousse de premiers soins', type: 'boolean' },
                        { key: 'defibrillateur', label: 'Defibrillateur (DEA) present', type: 'boolean' },
                        { key: 'doucheOculaire', label: 'Douche oculaire presente', type: 'boolean' },
                    ],
                },
                {
                    id: 'industriel',
                    title: 'Specifique industriel',
                    icon: '🏭',
                    fields: [
                        { key: 'espaceClos', label: 'Espaces clos presents', type: 'boolean' },
                        { key: 'chariotsElevateurs', label: 'Chariots elevateurs', type: 'boolean' },
                        { key: 'palettiers', label: 'Palettiers / racks', type: 'boolean' },
                        { key: 'mezzanine', label: 'Mezzanine presente', type: 'boolean' },
                        { key: 'travailChaud', label: 'Travaux a chaud effectues', type: 'boolean' },
                        { key: 'procesDangereux', label: 'Procedes dangereux present', type: 'boolean' },
                        { key: 'systemeCadenassage', label: 'Systeme de cadenassage', type: 'boolean' },
                    ],
                },
                {
                    id: 'certifications',
                    title: 'Certifications du batiment',
                    icon: '🏆',
                    fields: [
                        { key: 'certBOMA', label: 'Certification BOMA BEST', type: 'boolean' },
                        { key: 'certLEED', label: 'Certification LEED', type: 'boolean' },
                        { key: 'certISO22301', label: 'ISO 22301 (Continuite)', type: 'boolean' },
                        { key: 'certISO31000', label: 'ISO 31000 (Gestion risques)', type: 'boolean' },
                        { key: 'certEnergyStar', label: 'Energy Star', type: 'boolean' },
                    ],
                },
            ],
        };
    }
};
exports.ConfiguratorService = ConfiguratorService;
exports.ConfiguratorService = ConfiguratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        rules_engine_service_1.RulesEngineService])
], ConfiguratorService);
//# sourceMappingURL=configurator.service.js.map