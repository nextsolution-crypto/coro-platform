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
exports.Module2Service = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let Module2Service = class Module2Service {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getModule2(projectId) {
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
            module2: content.module2 || null,
        };
    }
    async saveModule2(projectId, dto) {
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
            module2: {
                section2_1: dto.section2_1,
                section2_2: dto.section2_2,
                section2_3: dto.section2_3,
                section2_4: dto.section2_4,
                updatedAt: new Date().toISOString(),
            },
        };
        await this.prisma.document.update({
            where: { id: document.id },
            data: { content: updatedContent },
        });
        return {
            success: true,
            message: 'Module 2 sauvegardé',
            updatedAt: updatedContent.module2.updatedAt,
        };
    }
};
exports.Module2Service = Module2Service;
exports.Module2Service = Module2Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], Module2Service);
//# sourceMappingURL=module2.service.js.map