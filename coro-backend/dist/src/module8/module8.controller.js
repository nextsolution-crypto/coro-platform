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
exports.Module8Controller = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const module8_service_1 = require("./module8.service");
let Module8Controller = class Module8Controller {
    service;
    constructor(service) {
        this.service = service;
    }
    getData(projectId) {
        return this.service.getData(projectId);
    }
    saveData(projectId, dto) {
        return this.service.saveData(projectId, dto);
    }
};
exports.Module8Controller = Module8Controller;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Module8Controller.prototype, "getData", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], Module8Controller.prototype, "saveData", null);
exports.Module8Controller = Module8Controller = __decorate([
    (0, common_1.Controller)('projects/:projectId/module8'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [module8_service_1.Module8Service])
], Module8Controller);
//# sourceMappingURL=module8.controller.js.map