"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Module8Module = void 0;
const common_1 = require("@nestjs/common");
const module8_controller_1 = require("./module8.controller");
const module8_service_1 = require("./module8.service");
const prisma_module_1 = require("../prisma/prisma.module");
let Module8Module = class Module8Module {
};
exports.Module8Module = Module8Module;
exports.Module8Module = Module8Module = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [module8_controller_1.Module8Controller],
        providers: [module8_service_1.Module8Service],
        exports: [module8_service_1.Module8Service],
    })
], Module8Module);
//# sourceMappingURL=module8.module.js.map