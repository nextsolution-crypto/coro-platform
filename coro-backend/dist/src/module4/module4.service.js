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
exports.Module4Service = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const module4_templates_1 = require("../generator/module4.templates");
let Module4Service = class Module4Service {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getModule4(projectId) {
        const document = await this.prisma.document.findFirst({
            where: { projectId },
            select: { id: true, content: true },
        });
        if (!document) {
            throw new common_1.NotFoundException(`Document introuvable pour le projet ${projectId}`);
        }
        const content = document.content || {};
        return {
            documentId: document.id,
            module4: content.module4 || null,
        };
    }
    async getLibrary() {
        return {
            procedures: (0, module4_templates_1.getAllProcedures)().map(p => ({
                id: p.id,
                code: p.code,
                titleFR: p.titleFR,
                titleEN: p.titleEN,
                icon: p.icon,
                headerColor: p.headerColor,
                activationRule: p.activationRule,
                documentTypes: p.documentTypes,
                phase: p.phase,
                roleCount: p.roleSections.length,
            })),
        };
    }
    async saveModule4(projectId, dto) {
        const document = await this.prisma.document.findFirst({
            where: { projectId },
            select: { id: true, content: true },
        });
        if (!document) {
            throw new common_1.NotFoundException(`Document introuvable pour le projet ${projectId}`);
        }
        const existingContent = document.content || {};
        const updatedContent = {
            ...existingContent,
            module4: {
                customProcedureIds: dto.customProcedureIds || [],
                procedureOverrides: dto.procedureOverrides || {},
                updatedAt: new Date().toISOString(),
            },
        };
        await this.prisma.document.update({
            where: { id: document.id },
            data: { content: updatedContent },
        });
        return {
            success: true,
            message: 'Module 4 sauvegardé',
            updatedAt: updatedContent.module4.updatedAt,
        };
    }
};
exports.Module4Service = Module4Service;
exports.Module4Service = Module4Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], Module4Service);
//# sourceMappingURL=module4.service.js.map