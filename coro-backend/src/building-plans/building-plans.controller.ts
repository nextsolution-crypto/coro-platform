import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, UseGuards, HttpCode, HttpStatus, Request
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingPlansService } from './building-plans.service';

@Controller('projects/:projectId/building-plans')
@UseGuards(AuthGuard('jwt'))
export class BuildingPlansController {
  constructor(private readonly service: BuildingPlansService) {}

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.findAll(projectId, req.user.organizationId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.create(projectId, dto, req.user.organizationId);
  }

  @Put(':planId')
  update(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.update(projectId, planId, dto, req.user.organizationId);
  }

  @Delete(':planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Request() req: any,
  ) {
    return this.service.remove(projectId, planId, req.user.organizationId);
  }

  @Patch(':planId/reorder')
  reorder(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Body() dto: { order: number },
    @Request() req: any,
  ) {
    return this.service.reorder(projectId, planId, dto.order, req.user.organizationId);
  }
}