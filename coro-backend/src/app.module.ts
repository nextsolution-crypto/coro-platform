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
import { Module7Module } from './module7/module7.module';
import { Module8Module } from './module8/module8.module';
import { ExportModule } from './export/export.module';
import { LanguageCheckModule } from './language-check/language-check.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ChangelogModule } from './changelog/changelog.module';
import { ProceduresModule } from './procedures/procedures.module';
import { FeedbackModule } from './feedback/feedback.module';
import { VersionsModule } from './versions/versions.module';
import { TemplatesModule } from './templates/templates.module';
import { AuditModule } from './audit/audit.module';
import { ActivitiesModule } from './activities/activities.module';
import { MandateModule } from './mandate/mandate.module';
import { TaskTemplatesModule } from './task-templates/task-templates.module';
import { TaskListsModule } from './task-lists/task-lists.module';
import { TimelogModule } from './timelog/timelog.module';
import { GuideModule } from './guide/guide.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

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
  Module7Module,
  Module8Module,
  ExportModule,
  LanguageCheckModule,
  OrganizationsModule,
  ChangelogModule,
  ProceduresModule,
  FeedbackModule,
  VersionsModule,
  TemplatesModule,
  AuditModule,
  ActivitiesModule,
  MandateModule,
  TaskTemplatesModule,
  TaskListsModule,
  TimelogModule,
  GuideModule,
  ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 60000,    // 1 minute
      limit: 120,    // max 120 requêtes par minute par IP
    }, {
      name: 'long',
      ttl: 3600000,  // 1 heure
      limit: 2000,   // max 2000 requêtes par heure par IP
    }]),
],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}