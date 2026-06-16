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
exports.GeneratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const module1_templates_1 = require("./module1.templates");
const module2_templates_1 = require("./module2.templates");
const module3_templates_1 = require("./module3.templates");
const module4_templates_1 = require("./module4.templates");
let GeneratorService = class GeneratorService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async buildContext(projectId, config) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { client: true, building: true, user: true },
        });
        if (!project)
            throw new Error('Projet introuvable');
        return {
            clientName: project.client.name,
            buildingName: project.building.name,
            buildingAddress: `${project.building.address}, ${project.building.city}, ${project.building.province}`,
            city: project.building.city,
            province: config.province || 'Quebec',
            year: project.year,
            documentType: project.documentType,
            responsableNom: config.responsableNom || '',
            responsableTitre: config.responsableTitre || 'Directeur de la securite',
            dateReleve: config.dateReleve || new Date().toISOString().split('T')[0],
            floors: config.floors || 0,
            hauteurBatiment: config.hauteurBatiment || false,
            multiLocataires: config.multiLocataires || false,
            companyName: project.user.companyName || 'CORO',
            buildingType: project.building.buildingType || 'office',
            has_sprinklers: false,
            has_generator: false,
            has_elevators: false,
            has_hazardous_materials: false,
        };
    }
    async generateAndSave(projectId, config) {
        const ctx = await this.buildContext(projectId, config);
        const module1Result = (0, module1_templates_1.generateModule1)(ctx);
        const module2Result = (0, module2_templates_1.generateModule2)(ctx);
        const existingDoc = await this.prisma.document.findFirst({
            where: { projectId },
            select: { content: true },
        });
        const existingContent = existingDoc?.content || {};
        const section2_2 = existingContent?.module2?.section2_2 || [];
        const existingCustomRoles = existingContent?.module3?.customRoles || [];
        const module3Result = (0, module3_templates_1.generateModule3)(ctx, config, section2_2, existingCustomRoles);
        const savedOrgRoles = existingContent?.module3?.orgRoles || [];
        const activeRoleCodes = savedOrgRoles.length > 0
            ? savedOrgRoles
                .filter((r) => r.isActive)
                .map((r) => r.roleCode)
                .filter(Boolean)
            : [
                'ROLE-AS', 'ROLE-CU', 'ROLE-EPI', 'ROLE-RM',
                'ROLE-RPR', 'ROLE-SS', 'ROLE-BRI', 'ROLE-RS',
                'ROLE-CHE', 'ROLE-ACC',
            ];
        const customProcedureIds = existingContent?.module4?.customProcedureIds || [];
        const module4Result = (0, module4_templates_1.generateModule4)(ctx, config, activeRoleCodes, customProcedureIds);
        const module6FR = {
            moduleNumber: 6,
            title: 'PLANS TECHNIQUES DU BÂTIMENT',
            language: 'fr',
            sections: [],
        };
        const module6EN = {
            moduleNumber: 6,
            title: 'TECHNICAL PLANS OF THE BUILDING',
            language: 'en',
            sections: [],
        };
        const module7FR = {
            moduleNumber: 7,
            title: 'DESCRIPTION DU SITE ET ÉQUIPEMENTS DE SÉCURITÉ',
            language: 'fr',
            sections: [],
        };
        const module7EN = {
            moduleNumber: 7,
            title: 'SITE DESCRIPTION AND SAFETY EQUIPMENT',
            language: 'en',
            sections: [],
        };
        const existing = await this.prisma.document.findFirst({
            where: { projectId },
        });
        const documentData = {
            title: `${ctx.documentType} - ${ctx.buildingName} ${ctx.year}`,
            content: {
                modules_fr: [module1Result.fr, module2Result.fr, module3Result.fr, module4Result, module6FR, module7FR],
                modules_en: [module1Result.en, module2Result.en, module3Result.en, module4Result, module6EN, module7EN],
                config,
                generatedAt: new Date(),
            },
            status: 'IN_PROGRESS',
            version: existing ? existing.version + 1 : 1,
            projectId,
        };
        let document;
        if (existing) {
            document = await this.prisma.document.update({
                where: { id: existing.id },
                data: documentData,
            });
        }
        else {
            document = await this.prisma.document.create({
                data: documentData,
            });
        }
        await this.prisma.project.update({
            where: { id: projectId },
            data: { status: 'IN_PROGRESS', progress: 50 },
        });
        return { documentId: document.id, ...documentData };
    }
    async getDocument(projectId) {
        return this.prisma.document.findFirst({
            where: { projectId },
            include: { project: { include: { client: true, building: true } } },
        });
    }
    async updateModuleContent(documentId, moduleId, sectionId, content, language = 'fr') {
        const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!doc)
            throw new Error('Document introuvable');
        const docContent = doc.content;
        const modulesKey = language === 'en' ? 'modules_en' : 'modules_fr';
        const modules = docContent[modulesKey] || [];
        const moduleIdx = modules.findIndex((m) => m.moduleNumber === parseInt(moduleId));
        if (moduleIdx === -1)
            throw new Error('Module introuvable');
        const sectionIdx = modules[moduleIdx].sections.findIndex((s) => s.id === sectionId);
        if (sectionIdx === -1)
            throw new Error('Section introuvable');
        modules[moduleIdx].sections[sectionIdx].content = content;
        await this.prisma.document.update({
            where: { id: documentId },
            data: { content: { ...docContent, [modulesKey]: modules } },
        });
        return { success: true, moduleId, sectionId, language };
    }
};
exports.GeneratorService = GeneratorService;
exports.GeneratorService = GeneratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GeneratorService);
//# sourceMappingURL=generator.service.js.map