import { Controller, Get, Post, Param, Body, UseGuards, Request, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { ProjectFilesService } from './project-files.service';

@Controller('project-files/client')
@UseGuards(ClientJwtGuard)
export class ProjectFilesClientController {
  constructor(private projectFilesService: ProjectFilesService) {}

  @Get(':projectId')
  getFiles(
    @Param('projectId') projectId: string,
    @Query('visibility') visibility?: string,
  ) {
    return this.projectFilesService.getFilesForProject(projectId, visibility);
  }

  @Post(':projectId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { category: string; comment?: string },
    @Request() req: any,
  ) {
    return this.projectFilesService.uploadFile({
      projectId,
      organizationId: req.clientUser.organizationId,
      name: file.originalname,
      category: body.category || 'fichiers_client',
      buffer: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
      visibility: 'shared',
      uploadedByClientId: req.clientUser.sub,
    });
  }
}