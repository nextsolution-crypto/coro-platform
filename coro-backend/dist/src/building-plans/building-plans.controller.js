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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingPlansController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const building_plans_service_1 = require("./building-plans.service");
let BuildingPlansController = class BuildingPlansController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(projectId) {
        return this.service.findAll(projectId);
    }
    create(projectId, dto) {
        return this.service.create(projectId, dto);
    }
    update(projectId, planId, dto) {
        return this.service.update(projectId, planId, dto);
    }
    remove(projectId, planId) {
        return this.service.remove(projectId, planId);
    }
    reorder(projectId, planId, dto) {
        return this.service.reorder(projectId, planId, dto.order);
    }
};
exports.BuildingPlansController = BuildingPlansController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BuildingPlansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BuildingPlansController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':planId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('planId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], BuildingPlansController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':planId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BuildingPlansController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':planId/reorder'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('planId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], BuildingPlansController.prototype, "reorder", null);
exports.BuildingPlansController = BuildingPlansController = __decorate([
    (0, common_1.Controller)('projects/:projectId/building-plans'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [building_plans_service_1.BuildingPlansService])
], BuildingPlansController);
//# sourceMappingURL=building-plans.controller.js.map