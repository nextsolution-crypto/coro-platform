import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Module1TemplateController } from './module1-template.controller';
import { Module1TemplateService } from './module1-template.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController, Module1TemplateController],
  providers: [OrganizationsService, Module1TemplateService],
  exports: [OrganizationsService, Module1TemplateService],
})
export class OrganizationsModule {}