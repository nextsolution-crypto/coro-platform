import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module1TemplateService } from './module1-template.service';

@Controller('organizations/module1-template')
@UseGuards(AuthGuard('jwt'))
export class Module1TemplateController {
  constructor(private readonly service: Module1TemplateService) {}

  @Get()
  async get(@Request() req: any) {
    return this.service.getTemplate(req.user.organizationId);
  }

  @Put()
  async save(@Request() req: any, @Body() body: { sections: any[] }) {
    return this.service.saveTemplate(req.user.organizationId, body.sections);
  }
}