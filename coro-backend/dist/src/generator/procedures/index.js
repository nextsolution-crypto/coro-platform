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
exports.PROCEDURES_REGISTRY = [
    p001_directives_generales_1.P001_DIRECTIVES_GENERALES,
    p002_decouverte_fumee_1.P002_DECOUVERTE_FUMEE,
    p003_alerte_incendie_1.P003_ALERTE_INCENDIE,
    p004_alarme_incendie_1.P004_ALARME_INCENDIE,
    p005_fuite_gaz_1.P005_FUITE_GAZ,
    p011_menace_active_1.P011_MENACE_ACTIVE,
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