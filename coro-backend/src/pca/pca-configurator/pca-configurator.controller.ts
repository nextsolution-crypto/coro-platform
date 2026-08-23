import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PcaConfiguratorService } from './pca-configurator.service';

@Controller('pca/configurator')
@UseGuards(AuthGuard('jwt'))
export class PcaConfiguratorController {
  constructor(private readonly pcaConfiguratorService: PcaConfiguratorService) {}

  @Get(':projectId')
  async getConfig(@Param('projectId') projectId: string) {
    return this.pcaConfiguratorService.getConfig(projectId);
  }

  @Post(':projectId')
  async saveConfig(
    @Param('projectId') projectId: string,
    @Body() data: any,
  ) {
    return this.pcaConfiguratorService.saveConfig(projectId, data);
  }

  @Get(':projectId/linked-pmu')
  async getLinkedPmu(@Param('projectId') projectId: string) {
    return this.pcaConfiguratorService.getLinkedPmu(projectId);
  }

  @Get(':projectId/procedures')
  async getProcedures(@Param('projectId') projectId: string, @Request() req: any) {
    return this.pcaConfiguratorService.getPcaProcedures(req.user.organizationId, projectId);
  }

  @Put(':projectId/procedures/:procedureId/toggle')
  async toggleProcedure(
    @Param('projectId') projectId: string,
    @Param('procedureId') procedureId: string,
    @Body() body: { isActive: boolean },
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.togglePcaProcedure(req.user.organizationId, projectId, procedureId, body.isActive);
  }

  @Put(':projectId/procedures/:procedureId')
  async updateProcedure(
    @Param('projectId') projectId: string,
    @Param('procedureId') procedureId: string,
    @Body() body: { content: any },
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.updatePcaProcedure(req.user.organizationId, projectId, procedureId, body.content);
  }

  @Delete(':projectId/procedures/:procedureId')
  async restoreProcedure(
    @Param('projectId') projectId: string,
    @Param('procedureId') procedureId: string,
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.restorePcaProcedure(req.user.organizationId, projectId, procedureId);
  }
}