import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
  ConfigureScenarioDto,
  ConvertScenarioDto,
  CreateCostAssumptionSetDto,
  CreateCostAssumptionVersionDto,
  CreateScenarioDto,
  CreateValuationAssumptionSetDto,
  CreateValuationAssumptionVersionDto,
  CreateWorkspaceDto,
  SelectScenarioDto,
} from './commercial-simulator.dto';

type RequestWithUser = { user: { id: string } };

@Controller('admin/v1/commercial/simulator')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialSimulatorController {
  constructor(private readonly service: CommercialSimulatorService) {}
  @Get('assumptions/cost') listCostAssumptions() {
    return this.service.listCostAssumptions();
  }
  @Post('assumptions/cost') createCostAssumptionSet(
    @Body() dto: CreateCostAssumptionSetDto,
  ) {
    return this.service.createCostAssumptionSet(dto);
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
  ) {
    return this.service.createValuationAssumptionSet(dto);
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
  @Post('workspaces/:workspaceId/scenarios') createScenario(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateScenarioDto,
  ) {
    return this.service.createScenario(workspaceId, dto);
  }
  @Put('workspaces/:workspaceId/scenarios/:scenarioId') configure(
    @Param('workspaceId') workspaceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: ConfigureScenarioDto,
  ) {
    return this.service.configureScenario(workspaceId, scenarioId, dto);
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
