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
exports.Module4Controller = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const module4_service_1 = require("./module4.service");
let Module4Controller = class Module4Controller {
    module4Service;
    constructor(module4Service) {
        this.module4Service = module4Service;
    }
    async getModule4(projectId) {
        return this.module4Service.getModule4(projectId);
    }
    async saveModule4(projectId, dto) {
        return this.module4Service.saveModule4(projectId, dto);
    }
};
exports.Module4Controller = Module4Controller;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Module4Controller.prototype, "getModule4", null);
__decorate([
    (0, common_1.Put)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], Module4Controller.prototype, "saveModule4", null);
exports.Module4Controller = Module4Controller = __decorate([
    (0, common_1.Controller)('projects/:projectId/module4'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [module4_service_1.Module4Service])
], Module4Controller);
//# sourceMappingURL=module4.controller.js.map