"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_ROLES = exports.ROLE_COLORS_PALETTE = void 0;
exports.activateSystemRoles = activateSystemRoles;
exports.extractNameFromSection2_2 = extractNameFromSection2_2;
exports.buildMemberTable = buildMemberTable;
exports.getActiveShifts = getActiveShifts;
exports.generateModule3 = generateModule3;
exports.ROLE_COLORS_PALETTE = [
    { label: 'Rouge (commandement)', value: '#C0392B', text: '#FFFFFF' },
    { label: 'Gris (technique)', value: '#BDC3C7', text: '#2C3E50' },
    { label: 'Vert (évacuation)', value: '#82B366', text: '#FFFFFF' },
    { label: 'Beige (brigadier)', value: '#FFE6CC', text: '#2C3E50' },
    { label: 'Blanc (liaison)', value: '#FFFFFF', text: '#2C3E50', border: '#2C3E50' },
    { label: 'Bleu (administration)', value: '#2980B9', text: '#FFFFFF' },
    { label: 'Noir (direction)', value: '#2C3E50', text: '#FFFFFF' },
    { label: 'Orange (support)', value: '#E67E22', text: '#FFFFFF' },
    { label: 'Vert foncé (sécurité)', value: '#1E8449', text: '#FFFFFF' },
    { label: 'Violet (liaison corp)', value: '#8E44AD', text: '#FFFFFF' },
];
exports.SYSTEM_ROLES = [
    {
        id: 'sys_coordonnateur',
        roleCode: 'ROLE-CU',
        label: 'COORDONNATEUR D\'URGENCE',
        label_en: 'EMERGENCY COORDINATOR',
        color: '#C0392B',
        textColor: '#FFFFFF',
        level: 0,
        column: 'top',
        isActive: true,
        isSystem: true,
        source: 'system',
        order: 0,
    },
    {
        id: 'sys_agent_liaison',
        roleCode: 'ROLE-ALT',
        label: 'AGENT DE LIAISON CORPORATIVE DE CRISE',
        label_en: 'CORPORATE CRISIS LIAISON OFFICER',
        note: '(Pour événement majeur seulement)',
        note_en: '(For major events only)',
        color: '#FFFFFF',
        textColor: '#2C3E50',
        borderColor: '#2C3E50',
        level: 1,
        column: 'left',
        isActive: false,
        isSystem: true,
        source: 'system',
        order: 1,
    },
    {
        id: 'sys_epi',
        roleCode: 'ROLE-EPI',
        label: 'ÉQUIPE DE PREMIÈRE INTERVENTION',
        label_en: 'FIRST RESPONSE TEAM',
        color: '#FFFFFF',
        textColor: '#C0392B',
        borderColor: '#C0392B',
        level: 2,
        column: 'left',
        isActive: false,
        isSystem: true,
        source: 'system',
        order: 2,
    },
    {
        id: 'sys_resp_mecanique',
        roleCode: 'ROLE-RM',
        label: 'RESPONSABLE MÉCANIQUE DU BÂTIMENT',
        label_en: 'BUILDING MECHANICAL SUPERVISOR',
        color: '#BDC3C7',
        textColor: '#2C3E50',
        level: 3,
        column: 'left',
        isActive: true,
        isSystem: true,
        source: 'system',
        order: 3,
    },
    {
        id: 'sys_resp_rassemblement',
        roleCode: 'ROLE-RPR',
        label: 'RESPONSABLE DU POINT DE RASSEMBLEMENT',
        label_en: 'ASSEMBLY POINT SUPERVISOR',
        color: '#82B366',
        textColor: '#FFFFFF',
        level: 4,
        column: 'left',
        isActive: true,
        isSystem: true,
        source: 'system',
        order: 4,
    },
    {
        id: 'sys_surveillant_sortie',
        roleCode: 'ROLE-SS',
        label: 'SURVEILLANT DE SORTIE',
        label_en: 'EXIT MONITOR',
        color: '#82B366',
        textColor: '#FFFFFF',
        level: 5,
        column: 'left',
        isActive: true,
        isSystem: true,
        source: 'system',
        order: 5,
    },
    {
        id: 'sys_brigadier',
        roleCode: 'ROLE-BRI',
        label: 'BRIGADIER',
        label_en: 'FLOOR WARDEN',
        color: '#FFE6CC',
        textColor: '#2C3E50',
        level: 6,
        column: 'left',
        isActive: true,
        isSystem: true,
        source: 'system',
        order: 6,
    },
    {
        id: 'sys_resp_secteur',
        roleCode: 'ROLE-RS',
        label: 'RESPONSABLE DE SECTEUR',
        label_en: 'SECTOR SUPERVISOR',
        note: '(1 par locataire)',
        note_en: '(1 per tenant)',
        color: '#C0392B',
        textColor: '#FFFFFF',
        level: 2,
        column: 'right',
        isActive: false,
        isSystem: true,
        source: 'system',
        order: 7,
    },
    {
        id: 'sys_chercheur',
        roleCode: 'ROLE-CHE',
        label: 'CHERCHEURS',
        label_en: 'SEARCHERS',
        note: '(Au besoin)',
        note_en: '(As needed)',
        color: '#C0392B',
        textColor: '#FFFFFF',
        level: 3,
        column: 'right',
        isActive: true,
        isSystem: true,
        source: 'system',
        order: 8,
    },
    {
        id: 'sys_accompagnateur',
        roleCode: 'ROLE-ACC',
        label: 'ACCOMPAGNATEUR POUR PERSONNE NÉCESSITANT L\'AIDE À L\'ÉVACUATION',
        label_en: 'EVACUATION ASSISTANCE COMPANION',
        color: '#C0392B',
        textColor: '#FFFFFF',
        level: 4,
        column: 'right',
        isActive: false,
        isSystem: true,
        source: 'system',
        order: 9,
    },
];
function activateSystemRoles(config, ctx) {
    return exports.SYSTEM_ROLES.map(role => {
        let updated = { ...role };
        switch (role.id) {
            case 'sys_coordonnateur':
                updated.isActive = true;
                if (config?.agentSecurite || config?.securite24h) {
                    updated.note = '(Agent de sécurité)';
                    updated.note_en = '(Security Agent)';
                }
                break;
            case 'sys_agent_liaison':
                updated.isActive = !!(config?.multiLocataires || ctx.multiLocataires);
                break;
            case 'sys_epi':
                updated.isActive = config?.panneauType === 'DOUBLE';
                break;
            case 'sys_resp_secteur':
                updated.isActive = !!(config?.multiLocataires || ctx.multiLocataires);
                break;
            case 'sys_accompagnateur':
                updated.isActive = !!(config?.personnelHandicap);
                break;
        }
        return updated;
    });
}
function extractNameFromSection2_2(roleId, section2_2) {
    if (!section2_2 || !Array.isArray(section2_2))
        return '';
    const keywords = {
        sys_coordonnateur: ['coordonnateur', 'coordinator', 'urgence'],
        sys_resp_mecanique: ['mécanique', 'maintenance', 'mechanical', 'entretien'],
        sys_resp_rassemblement: ['rassemblement', 'assembly'],
        sys_epi: ['intervention', 'epi', 'first response'],
        sys_agent_liaison: ['liaison', 'directeur', 'director', 'gestionnaire'],
    };
    const keys = keywords[roleId] || [];
    if (keys.length === 0)
        return '';
    const match = section2_2.find(entry => keys.some(k => entry.role?.toLowerCase().includes(k.toLowerCase())));
    return match?.name || '';
}
function buildMemberTable(orgRoles, config, section2_2) {
    const activeRoles = orgRoles.filter(r => r.isActive && r.id !== 'sys_agent_liaison');
    const activeShifts = getActiveShifts(config);
    const schedules = ['semaine', 'weekend'];
    const entries = [];
    for (const role of activeRoles) {
        for (const schedule of schedules) {
            for (const shift of activeShifts) {
                const personneDesignee = (shift === 'jour' && schedule === 'semaine')
                    ? extractNameFromSection2_2(role.id, section2_2)
                    : '';
                entries.push({
                    id: `${role.id}_${schedule}_${shift}`,
                    roleId: role.id,
                    roleLabel: role.label,
                    roleLabel_en: role.label_en,
                    shift,
                    schedule,
                    personneDesignee,
                    substitut: '',
                });
            }
        }
    }
    return entries;
}
function getActiveShifts(config) {
    const shifts = [];
    if (config?.occupationJour !== false)
        shifts.push('jour');
    if (config?.occupationSoir === true)
        shifts.push('soir');
    if (config?.occupationNuit === true)
        shifts.push('nuit');
    return shifts.length > 0 ? shifts : ['jour'];
}
function buildModule3(ctx, config, section2_2, lang, existingCustomRoles = []) {
    const systemRoles = activateSystemRoles(config, ctx);
    const allRoles = [...systemRoles, ...existingCustomRoles];
    const members = buildMemberTable(allRoles, config, section2_2);
    const titles = lang === 'fr' ? {
        module: 'RÔLES ET RESPONSABILITÉS DE L\'ÉQUIPE D\'URGENCE',
        s31: 'ORGANIGRAMME DE L\'ÉQUIPE D\'URGENCE',
        s32: 'LISTE DES MEMBRES DE L\'ÉQUIPE D\'URGENCE',
    } : {
        module: 'EMERGENCY TEAM ROLES AND RESPONSIBILITIES',
        s31: 'EMERGENCY TEAM ORGANIZATIONAL CHART',
        s32: 'EMERGENCY TEAM MEMBER LIST',
    };
    return {
        moduleNumber: 3,
        title: titles.module,
        language: lang,
        sections: [
            {
                id: '3.1',
                title: titles.s31,
                type: 'org_chart',
                orgRoles: allRoles,
            },
            {
                id: '3.2',
                title: titles.s32,
                type: 'member_table',
                members,
                activeShifts: getActiveShifts(config),
            },
        ],
    };
}
function generateModule3(ctx, config = {}, section2_2 = [], existingCustomRoles = []) {
    return {
        fr: buildModule3(ctx, config, section2_2, 'fr', existingCustomRoles),
        en: buildModule3(ctx, config, section2_2, 'en', existingCustomRoles),
    };
}
//# sourceMappingURL=module3.templates.js.map