import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GeneratorService } from './generator.service';

@Controller('generator')
@UseGuards(AuthGuard('jwt'))
export class GeneratorController {
  constructor(private generatorService: GeneratorService) {}

  @Post('generate/:projectId')
  generate(@Param('projectId') projectId: string, @Body() config: any) {
    return this.generatorService.generateDocumentStructure(projectId, config);
  }

  @Post('module1/:projectId')
  getModule1(@Param('projectId') projectId: string, @Body() config: any) {
    return this.generatorService.getModule1Preview(projectId, config);
  }
}