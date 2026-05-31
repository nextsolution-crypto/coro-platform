import {
  Controller, Get, Put, Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module3Service } from './module3.service';

@Controller('projects/:projectId/module3')
@UseGuards(AuthGuard('jwt'))
export class Module3Controller {

  constructor(private readonly module3Service: Module3Service) {}

  @Get()
  async getModule3(@Param('projectId') projectId: string) {
    return this.module3Service.getModule3(projectId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async saveModule3(
    @Param('projectId') projectId: string,
    @Body() dto: any,
  ) {
    return this.module3Service.saveModule3(projectId, dto);
  }
}