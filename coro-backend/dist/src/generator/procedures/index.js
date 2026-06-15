"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVATION_RULES = exports.PROCEDURES_REGISTRY = void 0;
exports.getActiveProcedures = getActiveProcedures;
exports.getAllProcedures = getAllProcedures;
exports.getProcedureById = getProcedureById;
const p001_directives_generales_1 = require("./p001_directives_generales");
const p002_decouverte_fumee_1 = require("./p002_decouverte_fumee");
const p003_alerte_incendie_1 = require("./p003_alerte_incendie");
const p004_alarme_incendie_1 = require("./p004_alarme_incendie");
const p005_fuite_gaz_1 = require("./p005_fuite_gaz");
const p011_menace_active_1 = require("./p011_menace_active");
const p012_ascenseur_1 = require("./p012_ascenseur");
const p013_urgence_medicale_1 = require("./p013_urgence_medicale");
const p014_gaz_toxique_1 = require("./p014_gaz_toxique");
const p015_colis_suspect_1 = require("./p015_colis_suspect");
const p016_coupure_courant_1 = require("./p016_coupure_courant");
const p017_bris_gicleurs_1 = require("./p017_bris_gicleurs");
const p018_matieres_dangereuses_1 = require("./p018_matieres_dangereuses");
const p019_alerte_bombe_1 = require("./p019_alerte_bombe");
const p020_manifestation_1 = require("./p020_manifestation");
const p021_ve_incendie_1 = require("./p021_ve_incendie");
const p022_vents_violents_1 = require("./p022_vents_violents");
const p023_vagues_chaleur_1 = require("./p023_vagues_chaleur");
const p024_inondations_1 = require("./p024_inondations");
const p025_verglas_1 = require("./p025_verglas");
const p026_batterie_lithium_1 = require("./p026_batterie_lithium");
const p027_noyade_1 = require("./p027_noyade");
const p028_incendie_cuisine_1 = require("./p028_incendie_cuisine");
const p101_alerte_incendie_ind_1 = require("./p101_alerte_incendie_ind");
const p102_alarme_incendie_ind_1 = require("./p102_alarme_incendie_ind");
const p103_fuite_gaz_ind_1 = require("./p103_fuite_gaz_ind");
const p104_fuite_ammoniac_ind_1 = require("./p104_fuite_ammoniac_ind");
const p105_exposition_ammoniac_ind_1 = require("./p105_exposition_ammoniac_ind");
const p106_urgence_medicale_ind_1 = require("./p106_urgence_medicale_ind");
const p107_deversement_matdang_ind_1 = require("./p107_deversement_matdang_ind");
const p108_bris_gicleur_ind_1 = require("./p108_bris_gicleur_ind");
const p111_decouverte_fumee_occ_1 = require("./p111_decouverte_fumee_occ");
const p112_alerte_incendie_occ_1 = require("./p112_alerte_incendie_occ");
const p113_alarme_incendie_occ_1 = require("./p113_alarme_incendie_occ");
const p114_batterie_lithium_occ_1 = require("./p114_batterie_lithium_occ");
const p115_fuite_ammoniac_occ_1 = require("./p115_fuite_ammoniac_occ");
const p116_exposition_ammoniac_occ_1 = require("./p116_exposition_ammoniac_occ");
const p117_alarme_oxygene_occ_1 = require("./p117_alarme_oxygene_occ");
const p118_alarme_co2_occ_1 = require("./p118_alarme_co2_occ");
const p119_urgence_medicale_occ_1 = require("./p119_urgence_medicale_occ");
const p120_panne_courant_occ_1 = require("./p120_panne_courant_occ");
const p121_ascenseur_occ_1 = require("./p121_ascenseur_occ");
const p122_deversement_matdang_occ_1 = require("./p122_deversement_matdang_occ");
exports.PROCEDURES_REGISTRY = [
    p001_directives_generales_1.P001_DIRECTIVES_GENERALES,
    p002_decouverte_fumee_1.P002_DECOUVERTE_FUMEE,
    p003_alerte_incendie_1.P003_ALERTE_INCENDIE,
    p004_alarme_incendie_1.P004_ALARME_INCENDIE,
    p005_fuite_gaz_1.P005_FUITE_GAZ,
    p011_menace_active_1.P011_MENACE_ACTIVE,
    p012_ascenseur_1.P012_ASCENSEUR,
    p013_urgence_medicale_1.P013_URGENCE_MEDICALE,
    p014_gaz_toxique_1.P014_GAZ_TOXIQUE,
    p015_colis_suspect_1.P015_COLIS_SUSPECT,
    p016_coupure_courant_1.P016_COUPURE_COURANT,
    p017_bris_gicleurs_1.P017_BRIS_GICLEURS,
    p018_matieres_dangereuses_1.P018_MATIERES_DANGEREUSES,
    p019_alerte_bombe_1.P019_ALERTE_BOMBE,
    p020_manifestation_1.P020_MANIFESTATION,
    p021_ve_incendie_1.P021_VE_INCENDIE,
    p022_vents_violents_1.P022_VENTS_VIOLENTS,
    p023_vagues_chaleur_1.P023_VAGUES_CHALEUR,
    p024_inondations_1.P024_INONDATIONS,
    p025_verglas_1.P025_VERGLAS,
    p026_batterie_lithium_1.P026_BATTERIE_LITHIUM,
    p027_noyade_1.P027_NOYADE,
    p028_incendie_cuisine_1.P028_INCENDIE_CUISINE,
    p101_alerte_incendie_ind_1.P101_ALERTE_INCENDIE_IND,
    p102_alarme_incendie_ind_1.P102_ALARME_INCENDIE_IND,
    p103_fuite_gaz_ind_1.P103_FUITE_GAZ_IND,
    p104_fuite_ammoniac_ind_1.P104_FUITE_AMMONIAC_IND,
    p105_exposition_ammoniac_ind_1.P105_EXPOSITION_AMMONIAC_IND,
    p106_urgence_medicale_ind_1.P106_URGENCE_MEDICALE_IND,
    p107_deversement_matdang_ind_1.P107_DEVERSEMENT_MATDANG_IND,
    p108_bris_gicleur_ind_1.P108_BRIS_GICLEUR_IND,
    p111_decouverte_fumee_occ_1.P111_DECOUVERTE_FUMEE_OCC,
    p112_alerte_incendie_occ_1.P112_ALERTE_INCENDIE_OCC,
    p113_alarme_incendie_occ_1.P113_ALARME_INCENDIE_OCC,
    p114_batterie_lithium_occ_1.P114_BATTERIE_LITHIUM_OCC,
    p115_fuite_ammoniac_occ_1.P115_FUITE_AMMONIAC_OCC,
    p116_exposition_ammoniac_occ_1.P116_EXPOSITION_AMMONIAC_OCC,
    p117_alarme_oxygene_occ_1.P117_ALARME_OXYGENE_OCC,
    p118_alarme_co2_occ_1.P118_ALARME_CO2_OCC,
    p119_urgence_medicale_occ_1.P119_URGENCE_MEDICALE_OCC,
    p120_panne_courant_occ_1.P120_PANNE_COURANT_OCC,
    p121_ascenseur_occ_1.P121_ASCENSEUR_OCC,
    p122_deversement_matdang_occ_1.P122_DEVERSEMENT_MATDANG_OCC,
];
exports.ACTIVATION_RULES = {
    always: () => true,
    double_signal: (c) => c?.panneauType === 'DOUBLE',
    simple_signal: (c) => c?.panneauType === 'SIMPLE',
    has_gas: (c) => !!c?.gazNaturel,
    has_ammonia: (c) => !!c?.ammoniac,
    has_sprinklers: (c) => !!c?.gicleurs,
    has_elevators: (c) => !!c?.ascenseurs,
    has_hazmat: (c) => !!c?.matieresDangereuses,
    has_lithium: (c) => !!c?.batteriesLithium,
    boma_certified: (c) => !!c?.certBOMA,
    has_pool: (c) => !!c?.piscine,
    has_kitchen: (c) => !!c?.cuisineCommerciale,
    manual: () => false,
    is_industrial: (c) => c?.buildingType === 'Industriel',
};
function getActiveProcedures(config, documentType, activeRoleCodes) {
    return exports.PROCEDURES_REGISTRY
        .filter(p => {
        if (!p.documentTypes.includes(documentType))
            return false;
        const rule = exports.ACTIVATION_RULES[p.activationRule];
        if (!rule)
            return true;
        return rule(config);
    })
        .map(p => ({
        ...p,
        roleSections: p.roleSections.filter(rs => rs.roleCode === 'TOUS' ||
            activeRoleCodes.includes(rs.roleCode)),
    }));
}
function getAllProcedures() {
    return exports.PROCEDURES_REGISTRY;
}
function getProcedureById(id) {
    return exports.PROCEDURES_REGISTRY.find(p => p.id === id);
}
//# sourceMappingURL=index.js.map