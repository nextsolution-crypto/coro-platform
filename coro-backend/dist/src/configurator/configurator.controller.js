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
exports.ConfiguratorController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const configurator_service_1 = require("./configurator.service");
let ConfiguratorController = class ConfiguratorController {
    configuratorService;
    constructor(configuratorService) {
        this.configuratorService = configuratorService;
    }
    getQuestions() {
        return this.configuratorService.getQuestions();
    }
    analyze(config) {
        return this.configuratorService.analyzeBuilding(config);
    }
    save(projectId, config) {
        return this.configuratorService.saveConfiguration(projectId, config);
    }
};
exports.ConfiguratorController = ConfiguratorController;
__decorate([
    (0, common_1.Get)('questions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfiguratorController.prototype, "getQuestions", null);
__decorate([
    (0, common_1.Post)('analyze'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConfiguratorController.prototype, "analyze", null);
__decorate([
    (0, common_1.Post)('save/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConfiguratorController.prototype, "save", null);
exports.ConfiguratorController = ConfiguratorController = __decorate([
    (0, common_1.Controller)('configurator'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [configurator_service_1.ConfiguratorService])
], ConfiguratorController);
//# sourceMappingURL=configurator.controller.js.map