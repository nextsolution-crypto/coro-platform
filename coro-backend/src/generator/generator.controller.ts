import { Controller, Post, Get, Put, Body, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GeneratorService } from './generator.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { ValidationService } from './validation.service';

@Controller('generator')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class GeneratorController {
  constructor(
    private generatorService: GeneratorService,
    private validationService: ValidationService,
  ) {}

  @Post('generate/:projectId')
  generate(
    @Param('projectId') projectId: string,
    @Body() config: any,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-expected-document-version') expectedVersion: string | undefined,
    @Request() req: any,
  ) {
    return this.generatorService.generateAndSave(projectId, config, req.user, {
      idempotencyKey,
      expectedDocumentVersion: expectedVersion,
    });
  }

  @Get('document/:projectId')
  getDocument(@Param('projectId') projectId: string, @Request() req: any) {
    return this.generatorService.getDocument(projectId, req.user);
  }

  @Put('document/:documentId/module/:moduleId/section/:sectionId')
  updateSection(
    @Param('documentId') documentId: string,
    @Param('moduleId') moduleId: string,
    @Param('sectionId') sectionId: string,
    @Body()
    body: { content: string; language?: string; expectedLockVersion: number },
    @Request() req: any,
  ) {
    return this.generatorService.updateModuleContent(
      documentId,
      moduleId,
      sectionId,
      body.content,
      body.language || 'fr',
      body.expectedLockVersion,
      req.user,
    );
  }

  @Get('validate/:projectId')
  validate(@Param('projectId') projectId: string, @Request() req: any) {
    return this.validationService.validate(projectId, req.user);
  }
}
