import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GeneratorService } from './generator.service';

@Controller('generator')
@UseGuards(AuthGuard('jwt'))
export class GeneratorController {
  constructor(private generatorService: GeneratorService) {}

  @Post('generate/:projectId')
  generate(@Param('projectId') projectId: string, @Body() config: any, @Request() req: any) {
    return this.generatorService.generateAndSave(projectId, config, req.user.organizationId, req.user.userId);
  }

  @Get('document/:projectId')
  getDocument(@Param('projectId') projectId: string, @Request() req: any) {
    return this.generatorService.getDocument(projectId, req.user.organizationId);
  }

  @Put('document/:documentId/module/:moduleId/section/:sectionId')
updateSection(
  @Param('documentId') documentId: string,
  @Param('moduleId') moduleId: string,
  @Param('sectionId') sectionId: string,
  @Body() body: { content: string; language?: string },
  @Request() req: any,
) {
  return this.generatorService.updateModuleContent(
    documentId, moduleId, sectionId, body.content, body.language || 'fr', req.user.organizationId
  );
}
}