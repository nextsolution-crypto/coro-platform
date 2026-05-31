"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Module3Module = void 0;
const common_1 = require("@nestjs/common");
const module3_controller_1 = require("./module3.controller");
const module3_service_1 = require("./module3.service");
const prisma_service_1 = require("../prisma/prisma.service");
let Module3Module = class Module3Module {
};
exports.Module3Module = Module3Module;
exports.Module3Module = Module3Module = __decorate([
    (0, common_1.Module)({
        controllers: [module3_controller_1.Module3Controller],
        providers: [module3_service_1.Module3Service, prisma_service_1.PrismaService],
        exports: [module3_service_1.Module3Service],
    })
], Module3Module);
//# sourceMappingURL=module3.module.js.map