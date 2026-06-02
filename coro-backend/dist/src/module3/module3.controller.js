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
exports.Module3Controller = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const module3_service_1 = require("./module3.service");
let Module3Controller = class Module3Controller {
    module3Service;
    constructor(module3Service) {
        this.module3Service = module3Service;
    }
    async getModule3(projectId) {
        return this.module3Service.getModule3(projectId);
    }
    async saveModule3(projectId, dto) {
        return this.module3Service.saveModule3(projectId, dto);
    }
};
exports.Module3Controller = Module3Controller;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Module3Controller.prototype, "getModule3", null);
__decorate([
    (0, common_1.Put)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], Module3Controller.prototype, "saveModule3", null);
exports.Module3Controller = Module3Controller = __decorate([
    (0, common_1.Controller)('projects/:projectId/module3'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [module3_service_1.Module3Service])
], Module3Controller);
//# sourceMappingURL=module3.controller.js.map