import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VersionsService } from './versions.service';

@Controller('projects/:projectId/versions')
@UseGuards(AuthGuard('jwt'))
export class VersionsController {
  constructor(private versionsService: VersionsService) {}

  @Get()
  findAll(@Param('projectId') projectId: string) {
    return this.versionsService.findAll(projectId);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Body() body: { label?: string }) {
    return this.versionsService.create(projectId, body.label);
  }

  @Post(':versionId/restore')
  restore(@Param('projectId') projectId: string, @Param('versionId') versionId: string) {
    return this.versionsService.restore(projectId, versionId);
  }

  @Delete(':versionId')
  remove(@Param('projectId') projectId: string, @Param('versionId') versionId: string) {
    return this.versionsService.remove(projectId, versionId);
  }
}