import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module7Service } from './module7.service';

@Controller('projects/:projectId/module7')
@UseGuards(AuthGuard('jwt'))
export class Module7Controller {
  constructor(private readonly service: Module7Service) {}

  @Get()
  getData(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getData(projectId, req.user.organizationId);
  }

  @Get('config')
  getConfig(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getConfigForProject(projectId, req.user.organizationId);
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