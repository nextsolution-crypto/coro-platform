import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module7Service } from './module7.service';

@Controller('projects/:projectId/module7')
@UseGuards(AuthGuard('jwt'))
export class Module7Controller {
  constructor(private readonly service: Module7Service) {}

  @Get()
  getData(@Param('projectId') projectId: string) {
    return this.service.getData(projectId);
  }

  @Get('config')
  getConfig(@Param('projectId') projectId: string) {
    return this.service.getConfigForProject(projectId);
  }

  @Put()
  saveData(
    @Param('projectId') projectId: string,
    @Body() dto: any,
  ) {
    return this.service.saveData(projectId, dto);
  }
}