import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PcaConfiguratorService } from './pca-configurator.service';
import { OrganizationStatusGuard } from '../../auth/organization-status.guard';

@Controller('pca/configurator')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class PcaConfiguratorController {
  constructor(private readonly pcaConfiguratorService: PcaConfiguratorService) {}

  @Get(':projectId')
  async getConfig(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.getConfig(
      projectId,
      req.user,
    );
  }

  @Post(':projectId')
  async saveConfig(
    @Param('projectId') projectId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.saveConfig(
      projectId,
      req.user,
      data,
    );
  }

  @Get(':projectId/linked-pmu')
  async getLinkedPmu(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.getLinkedPmu(
      projectId,
      req.user,
    );
  }

  @Get(':projectId/procedures')
  async getProcedures(@Param('projectId') projectId: string, @Request() req: any) {
    return this.pcaConfiguratorService.getPcaProcedures(req.user, projectId);
  }

  @Put(':projectId/procedures/:procedureId/toggle')
  async toggleProcedure(
    @Param('projectId') projectId: string,
    @Param('procedureId') procedureId: string,
    @Body() body: { isActive: boolean },
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.togglePcaProcedure(req.user, projectId, procedureId, body.isActive);
  }

  @Put(':projectId/procedures/:procedureId')
  async updateProcedure(
    @Param('projectId') projectId: string,
    @Param('procedureId') procedureId: string,
    @Body() body: { content: any },
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.updatePcaProcedure(req.user, projectId, procedureId, body.content);
  }

  @Delete(':projectId/procedures/:procedureId')
  async restoreProcedure(
    @Param('projectId') projectId: string,
    @Param('procedureId') procedureId: string,
    @Request() req: any,
  ) {
    return this.pcaConfiguratorService.restorePcaProcedure(req.user, projectId, procedureId);
  }
}
