"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROCEDURES_REGISTRY = exports.getProcedureById = exports.getAllProcedures = exports.getActiveProcedures = void 0;
exports.generateModule4 = generateModule4;
const index_1 = require("./procedures/index");
Object.defineProperty(exports, "getActiveProcedures", { enumerable: true, get: function () { return index_1.getActiveProcedures; } });
Object.defineProperty(exports, "getAllProcedures", { enumerable: true, get: function () { return index_1.getAllProcedures; } });
Object.defineProperty(exports, "getProcedureById", { enumerable: true, get: function () { return index_1.getProcedureById; } });
Object.defineProperty(exports, "PROCEDURES_REGISTRY", { enumerable: true, get: function () { return index_1.PROCEDURES_REGISTRY; } });
function generateModule4(ctx, config = {}, activeRoleCodes = [], customProcedureIds = []) {
    const autoProcedures = (0, index_1.getActiveProcedures)(config, ctx.documentType, activeRoleCodes);
    const manualProcedures = customProcedureIds
        .map(id => (0, index_1.getProcedureById)(id))
        .filter(Boolean)
        .filter(p => !autoProcedures.find(a => a.id === p.id))
        .map(p => ({
        ...p,
        roleSections: p.roleSections.filter(rs => rs.roleCode === 'TOUS' || activeRoleCodes.includes(rs.roleCode)),
    }));
    const allProcedures = [...autoProcedures, ...manualProcedures];
    const numbered = allProcedures
        .filter(p => p.id !== 'p001_directives_generales')
        .map((p, idx) => ({ ...p, sectionNumber: `4.${idx + 1}` }));
    const directives = allProcedures.find(p => p.id === 'p001_directives_generales');
    return {
        moduleNumber: 4,
        title_fr: 'PROCÉDURES DES MEMBRES DE L\'ÉQUIPE D\'URGENCE',
        title_en: 'EMERGENCY TEAM MEMBER PROCEDURES',
        language: 'fr',
        directivesGenerales: directives || null,
        procedures: numbered,
        totalProcedures: numbered.length,
    };
}
//# sourceMappingURL=module4.templates.js.map