import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingPlansService } from './building-plans.service';

@Controller('projects/:projectId/building-plans')
@UseGuards(AuthGuard('jwt'))
export class BuildingPlansController {
  constructor(private readonly service: BuildingPlansService) {}

  @Get()
  findAll(@Param('projectId') projectId: string) {
    return this.service.findAll(projectId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: any,
  ) {
    return this.service.create(projectId, dto);
  }

  @Put(':planId')
  update(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Body() dto: any,
  ) {
    return this.service.update(projectId, planId, dto);
  }

  @Delete(':planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
  ) {
    return this.service.remove(projectId, planId);
  }

  @Patch(':planId/reorder')
  reorder(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Body() dto: { order: number },
  ) {
    return this.service.reorder(projectId, planId, dto.order);
  }
}