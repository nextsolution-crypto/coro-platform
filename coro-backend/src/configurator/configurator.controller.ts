import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfiguratorService } from './configurator.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { ImportService } from './import.service';

@Controller('configurator')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class ConfiguratorController {
  constructor(
    private configuratorService: ConfiguratorService,
    private importService: ImportService,
  ) {}

  @Get('questions')
  getQuestions() {
    return this.configuratorService.getQuestions();
  }

  @Post('analyze')
  analyze(@Body() config: any) {
    return this.configuratorService.analyzeBuilding(config);
  }

  @Post('save/:projectId')
  save(@Param('projectId') projectId: string, @Body() config: any) {
    return this.configuratorService.saveConfiguration(projectId, config);
  }

  @Get('load/:projectId')
  load(@Param('projectId') projectId: string) {
    return this.configuratorService.getConfiguration(projectId);
  }

  @Post('import-word')
  importWord(@Body() dto: { base64: string }) {
    return this.importService.importDocument(dto.base64);
  }
}
