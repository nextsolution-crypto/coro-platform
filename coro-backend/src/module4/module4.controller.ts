import {
  Controller, Get, Put, Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module4Service } from './module4.service';

@Controller('projects/:projectId/module4')
@UseGuards(AuthGuard('jwt'))
export class Module4Controller {

  constructor(private readonly module4Service: Module4Service) {}

  @Get()
  async getModule4(@Param('projectId') projectId: string) {
    return this.module4Service.getModule4(projectId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async saveModule4(
    @Param('projectId') projectId: string,
    @Body() dto: any,
  ) {
    return this.module4Service.saveModule4(projectId, dto);
  }
}