import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { Module8Service } from './module8.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('projects/:projectId/module8')
@UseGuards(AuthGuard('jwt'))
export class Module8Controller {
  constructor(private readonly service: Module8Service) {}

  @Get()
  getData(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getData(projectId, req.user.organizationId);
  }

  @Put()
  saveData(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.saveData(projectId, dto, req.user.organizationId);
  }
}