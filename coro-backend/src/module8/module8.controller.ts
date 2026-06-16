import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module8Service } from './module8.service';

@Controller('projects/:projectId/module8')
@UseGuards(AuthGuard('jwt'))
export class Module8Controller {
  constructor(private readonly service: Module8Service) {}

  @Get()
  getData(@Param('projectId') projectId: string) {
    return this.service.getData(projectId);
  }

  @Put()
  saveData(
    @Param('projectId') projectId: string,
    @Body() dto: any,
  ) {
    return this.service.saveData(projectId, dto);
  }
}