import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, UseGuards, HttpCode, HttpStatus, Request, StreamableFile
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingPlansService } from './building-plans.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';

@Controller('projects/:projectId/building-plans')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class BuildingPlansController {
  constructor(private readonly service: BuildingPlansService) {}

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.findAll(projectId, req.user);
  }

  /** PDF du plan, pour l'ouvrir depuis l'éditeur (mêmes droits de lecture que la liste). */
  @Get(':planId/file')
  async file(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Request() req: any,
  ) {
    const plan = await this.service.findOne(projectId, planId, req.user);
    const base64 = plan.fileBase64.includes(',')
      ? plan.fileBase64.slice(plan.fileBase64.indexOf(',') + 1)
      : plan.fileBase64;
    const safeName = (plan.fileName || 'plan.pdf').replace(/[^\w.\- ]+/g, '_');
    return new StreamableFile(Buffer.from(base64, 'base64'), {
      type: 'application/pdf',
      disposition: `inline; filename="${safeName}"`,
    });
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.create(projectId, dto, req.user);
  }

  @Put(':planId')
  update(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.update(projectId, planId, dto, req.user);
  }

  @Delete(':planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Request() req: any,
  ) {
    return this.service.remove(projectId, planId, req.user);
  }

  @Patch(':planId/reorder')
  reorder(
    @Param('projectId') projectId: string,
    @Param('planId') planId: string,
    @Body() dto: { order: number },
    @Request() req: any,
  ) {
    return this.service.reorder(projectId, planId, dto.order, req.user);
  }
}
