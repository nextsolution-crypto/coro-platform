"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Module4Module = void 0;
const common_1 = require("@nestjs/common");
const module4_controller_1 = require("./module4.controller");
const library_controller_1 = require("./library.controller");
const module4_service_1 = require("./module4.service");
const prisma_service_1 = require("../prisma/prisma.service");
let Module4Module = class Module4Module {
};
exports.Module4Module = Module4Module;
exports.Module4Module = Module4Module = __decorate([
    (0, common_1.Module)({
        controllers: [module4_controller_1.Module4Controller, library_controller_1.LibraryController],
        providers: [module4_service_1.Module4Service, prisma_service_1.PrismaService],
        exports: [module4_service_1.Module4Service],
    })
], Module4Module);
//# sourceMappingURL=module4.module.js.map