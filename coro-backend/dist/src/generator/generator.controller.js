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
exports.GeneratorController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const generator_service_1 = require("./generator.service");
let GeneratorController = class GeneratorController {
    generatorService;
    constructor(generatorService) {
        this.generatorService = generatorService;
    }
    generate(projectId, config) {
        return this.generatorService.generateDocumentStructure(projectId, config);
    }
    getModule1(projectId, config) {
        return this.generatorService.getModule1Preview(projectId, config);
    }
};
exports.GeneratorController = GeneratorController;
__decorate([
    (0, common_1.Post)('generate/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GeneratorController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('module1/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GeneratorController.prototype, "getModule1", null);
exports.GeneratorController = GeneratorController = __decorate([
    (0, common_1.Controller)('generator'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [generator_service_1.GeneratorService])
], GeneratorController);
//# sourceMappingURL=generator.controller.js.map