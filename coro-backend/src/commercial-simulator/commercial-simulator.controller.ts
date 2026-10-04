import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { CommercialSimulatorService } from './commercial-simulator.service';
import {
  AssumptionTransitionDto,
  CalculateScenarioDto,
  ConfiguratorPriceBookQueryDto,
  ConfiguratorTargetQueryDto,
  ConfigureScenarioDto,
  ConvertScenarioDto,
  CreateCostAssumptionSetDto,
  CreateCostAssumptionVersionDto,
  CreateGuidedWorkspaceDto,
  CreateScenarioDto,
  CreateValuationAssumptionSetDto,
  CreateValuationAssumptionVersionDto,
  CreateWorkspaceDto,
  SelectScenarioDto,
  GuidedConfigureScenarioDto,
  ScenarioMutationDto,
  UpdateScenarioMetadataDto,
  UpdateAssumptionVersionDto,
} from './commercial-simulator.dto';

type RequestWithUser = { user: { id: string } };

@Controller('admin/v1/commercial/simulator')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialSimulatorController {
  constructor(private readonly service: CommercialSimulatorService) {}
  @Get('configurator/bootstrap') configuratorBootstrap() {
    return this.service.configuratorBootstrap();
  }
  @Get('configurator/targets/organizations') configuratorOrganizations(
    @Query() query: ConfiguratorTargetQueryDto,
  ) {
    return this.service.configuratorOrganizations(query);
  }
  @Get('configurator/targets/prospects') configuratorProspects(
    @Query() query: ConfiguratorTargetQueryDto,
  ) {
    return this.service.configuratorProspects(query);
  }
  @Get('configurator/price-books') configuratorPriceBooks(
    @Query() query: ConfiguratorPriceBookQueryDto,
  ) {
    return this.service.configuratorPriceBooks(query);
  }
  @Post('configurator/workspaces') createGuidedWorkspace(
    @Body() dto: CreateGuidedWorkspaceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createGuidedWorkspace(dto, { userId: req.user.id });
  }
  @Get('assumptions/cost') listCostAssumptions() {
    return this.service.listCostAssumptions();
  }
  @Get('assumptions/cost/definitions') costAssumptionDefinitions() {
    return this.service.costAssumptionDefinitions();
  }
  @Post('assumptions/cost') createCostAssumptionSet(
    @Body() dto: CreateCostAssumptionSetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createCostAssumptionSet(dto, { userId: req.user.id });
  }
  @Put('assumptions/cost/versions/:versionId') updateCostAssumptionVersion(
    @Param('versionId') versionId: string,
    @Body() dto: UpdateAssumptionVersionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateAssumptionVersion('cost', versionId, dto, {
      userId: req.user.id,
    });
  }
  @Post('assumptions/cost/:setId/versions') createCostAssumptionVersion(
    @Param('setId') setId: string,
    @Body() dto: CreateCostAssumptionVersionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createCostAssumptionVersion(setId, dto, {
      userId: req.user.id,
    });
  }
  @Post('assumptions/cost/versions/:versionId/:transition')
  transitionCostAssumption(
    @Param('versionId') versionId: string,
    @Param('transition') transition: 'publish' | 'archive',
    @Body() dto: AssumptionTransitionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.transitionAssumption(
      'cost',
      versionId,
      transition,
      dto.reason,
      { userId: req.user.id },
    );
  }
  @Get('assumptions/valuation') listValuationAssumptions() {
    return this.service.listValuationAssumptions();
  }
  @Post('assumptions/valuation') createValuationAssumptionSet(
    @Body() dto: CreateValuationAssumptionSetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createValuationAssumptionSet(dto, {
      userId: req.user.id,
    });
  }
  @Put('assumptions/valuation/versions/:versionId')
  updateValuationAssumptionVersion(
    @Param('versionId') versionId: string,
    @Body() dto: UpdateAssumptionVersionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateAssumptionVersion('valuation', versionId, dto, {
      userId: req.user.id,
    });
  }
  @Post('assumptions/valuation/:setId/versions')
  createValuationAssumptionVersion(
    @Param('setId') setId: string,
    @Body() dto: CreateValuationAssumptionVersionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createValuationAssumptionVersion(setId, dto, {
      userId: req.user.id,
    });
  }
  @Post('assumptions/valuation/versions/:versionId/:transition')
  transitionValuationAssumption(
    @Param('versionId') versionId: string,
    @Param('transition') transition: 'publish' | 'archive',
    @Body() dto: AssumptionTransitionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.transitionAssumption(
      'valuation',
      versionId,
      transition,
      dto.reason,
      { userId: req.user.id },
    );
  }
  @Get('workspaces') list() {
    return this.service.listWorkspaces();
  }
  @Post('workspaces') create(
    @Body() dto: CreateWorkspaceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createWorkspace(dto, { userId: req.user.id });
  }
  @Get('workspaces/:workspaceId') get(
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.getWorkspace(workspaceId);
  }
  @Get('configurator/workspaces/:workspaceId') getGuidedWorkspace(
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.getGuidedWorkspace(workspaceId);
  }
  @Get('configurator/workspaces/:workspaceId/catalog') guidedCatalog(
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.guidedCatalog(workspaceId);
  }
  @Post('configurator/workspaces/:workspaceId/scenarios') createGuidedScenario(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createScenario(workspaceId, dto, {
      userId: req.user.id,
    });
  }
  @Put('configurator/workspaces/:workspaceId/scenarios/:scenarioId/metadata')
  updateGuidedScenarioMetadata(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateScenarioMetadataDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateScenarioMetadata(workspaceId, scenarioId, dto, {
      userId: req.user.id,
    });
  }
  @Put('configurator/workspaces/:workspaceId/scenarios/:scenarioId')
  configureGuidedScenario(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: GuidedConfigureScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.configureGuidedScenario(workspaceId, scenarioId, dto, {
      userId: req.user.id,
    });
  }
  @Post('configurator/workspaces/:workspaceId/scenarios/:scenarioId/duplicate')
  duplicateGuidedScenario(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.duplicateScenario(workspaceId, scenarioId, {
      userId: req.user.id,
    });
  }
  @Post('configurator/workspaces/:workspaceId/scenarios/:scenarioId/archive')
  archiveGuidedScenario(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: ScenarioMutationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.archiveScenario(workspaceId, scenarioId, dto, {
      userId: req.user.id,
    });
  }
  @Post('workspaces/:workspaceId/scenarios') createScenario(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.createScenario(workspaceId, dto, {
      userId: req.user.id,
    });
  }
  @Put('workspaces/:workspaceId/scenarios/:scenarioId') configure(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: ConfigureScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.configureScenario(workspaceId, scenarioId, dto, {
      userId: req.user.id,
    });
  }
  @Post('workspaces/:workspaceId/select') select(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: SelectScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.selectScenario(workspaceId, dto, {
      userId: req.user.id,
    });
  }
  @Get('workspaces/:workspaceId/compare') compare(
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.compare(workspaceId);
  }
  @Post('workspaces/:workspaceId/scenarios/:scenarioId/calculate') calculate(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CalculateScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.calculate(workspaceId, scenarioId, dto, {
      userId: req.user.id,
    });
  }
  @Post('configurator/workspaces/:workspaceId/scenarios/:scenarioId/calculate')
  calculateGuided(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CalculateScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.calculateGuided(workspaceId, scenarioId, dto, {
      userId: req.user.id,
    });
  }
  @Post(
    'configurator/workspaces/:workspaceId/scenarios/:scenarioId/runs/:runId/convert',
  )
  convertGuided(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('runId') runId: string,
    @Body() dto: ConvertScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.convertGuided(workspaceId, scenarioId, runId, dto, {
      userId: req.user.id,
    });
  }
  @Post('workspaces/:workspaceId/scenarios/:scenarioId/runs/:runId/convert')
  convert(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('runId') runId: string,
    @Body() dto: ConvertScenarioDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.convert(workspaceId, scenarioId, runId, dto, {
      userId: req.user.id,
    });
  }
}
