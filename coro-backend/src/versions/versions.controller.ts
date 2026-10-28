import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VersionsService } from './versions.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';

@Controller('projects/:projectId/versions')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class VersionsController {
  constructor(private versionsService: VersionsService) {}

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.versionsService.findAll(projectId, req.user);
  }

  @Get(':versionId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Request() req: any,
  ) {
    return this.versionsService.findOne(projectId, versionId, req.user);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() body: { label?: string; expectedLockVersion?: number } | undefined,
    @Request() req: any,
  ) {
    return this.versionsService.create(
      projectId,
      body?.label,
      body?.expectedLockVersion,
      req.user,
    );
  }

  @Post(':versionId/restore')
  restore(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Body() body: { expectedLockVersion?: number } | undefined,
    @Request() req: any,
  ) {
    return this.versionsService.restore(
      projectId,
      versionId,
      body?.expectedLockVersion,
      req.user,
    );
  }

  @Delete(':versionId')
  remove(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Body() body: { expectedLockVersion?: number } | undefined,
    @Request() req: any,
  ) {
    return this.versionsService.remove(
      projectId,
      versionId,
      body?.expectedLockVersion,
      req.user,
    );
  }
}
