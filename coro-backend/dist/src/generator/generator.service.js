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
let GeneratorService = class GeneratorService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateDocumentStructure(projectId, config) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                client: true,
                building: true,
                user: true,
            },
        });
        if (!project)
            throw new Error('Projet introuvable');
        const ctx = {
            clientName: project.client.name,
            buildingName: project.building.name,
            buildingAddress: `${project.building.address}, ${project.building.city}, ${project.building.province}`,
            city: project.building.city,
            province: config.province || 'Quebec',
            year: project.year,
            documentType: project.documentType,
            responsableNom: config.responsableNom || '',
            responsableTitre: config.responsableTitre || '',
            dateReleve: config.dateReleve || new Date().toISOString().split('T')[0],
            floors: config.floors || 0,
            hauteurBatiment: config.hauteurBatiment || false,
            multiLocataires: config.multiLocataires || false,
            companyName: project.user.companyName || 'CORO',
        };
        const module1 = (0, module1_templates_1.generateModule1)(ctx);
        return {
            projectId,
            documentType: project.documentType,
            clientName: project.client.name,
            buildingName: project.building.name,
            generatedAt: new Date(),
            modules: [module1],
        };
    }
    async getModule1Preview(projectId, config) {
        const structure = await this.generateDocumentStructure(projectId, config);
        return structure.modules[0];
    }
};
exports.GeneratorService = GeneratorService;
exports.GeneratorService = GeneratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GeneratorService);
//# sourceMappingURL=generator.service.js.map