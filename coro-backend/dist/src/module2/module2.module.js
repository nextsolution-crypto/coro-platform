"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Module2Module = void 0;
const common_1 = require("@nestjs/common");
const module2_controller_1 = require("./module2.controller");
const module2_service_1 = require("./module2.service");
const prisma_service_1 = require("../prisma/prisma.service");
let Module2Module = class Module2Module {
};
exports.Module2Module = Module2Module;
exports.Module2Module = Module2Module = __decorate([
    (0, common_1.Module)({
        controllers: [module2_controller_1.Module2Controller],
        providers: [module2_service_1.Module2Service, prisma_service_1.PrismaService],
        exports: [module2_service_1.Module2Service],
    })
], Module2Module);
//# sourceMappingURL=module2.module.js.map