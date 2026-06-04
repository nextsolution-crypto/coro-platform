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
exports.BuildingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BuildingsService = class BuildingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(clientId) {
        return this.prisma.building.findMany({
            where: { isActive: true, ...(clientId && { clientId }) },
            orderBy: { createdAt: 'desc' },
            include: {
                client: { select: { id: true, name: true } },
                _count: { select: { projects: true } },
            },
        });
    }
    async findOne(id) {
        return this.prisma.building.findUnique({
            where: { id },
            include: { client: true, projects: true },
        });
    }
    async findProjects(buildingId) {
        return this.prisma.project.findMany({
            where: { buildingId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                documentType: true,
                year: true,
                status: true,
                updatedAt: true,
            },
        });
    }
    async create(data) {
        return this.prisma.building.create({ data });
    }
    async update(id, data) {
        return this.prisma.building.update({ where: { id }, data });
    }
    async remove(id) {
        return this.prisma.building.update({
            where: { id },
            data: { isActive: false },
        });
    }
};
exports.BuildingsService = BuildingsService;
exports.BuildingsService = BuildingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BuildingsService);
//# sourceMappingURL=buildings.service.js.map