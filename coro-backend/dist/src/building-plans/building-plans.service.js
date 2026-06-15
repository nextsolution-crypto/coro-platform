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
exports.BuildingPlansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_FILE_SIZE = 25 * 1024 * 1024;
let BuildingPlansService = class BuildingPlansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(projectId) {
        const plans = await this.prisma.buildingPlan.findMany({
            where: { projectId },
            orderBy: [{ section: 'asc' }, { order: 'asc' }],
            select: {
                id: true,
                section: true,
                name: true,
                description: true,
                fileName: true,
                fileSize: true,
                emissionDate: true,
                revision: true,
                order: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return plans;
    }
    async findOne(projectId, planId) {
        const plan = await this.prisma.buildingPlan.findFirst({
            where: { id: planId, projectId },
        });
        if (!plan)
            throw new common_1.NotFoundException('Plan introuvable');
        return plan;
    }
    async create(projectId, dto) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('Projet introuvable');
        if (dto.fileBase64) {
            const sizeInBytes = Buffer.from(dto.fileBase64, 'base64').length;
            if (sizeInBytes > MAX_FILE_SIZE) {
                throw new common_1.BadRequestException(`Le fichier dépasse la limite de 25MB (${Math.round(sizeInBytes / 1024 / 1024)}MB)`);
            }
        }
        const count = await this.prisma.buildingPlan.count({
            where: { projectId, section: dto.section },
        });
        return this.prisma.buildingPlan.create({
            data: {
                projectId,
                section: dto.section,
                name: dto.name,
                description: dto.description || null,
                fileBase64: dto.fileBase64,
                fileName: dto.fileName,
                fileSize: dto.fileSize,
                emissionDate: dto.emissionDate || null,
                revision: dto.revision || null,
                order: count,
            },
            select: {
                id: true,
                section: true,
                name: true,
                description: true,
                fileName: true,
                fileSize: true,
                emissionDate: true,
                revision: true,
                order: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async update(projectId, planId, dto) {
        const plan = await this.prisma.buildingPlan.findFirst({
            where: { id: planId, projectId },
        });
        if (!plan)
            throw new common_1.NotFoundException('Plan introuvable');
        if (dto.fileBase64) {
            const sizeInBytes = Buffer.from(dto.fileBase64, 'base64').length;
            if (sizeInBytes > MAX_FILE_SIZE) {
                throw new common_1.BadRequestException(`Le fichier dépasse la limite de 25MB (${Math.round(sizeInBytes / 1024 / 1024)}MB)`);
            }
        }
        const updateData = {
            name: dto.name ?? plan.name,
            description: dto.description ?? plan.description,
            emissionDate: dto.emissionDate ?? plan.emissionDate,
            revision: dto.revision ?? plan.revision,
        };
        if (dto.fileBase64) {
            updateData.fileBase64 = dto.fileBase64;
            updateData.fileName = dto.fileName;
            updateData.fileSize = dto.fileSize;
        }
        return this.prisma.buildingPlan.update({
            where: { id: planId },
            data: updateData,
            select: {
                id: true,
                section: true,
                name: true,
                description: true,
                fileName: true,
                fileSize: true,
                emissionDate: true,
                revision: true,
                order: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async remove(projectId, planId) {
        const plan = await this.prisma.buildingPlan.findFirst({
            where: { id: planId, projectId },
        });
        if (!plan)
            throw new common_1.NotFoundException('Plan introuvable');
        await this.prisma.buildingPlan.delete({ where: { id: planId } });
    }
    async reorder(projectId, planId, newOrder) {
        const plan = await this.prisma.buildingPlan.findFirst({
            where: { id: planId, projectId },
        });
        if (!plan)
            throw new common_1.NotFoundException('Plan introuvable');
        return this.prisma.buildingPlan.update({
            where: { id: planId },
            data: { order: newOrder },
        });
    }
    async getFileForExport(projectId, planId) {
        const plan = await this.prisma.buildingPlan.findFirst({
            where: { id: planId, projectId },
        });
        if (!plan)
            throw new common_1.NotFoundException('Plan introuvable');
        return plan;
    }
};
exports.BuildingPlansService = BuildingPlansService;
exports.BuildingPlansService = BuildingPlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BuildingPlansService);
//# sourceMappingURL=building-plans.service.js.map