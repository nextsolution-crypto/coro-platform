import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectFilesService } from './project-files.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { EvidenceReadAccess } from '../auth/organization-access.decorator';

@Controller('project-files')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class ProjectFilesController {
  constructor(private projectFilesService: ProjectFilesService) {}

  @Get('project/:projectId')
  @EvidenceReadAccess()
  getFiles(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Query('visibility') visibility?: string,
  ) {
    return this.projectFilesService.getFilesForProject(
      projectId,
      visibility,
      req.user.organizationId,
    );
  }

  @Post('project/:projectId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { category: string; visibility?: string; parentId?: string },
    @Request() req: any,
  ) {
    return this.projectFilesService.uploadFile({
      projectId,
      organizationId: req.user.organizationId,
      name: file.originalname,
      category: body.category || 'autre',
      buffer: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
      visibility: body.visibility || 'shared',
      uploadedById: req.user.userId,
      parentId: body.parentId,
    });
  }

  @Put(':id/review')
  requestReview(
    @Param('id') id: string,
    @Body() body: { reason: string; requestId: string; lockVersion: number },
    @Request() req: any,
  ) {
    return this.projectFilesService.requestReview({
      fileId: id,
      organizationId: req.user.organizationId,
      actorId: req.user.userId,
      ...body,
    });
  }

  @Put(':id/approve')
  approveFile(
    @Param('id') id: string,
    @Body()
    body: {
      reason: string;
      requestId: string;
      lockVersion: number;
      effectiveAt: string;
      expiresAt?: string;
    },
    @Request() req: any,
  ) {
    return this.projectFilesService.approveFile({
      fileId: id,
      organizationId: req.user.organizationId,
      actorId: req.user.userId,
      ...body,
    });
  }

  @Put(':id/revoke')
  revokeFile(
    @Param('id') id: string,
    @Body() body: { reason: string; requestId: string; lockVersion: number },
    @Request() req: any,
  ) {
    return this.projectFilesService.revokeFile({
      fileId: id,
      organizationId: req.user.organizationId,
      actorId: req.user.userId,
      ...body,
    });
  }

  @Put(':id/offline-classification')
  setOfflineClassification(
    @Param('id') id: string,
    @Body()
    body: {
      classification: 'PROHIBITED' | 'NON_SENSITIVE_EMERGENCY';
      reason: string;
      requestId: string;
      lockVersion: number;
    },
    @Request() req: any,
  ) {
    return this.projectFilesService.setOfflineClassification({
      fileId: id,
      organizationId: req.user.organizationId,
      actorId: req.user.userId,
      ...body,
    });
  }

  @Get(':id/download')
  @EvidenceReadAccess()
  getDownloadUrl(@Param('id') id: string, @Request() req: any) {
    return this.projectFilesService.getSignedUrl(id, req.user.organizationId);
  }

  @Get(':id/content')
  @EvidenceReadAccess()
  async downloadPrivate(@Param('id') id: string, @Request() req: any) {
    const file = await this.projectFilesService.downloadPrivateFile(
      id,
      req.user.organizationId,
    );
    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.name.replace(/["\r\n]/g, '_')}"`,
    });
  }

  @Get(':id/history')
  @EvidenceReadAccess()
  history(@Param('id') id: string, @Request() req: any) {
    return this.projectFilesService.getLifecycleHistory(
      id,
      req.user.organizationId,
    );
  }
}
