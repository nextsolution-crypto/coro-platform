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
exports.Module2Controller = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const module2_service_1 = require("./module2.service");
const save_module2_dto_1 = require("./dto/save-module2.dto");
let Module2Controller = class Module2Controller {
    module2Service;
    constructor(module2Service) {
        this.module2Service = module2Service;
    }
    async getModule2(projectId) {
        return this.module2Service.getModule2(projectId);
    }
    async saveModule2(projectId, dto) {
        return this.module2Service.saveModule2(projectId, dto);
    }
};
exports.Module2Controller = Module2Controller;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Module2Controller.prototype, "getModule2", null);
__decorate([
    (0, common_1.Put)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_module2_dto_1.SaveModule2Dto]),
    __metadata("design:returntype", Promise)
], Module2Controller.prototype, "saveModule2", null);
exports.Module2Controller = Module2Controller = __decorate([
    (0, common_1.Controller)('projects/:projectId/module2'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [module2_service_1.Module2Service])
], Module2Controller);
//# sourceMappingURL=module2.controller.js.map