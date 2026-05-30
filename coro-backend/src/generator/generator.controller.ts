import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GeneratorService } from './generator.service';

@Controller('generator')
@UseGuards(AuthGuard('jwt'))
export class GeneratorController {
  constructor(private generatorService: GeneratorService) {}

  @Post('generate/:projectId')
  generate(@Param('projectId') projectId: string, @Body() config: any) {
    return this.generatorService.generateAndSave(projectId, config);
  }

  @Get('document/:projectId')
  getDocument(@Param('projectId') projectId: string) {
    return this.generatorService.getDocument(projectId);
  }

  @Put('document/:documentId/module/:moduleId/section/:sectionId')
  updateSection(
    @Param('documentId') documentId: string,
    @Param('moduleId') moduleId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { content: string },
  ) {
    return this.generatorService.updateModuleContent(documentId, moduleId, sectionId, body.content);
  }
}