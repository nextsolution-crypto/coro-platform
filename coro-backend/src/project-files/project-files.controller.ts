import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectFilesService } from './project-files.service';

@Controller('project-files')
@UseGuards(AuthGuard('jwt'))
export class ProjectFilesController {
  constructor(private projectFilesService: ProjectFilesService) {}

  @Get('project/:projectId')
  getFiles(
    @Param('projectId') projectId: string,
    @Query('visibility') visibility?: string,
  ) {
    return this.projectFilesService.getFilesForProject(projectId, visibility);
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
      uploadedById: req.user.sub,
      parentId: body.parentId,
    });
  }

  @Put(':id/validate')
  validateFile(@Param('id') id: string) {
    return this.projectFilesService.validateFile(id);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string) {
    return this.projectFilesService.deleteFile(id);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.projectFilesService.getSignedUrl(id);
  }
}