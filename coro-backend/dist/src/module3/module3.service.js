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
exports.Module3Service = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let Module3Service = class Module3Service {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getModule3(projectId) {
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
            module3: content.module3 || null,
        };
    }
    async saveModule3(projectId, dto) {
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
            module3: {
                orgRoles: dto.orgRoles || [],
                members: dto.members || [],
                activeShifts: dto.activeShifts || ['jour'],
                customRoles: dto.customRoles || [],
                updatedAt: new Date().toISOString(),
            },
        };
        await this.prisma.document.update({
            where: { id: document.id },
            data: { content: updatedContent },
        });
        return {
            success: true,
            message: 'Module 3 sauvegardé',
            updatedAt: updatedContent.module3.updatedAt,
        };
    }
};
exports.Module3Service = Module3Service;
exports.Module3Service = Module3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], Module3Service);
//# sourceMappingURL=module3.service.js.map