import {
  Controller, Get, Put, Param, Body, UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module4Service } from './module4.service';

@Controller('projects/:projectId/module4')
@UseGuards(AuthGuard('jwt'))
export class Module4Controller {

  constructor(private readonly module4Service: Module4Service) {}

  @Get()
  async getModule4(@Param('projectId') projectId: string, @Request() req: any) {
    return this.module4Service.getModule4(projectId, req.user.organizationId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async saveModule4(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.module4Service.saveModule4(projectId, dto, req.user.organizationId);
  }
}