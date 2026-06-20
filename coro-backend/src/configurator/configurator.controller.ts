import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfiguratorService } from './configurator.service';

@Controller('configurator')
@UseGuards(AuthGuard('jwt'))
export class ConfiguratorController {
  constructor(private configuratorService: ConfiguratorService) {}

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
}