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
exports.Module7Service = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let Module7Service = class Module7Service {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getData(projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { module7: true },
        });
        if (!project)
            throw new common_1.NotFoundException('Projet introuvable');
        return {
            quartsData: project.module7?.quartsData || {},
            photosData: project.module7?.photosData || {},
            extraData: project.module7?.extraData || {},
        };
    }
    async saveData(projectId, dto) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { module7: true },
        });
        if (!project)
            throw new common_1.NotFoundException('Projet introuvable');
        if (project.module7) {
            await this.prisma.module7Data.update({
                where: { projectId },
                data: {
                    quartsData: dto.quartsData ?? project.module7.quartsData ?? {},
                    photosData: dto.photosData ?? project.module7.photosData ?? {},
                    extraData: dto.extraData ?? project.module7.extraData ?? {},
                },
            });
        }
        else {
            await this.prisma.module7Data.create({
                data: {
                    projectId,
                    quartsData: dto.quartsData || {},
                    photosData: dto.photosData || {},
                    extraData: dto.extraData || {},
                },
            });
        }
        return { success: true, updatedAt: new Date().toISOString() };
    }
    async getConfigForProject(projectId) {
        const doc = await this.prisma.document.findFirst({
            where: { projectId },
            select: { content: true },
        });
        const content = doc?.content || {};
        return content.config || {};
    }
};
exports.Module7Service = Module7Service;
exports.Module7Service = Module7Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], Module7Service);
//# sourceMappingURL=module7.service.js.map