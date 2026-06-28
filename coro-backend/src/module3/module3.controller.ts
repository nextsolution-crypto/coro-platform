import {
  Controller, Get, Put, Param, Body, UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module3Service } from './module3.service';

@Controller('projects/:projectId/module3')
@UseGuards(AuthGuard('jwt'))
export class Module3Controller {

  constructor(private readonly module3Service: Module3Service) {}

  @Get()
  async getModule3(@Param('projectId') projectId: string, @Request() req: any) {
    return this.module3Service.getModule3(projectId, req.user.organizationId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async saveModule3(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.module3Service.saveModule3(projectId, dto, req.user.organizationId);
  }
}