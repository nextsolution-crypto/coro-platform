import { Controller, Get, Put, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module1TemplateService } from './module1-template.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';

@Controller('organizations/module1-template')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class Module1TemplateController {
  constructor(private readonly service: Module1TemplateService) {}

  @Get()
  async get(@Request() req: any) {
    return this.service.getTemplate(req.user.organizationId);
  }

  @Put()
  async save(@Request() req: any, @Body() body: { sections: any[] }) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return this.service.saveTemplate(req.user.organizationId, body.sections, req.user);
  }
}
