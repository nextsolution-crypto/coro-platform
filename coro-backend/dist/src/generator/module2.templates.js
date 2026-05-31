"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_EQUIPEMENTS_EN = exports.ALL_EQUIPEMENTS_FR = exports.EQUIPEMENTS_CONDITIONNELS_EN = exports.EQUIPEMENTS_CONDITIONNELS_FR = exports.EQUIPEMENTS_BASE_EN = exports.EQUIPEMENTS_BASE_FR = exports.ROLES_INTERNES_INDUSTRIEL_EN = exports.ROLES_INTERNES_INDUSTRIEL_FR = exports.ROLES_INTERNES_BUREAU_EN = exports.ROLES_INTERNES_BUREAU_FR = void 0;
exports.generateModule2 = generateModule2;
exports.ROLES_INTERNES_BUREAU_FR = [
    'Directrice, Exploitation',
    'Directeur, Exploitation',
    'Gestionnaire d\'immeuble',
    'Gestionnaire de maintenance',
    'Responsable sécurité',
    'Responsable entretien',
    'Coordonnateur d\'urgence',
    'Directeur général',
    'Directeur des opérations',
    'Responsable des ressources humaines',
    'Agent de sécurité',
    'Concierge',
    'Autre',
];
exports.ROLES_INTERNES_BUREAU_EN = [
    'Director, Operations',
    'Building Manager',
    'Maintenance Manager',
    'Security Officer',
    'Maintenance Supervisor',
    'Emergency Coordinator',
    'General Manager',
    'Director of Operations',
    'Human Resources Manager',
    'Security Agent',
    'Concierge',
    'Other',
];
exports.ROLES_INTERNES_INDUSTRIEL_FR = [
    'Directeur de l\'usine',
    'Surintendant',
    'Gestionnaire de maintenance',
    'Responsable sécurité',
    'Concierge',
    'Coordonnateur d\'urgence',
    'Directeur général',
    'Responsable environnement',
    'Chef d\'équipe',
    'Agent de sécurité',
    'Responsable des ressources humaines',
    'Autre',
];
exports.ROLES_INTERNES_INDUSTRIEL_EN = [
    'Plant Director',
    'Superintendent',
    'Maintenance Manager',
    'Safety Officer',
    'Janitor',
    'Emergency Coordinator',
    'General Manager',
    'Environmental Manager',
    'Team Lead',
    'Security Agent',
    'Human Resources Manager',
    'Other',
];
exports.EQUIPEMENTS_BASE_FR = [
    'Centrale d\'alarme incendie',
    'Entretien et maintenance du panneau d\'alarme incendie',
    'Entretien et maintenance du réseau d\'alarme incendie',
    'Entretien et inspection des extincteurs',
    'Électricien',
    'Entretien et maintenance CVAC',
];
exports.EQUIPEMENTS_BASE_EN = [
    'Fire alarm control panel',
    'Fire alarm panel maintenance',
    'Fire alarm network maintenance',
    'Fire extinguisher inspection and maintenance',
    'Electrician',
    'HVAC maintenance',
];
exports.EQUIPEMENTS_CONDITIONNELS_FR = {
    has_sprinklers: [
        'Entretien et maintenance du système de réseau de gicleurs',
    ],
    has_generator: [
        'Entretien et maintenance de la génératrice',
        'Remplissage de la génératrice',
    ],
    has_elevators: [
        'Technicien ascenseurs',
    ],
    has_hazardous_materials: [
        'Récupération des matières dangereuses',
        'Urgence déversement',
    ],
    building_type_industrial: [
        'Ventilation',
        'Frigoriste',
        'MMF',
        'Plombier',
        'Serrurier',
    ],
};
exports.EQUIPEMENTS_CONDITIONNELS_EN = {
    has_sprinklers: [
        'Sprinkler system maintenance',
    ],
    has_generator: [
        'Generator maintenance',
        'Generator fuel service',
    ],
    has_elevators: [
        'Elevator technician',
    ],
    has_hazardous_materials: [
        'Hazardous material recovery',
        'Spill emergency',
    ],
    building_type_industrial: [
        'Ventilation',
        'Refrigeration technician',
        'MMF',
        'Plumber',
        'Locksmith',
    ],
};
exports.ALL_EQUIPEMENTS_FR = [
    ...exports.EQUIPEMENTS_BASE_FR,
    'Entretien et maintenance du système de réseau de gicleurs',
    'Entretien et maintenance de la génératrice',
    'Remplissage de la génératrice',
    'Technicien ascenseurs',
    'Récupération des matières dangereuses',
    'Urgence déversement',
    'Ventilation',
    'Frigoriste',
    'MMF',
    'Plombier',
    'Serrurier',
    'Conseillers en prévention incendie et mesures d\'urgence',
    'Autre',
];
exports.ALL_EQUIPEMENTS_EN = [
    ...exports.EQUIPEMENTS_BASE_EN,
    'Sprinkler system maintenance',
    'Generator maintenance',
    'Generator fuel service',
    'Elevator technician',
    'Hazardous material recovery',
    'Spill emergency',
    'Ventilation',
    'Refrigeration technician',
    'MMF',
    'Plumber',
    'Locksmith',
    'Fire safety and emergency management consultants',
    'Other',
];
const RESSOURCES_COMMUNES_FR = [
    { role: 'Bureau de la sécurité des transports (BST)', phone: '1 (819) 994-3741\nAppels sans frais : 1 (800) 387-3557', url: 'https://www.tsb.gc.ca' },
    { role: 'CANUTEC, Matières Dangereuses (24h/24)', phone: '1 (888) 226-8832', url: 'https://tc.canada.ca/fr/marchandises-dangereuses/canutec' },
    { role: 'Ressources naturelles Canada', phone: '1 (855) 525-9293', url: 'https://www.rncan.gc.ca' },
    { role: 'Séismes Canada', phone: '1 (613) 995-0600', url: 'https://www.seismescanada.rncan.gc.ca' },
    { role: 'Urgence environnement fédéral (Env. Canada)', phone: '1 (866) 283-2333' },
    { role: 'Énergir', phone: '1 (800) 361-8003' },
    { role: 'Siège social de GardaWorld (Montréal)', phone: '(514) 281-2811', isBold: true, isFixed: true },
];
const RESSOURCES_COMMUNES_EN = [
    { role: 'Transportation Safety Board (TSB)', phone: '1 (819) 994-3741\nToll-free: 1 (800) 387-3557', url: 'https://www.tsb.gc.ca' },
    { role: 'CANUTEC, Dangerous Goods (24/7)', phone: '1 (888) 226-8832', url: 'https://tc.canada.ca/en/dangerous-goods/canutec' },
    { role: 'Natural Resources Canada', phone: '1 (855) 525-9293', url: 'https://www.nrcan.gc.ca' },
    { role: 'Earthquakes Canada', phone: '1 (613) 995-0600', url: 'https://www.earthquakescanada.nrcan.gc.ca' },
    { role: 'Federal Environmental Emergency (Env. Canada)', phone: '1 (866) 283-2333' },
    { role: 'Énergir', phone: '1 (800) 361-8003' },
    { role: 'GardaWorld Head Office (Montréal)', phone: '(514) 281-2811', isBold: true, isFixed: true },
];
const RESSOURCES_QC_FR = [
    { role: 'Centre antipoison du Québec', phone: '1 (800) 463-5060', url: 'https://www.211qc.ca' },
    { role: 'CNESST (blessures graves)', phone: '1 (866) 302-2778', url: 'https://www.csst.qc.ca' },
    { role: 'Info-Santé', phone: '8-1-1', url: 'https://www.quebec.ca/sante' },
    { role: 'Ministère des Transports du Québec', phone: '5-1-1 ou 1 (888) 355-0511', url: 'https://www.transports.gouv.qc.ca' },
    { role: 'Hydro-Québec (panne)', phone: '1 (888) 385-7252', url: 'https://pannes.hydroquebec.com' },
    { role: 'Régie du bâtiment du Québec', phone: '1 (800) 267-1420', url: 'https://www.rbq.gouv.qc.ca' },
    { role: 'Urgence environnement provincial (M.E.L.C.C.)', phone: '1 (866) 694-5454' },
    ...RESSOURCES_COMMUNES_FR,
];
const RESSOURCES_QC_EN = [
    { role: 'Quebec Poison Control Centre', phone: '1 (800) 463-5060', url: 'https://www.211qc.ca' },
    { role: 'CNESST (serious injuries)', phone: '1 (866) 302-2778', url: 'https://www.csst.qc.ca' },
    { role: 'Info-Santé', phone: '8-1-1' },
    { role: 'Ministère des Transports du Québec', phone: '5-1-1 or 1 (888) 355-0511', url: 'https://www.transports.gouv.qc.ca' },
    { role: 'Hydro-Québec (outage)', phone: '1 (888) 385-7252', url: 'https://pannes.hydroquebec.com' },
    { role: 'Régie du bâtiment du Québec', phone: '1 (800) 267-1420', url: 'https://www.rbq.gouv.qc.ca' },
    { role: 'Provincial Environmental Emergency (M.E.L.C.C.)', phone: '1 (866) 694-5454' },
    ...RESSOURCES_COMMUNES_EN,
];
const RESSOURCES_ON_FR = [
    { role: 'Centre antipoison de l\'Ontario', phone: '1 (800) 268-9017' },
    { role: 'Ministère du Travail Ontario (accident grave)', phone: '1 (877) 202-0008' },
    { role: 'Hydro One (panne)', phone: '1 (800) 434-1235', url: 'https://www.hydroone.com' },
    { role: 'Toronto Hydro (panne)', phone: '416 542-8000' },
    { role: 'Urgence environnement Ontario (MECP)', phone: '1 (800) 268-6060' },
    ...RESSOURCES_COMMUNES_FR,
];
const RESSOURCES_ON_EN = [
    { role: 'Ontario Poison Centre', phone: '1 (800) 268-9017' },
    { role: 'Ontario Ministry of Labour (serious accident)', phone: '1 (877) 202-0008' },
    { role: 'Hydro One (outage)', phone: '1 (800) 434-1235', url: 'https://www.hydroone.com' },
    { role: 'Toronto Hydro (outage)', phone: '416 542-8000' },
    { role: 'Ontario Environmental Emergency (MECP)', phone: '1 (800) 268-6060' },
    ...RESSOURCES_COMMUNES_EN,
];
const RESSOURCES_AB_FR = [
    { role: 'Alberta Poison Centre', phone: '1 (800) 332-1414' },
    { role: 'Alberta Labour & Immigration (accident grave)', phone: '1 (866) 415-8690' },
    { role: 'ATCO Gas (urgence gaz)', phone: '1 (800) 511-3447' },
    { role: 'ENMAX (panne — Calgary)', phone: '403 514-6100' },
    { role: 'EPCOR (panne — Edmonton)', phone: '1 (800) 376-7688' },
    { role: 'Alberta Environment (urgence environnementale)', phone: '1 (800) 222-6514' },
    ...RESSOURCES_COMMUNES_FR,
];
const RESSOURCES_AB_EN = [
    { role: 'Alberta Poison Centre', phone: '1 (800) 332-1414' },
    { role: 'Alberta Labour & Immigration (serious accident)', phone: '1 (866) 415-8690' },
    { role: 'ATCO Gas (gas emergency)', phone: '1 (800) 511-3447' },
    { role: 'ENMAX (outage — Calgary)', phone: '403 514-6100' },
    { role: 'EPCOR (outage — Edmonton)', phone: '1 (800) 376-7688' },
    { role: 'Alberta Environment (environmental emergency)', phone: '1 (800) 222-6514' },
    ...RESSOURCES_COMMUNES_EN,
];
function getExternalResources(province, lang) {
    const p = province?.toLowerCase();
    if (lang === 'fr') {
        if (p === 'qc' || p === 'québec' || p === 'quebec')
            return RESSOURCES_QC_FR;
        if (p === 'on' || p === 'ontario')
            return RESSOURCES_ON_FR;
        if (p === 'ab' || p === 'alberta')
            return RESSOURCES_AB_FR;
        return RESSOURCES_QC_FR;
    }
    else {
        if (p === 'qc' || p === 'québec' || p === 'quebec')
            return RESSOURCES_QC_EN;
        if (p === 'on' || p === 'ontario')
            return RESSOURCES_ON_EN;
        if (p === 'ab' || p === 'alberta')
            return RESSOURCES_AB_EN;
        return RESSOURCES_QC_EN;
    }
}
function buildSection2_2(ctx, lang) {
    const isBureau = ctx.buildingType === 'office' || ctx.buildingType === 'bureau'
        || ctx.buildingType === 'commercial';
    if (lang === 'fr') {
        if (isBureau) {
            return [
                { role: 'Directrice, Exploitation', name: '', phone: '' },
                { role: 'Gestionnaire d\'immeuble', name: '', phone: '' },
                { role: 'Gestionnaire de maintenance', name: '', phone: '' },
                { role: 'Responsable sécurité', name: '', phone: '' },
                { role: 'Responsable entretien', name: '', phone: '' },
                { role: 'Coordonnateur d\'urgence', name: '', phone: '', isBold: true },
            ];
        }
        return [
            { role: 'Directeur de l\'usine', name: '', phone: '' },
            { role: 'Surintendant', name: '', phone: '' },
            { role: 'Gestionnaire de Maintenance', name: '', phone: '' },
            { role: 'Responsable Sécurité', name: '', phone: '' },
            { role: 'Concierge', name: '', phone: '' },
            { role: 'Coordonnateur d\'urgence', name: '', phone: '', isBold: true },
        ];
    }
    else {
        if (isBureau) {
            return [
                { role: 'Director, Operations', name: '', phone: '' },
                { role: 'Building Manager', name: '', phone: '' },
                { role: 'Maintenance Manager', name: '', phone: '' },
                { role: 'Security Officer', name: '', phone: '' },
                { role: 'Maintenance Supervisor', name: '', phone: '' },
                { role: 'Emergency Coordinator', name: '', phone: '', isBold: true },
            ];
        }
        return [
            { role: 'Plant Director', name: '', phone: '' },
            { role: 'Superintendent', name: '', phone: '' },
            { role: 'Maintenance Manager', name: '', phone: '' },
            { role: 'Safety Officer', name: '', phone: '' },
            { role: 'Janitor', name: '', phone: '' },
            { role: 'Emergency Coordinator', name: '', phone: '', isBold: true },
        ];
    }
}
function buildSection2_3(ctx, lang) {
    const base = lang === 'fr' ? [...exports.EQUIPEMENTS_BASE_FR] : [...exports.EQUIPEMENTS_BASE_EN];
    const cond = lang === 'fr' ? exports.EQUIPEMENTS_CONDITIONNELS_FR : exports.EQUIPEMENTS_CONDITIONNELS_EN;
    const extra = [];
    if (ctx.has_sprinklers)
        extra.push(...cond.has_sprinklers);
    if (ctx.has_generator)
        extra.push(...cond.has_generator);
    if (ctx.has_elevators)
        extra.push(...cond.has_elevators);
    if (ctx.has_hazardous_materials)
        extra.push(...cond.has_hazardous_materials);
    if (ctx.buildingType === 'industrial' || ctx.buildingType === 'industriel') {
        extra.push(...cond.building_type_industrial);
    }
    const gardaRole = lang === 'fr'
        ? 'Conseillers en prévention incendie et mesures d\'urgence'
        : 'Fire safety and emergency management consultants';
    const entries = [
        ...base.map(role => ({ role, name: '', phone: '' })),
        ...extra.map(role => ({ role, name: '', phone: '' })),
        { role: gardaRole, name: 'GardaWorld', phone: '514 791-7871', isBold: true, isFixed: true },
    ];
    return entries;
}
function generateModule2FR(ctx) {
    const isBureau = ctx.buildingType === 'office' || ctx.buildingType === 'bureau'
        || ctx.buildingType === 'commercial';
    return {
        moduleNumber: 2,
        title: 'LISTE TÉLÉPHONIQUE',
        language: 'fr',
        sections: [
            {
                id: '2.1',
                title: 'NUMÉROS D\'URGENCE',
                type: 'phone_table',
                columns: ['RÔLE / ÉQUIPEMENT', 'NOM', 'TÉLÉPHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: false,
                entries: [
                    { role: 'Pompier', name: '', phone: '9-1-1', isFixed: false },
                    { role: 'Police', name: '', phone: '9-1-1', isFixed: false },
                    { role: 'Ambulance', name: '', phone: '9-1-1', isFixed: false },
                ],
            },
            {
                id: '2.2',
                title: 'RESSOURCES INTERNES',
                type: 'phone_table',
                columns: ['RÔLE / ÉQUIPEMENT', 'NOM', 'TÉLÉPHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: true,
                availableRoles: isBureau ? exports.ROLES_INTERNES_BUREAU_FR : exports.ROLES_INTERNES_INDUSTRIEL_FR,
                entries: buildSection2_2(ctx, 'fr'),
            },
            {
                id: '2.3',
                title: 'ÉQUIPEMENTS TECHNIQUES DU BÂTIMENT',
                type: 'phone_table',
                columns: ['RÔLE / ÉQUIPEMENT', 'NOM', 'TÉLÉPHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: true,
                availableRoles: exports.ALL_EQUIPEMENTS_FR,
                entries: buildSection2_3(ctx, 'fr'),
            },
            {
                id: '2.4',
                title: 'RESSOURCES EXTERNES',
                type: 'external_table',
                columns: ['RÔLE / ÉQUIPEMENT', 'TÉLÉPHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: false,
                entries: getExternalResources(ctx.province, 'fr'),
            },
        ],
    };
}
function generateModule2EN(ctx) {
    const isBureau = ctx.buildingType === 'office' || ctx.buildingType === 'bureau'
        || ctx.buildingType === 'commercial';
    return {
        moduleNumber: 2,
        title: 'PHONE DIRECTORY',
        language: 'en',
        sections: [
            {
                id: '2.1',
                title: 'EMERGENCY NUMBERS',
                type: 'phone_table',
                columns: ['ROLE / EQUIPMENT', 'NAME', 'PHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: false,
                entries: [
                    { role: 'Fire Department', name: '', phone: '9-1-1', isFixed: false },
                    { role: 'Police', name: '', phone: '9-1-1', isFixed: false },
                    { role: 'Ambulance', name: '', phone: '9-1-1', isFixed: false },
                ],
            },
            {
                id: '2.2',
                title: 'INTERNAL RESOURCES',
                type: 'phone_table',
                columns: ['ROLE / EQUIPMENT', 'NAME', 'PHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: true,
                availableRoles: isBureau ? exports.ROLES_INTERNES_BUREAU_EN : exports.ROLES_INTERNES_INDUSTRIEL_EN,
                entries: buildSection2_2(ctx, 'en'),
            },
            {
                id: '2.3',
                title: 'BUILDING TECHNICAL EQUIPMENT',
                type: 'phone_table',
                columns: ['ROLE / EQUIPMENT', 'NAME', 'PHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: true,
                availableRoles: exports.ALL_EQUIPEMENTS_EN,
                entries: buildSection2_3(ctx, 'en'),
            },
            {
                id: '2.4',
                title: 'EXTERNAL RESOURCES',
                type: 'external_table',
                columns: ['ROLE / EQUIPMENT', 'PHONE'],
                editable: true,
                allowAdd: true,
                allowDelete: true,
                useDropdown: false,
                entries: getExternalResources(ctx.province, 'en'),
            },
        ],
    };
}
function generateModule2(ctx) {
    return {
        fr: generateModule2FR(ctx),
        en: generateModule2EN(ctx),
    };
}
//# sourceMappingURL=module2.templates.js.map