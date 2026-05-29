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
exports.LibraryController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const library_service_1 = require("./library.service");
let LibraryController = class LibraryController {
    libraryService;
    constructor(libraryService) {
        this.libraryService = libraryService;
    }
    getIncidentCodes() {
        return this.libraryService.getIncidentCodes();
    }
    getRoles() {
        return this.libraryService.getRoles();
    }
    getProcedures() {
        return this.libraryService.getProcedures();
    }
    createProcedure(body) {
        return this.libraryService.createProcedure(body);
    }
    updateProcedure(id, body) {
        return this.libraryService.updateProcedure(id, body);
    }
};
exports.LibraryController = LibraryController;
__decorate([
    (0, common_1.Get)('incident-codes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "getIncidentCodes", null);
__decorate([
    (0, common_1.Get)('roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "getRoles", null);
__decorate([
    (0, common_1.Get)('procedures'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "getProcedures", null);
__decorate([
    (0, common_1.Post)('procedures'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "createProcedure", null);
__decorate([
    (0, common_1.Put)('procedures/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LibraryController.prototype, "updateProcedure", null);
exports.LibraryController = LibraryController = __decorate([
    (0, common_1.Controller)('library'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [library_service_1.LibraryService])
], LibraryController);
//# sourceMappingURL=library.controller.js.map