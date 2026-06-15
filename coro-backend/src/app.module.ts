import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { BuildingsModule } from './buildings/buildings.module';
import { ProjectsModule } from './projects/projects.module';
import { LibraryModule } from './library/library.module';
import { ConfiguratorModule } from './configurator/configurator.module';
import { GeneratorModule } from './generator/generator.module';
import { Module2Module } from './module2/module2.module';
import { Module3Module } from './module3/module3.module';
import { Module4Module } from './module4/module4.module';
import { BuildingPlansModule } from './building-plans/building-plans.module';

@Module({
  imports: [
  PrismaModule,
  AuthModule,
  UsersModule,
  ClientsModule,
  BuildingsModule,
  ProjectsModule,
  LibraryModule,
  ConfiguratorModule,
  GeneratorModule,
  Module2Module,
  Module3Module,
  Module4Module,
  BuildingPlansModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}