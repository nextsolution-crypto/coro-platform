"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const clients_module_1 = require("./clients/clients.module");
const buildings_module_1 = require("./buildings/buildings.module");
const projects_module_1 = require("./projects/projects.module");
const library_module_1 = require("./library/library.module");
const configurator_module_1 = require("./configurator/configurator.module");
const generator_module_1 = require("./generator/generator.module");
const module2_module_1 = require("./module2/module2.module");
const module3_module_1 = require("./module3/module3.module");
const module4_module_1 = require("./module4/module4.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            clients_module_1.ClientsModule,
            buildings_module_1.BuildingsModule,
            projects_module_1.ProjectsModule,
            library_module_1.LibraryModule,
            configurator_module_1.ConfiguratorModule,
            generator_module_1.GeneratorModule,
            module2_module_1.Module2Module,
            module3_module_1.Module3Module,
            module4_module_1.Module4Module,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map