"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('Seeding bibliotheque CORO...');
    const incidentCodes = [
        { code: 'CODE_ROUGE', name: 'Code Rouge', color: '#FF0000', description: 'Incendie' },
        { code: 'CODE_VERT', name: 'Code Vert', color: '#00AA00', description: 'Evacuation' },
        { code: 'CODE_BLEU', name: 'Code Bleu', color: '#0066FF', description: 'Urgence medicale' },
        { code: 'CODE_GRIS', name: 'Code Gris', color: '#888888', description: 'Fuite de gaz' },
        { code: 'CODE_BLANC', name: 'Code Blanc', color: '#FFFFFF', description: 'Individu violent' },
        { code: 'CODE_NOIR', name: 'Code Noir', color: '#000000', description: 'Bombe / colis suspect' },
        { code: 'CODE_ORANGE', name: 'Code Orange', color: '#FF8800', description: 'Panne de courant' },
        { code: 'CODE_JAUNE', name: 'Code Jaune', color: '#FFCC00', description: 'Personne manquante' },
        { code: 'CODE_BRUN', name: 'Code Brun', color: '#8B4513', description: 'Deversement' },
        { code: 'CODE_TURQUOISE', name: 'Code Turquoise', color: '#00CED1', description: 'Inondation' },
        { code: 'CODE_GRENAT', name: 'Code Grenat', color: '#8B0000', description: 'Batterie lithium-ion' },
        { code: 'PROTOCOLE_18', name: 'Protocole-18', color: '#4B0082', description: 'Situation sensible' },
    ];
    for (const code of incidentCodes) {
        await prisma.incidentCode.upsert({
            where: { code: code.code },
            update: {},
            create: code,
        });
    }
    console.log('Codes incidents crees:', incidentCodes.length);
    const roles = [
        { roleCode: 'ROLE-CU', name: 'Coordonnateur urgence', description: 'Coordonne les operations lors d urgence' },
        { roleCode: 'ROLE-COS', name: 'Controleur COS', description: 'Controleur des operations de secours' },
        { roleCode: 'ROLE-RPR', name: 'Responsable point rassemblement', description: 'Gere le point de rassemblement' },
        { roleCode: 'ROLE-RS', name: 'Responsable secteur', description: 'Responsable d un secteur du batiment' },
        { roleCode: 'ROLE-SS', name: 'Surveillant sortie', description: 'Surveille les sorties lors evacuation' },
        { roleCode: 'ROLE-EPI', name: 'Equipe EPI', description: 'Equipe de premiere intervention incendie' },
        { roleCode: 'ROLE-RM', name: 'Responsable mecanique', description: 'Gere les systemes mecaniques' },
        { roleCode: 'ROLE-BRI', name: 'Brigadier', description: 'Assiste le responsable point rassemblement' },
        { roleCode: 'ROLE-CHE', name: 'Chercheur', description: 'Effectue la recherche dans les secteurs' },
        { roleCode: 'ROLE-AS', name: 'Agent securite', description: 'Agent de securite du batiment' },
        { roleCode: 'ROLE-ACC', name: 'Accompagnateur', description: 'Accompagne personnes necessitant aide evacuation' },
        { roleCode: 'ROLE-RC', name: 'Responsable continuite', description: 'Responsable du plan de continuite' },
        { roleCode: 'ROLE-RTI', name: 'Responsable TI', description: 'Responsable des technologies information' },
        { roleCode: 'ROLE-ENV', name: 'Responsable environnement', description: 'Responsable aspects environnementaux' },
    ];
    for (const role of roles) {
        await prisma.role.upsert({
            where: { roleCode: role.roleCode },
            update: {},
            create: role,
        });
    }
    console.log('Roles crees:', roles.length);
    console.log('Bibliotheque CORO prete !');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-library.js.map