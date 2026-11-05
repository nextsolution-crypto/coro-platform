import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import {
  CompletePilotRunDto,
  CreatePilotRunDto,
  CreatePilotScenarioDto,
  UpdatePilotCheckDto,
} from './pilot-scenario.dto';
import { PilotScenariosService } from './pilot-scenarios.service';

type AdminRequest = { user: { userId: string; role: string } };

@Controller('admin/v1/test-scenario-pilots')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class PilotScenariosController {
  constructor(private readonly scenarios: PilotScenariosService) {}

  @Get('eligible-targets')
  eligibleTargets() {
    return this.scenarios.eligibleTargets();
  }

  @Get()
  list() {
    return this.scenarios.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.scenarios.get(id);
  }

  @Post()
  create(
    @Body() body: CreatePilotScenarioDto,
    @Request() request: AdminRequest,
  ) {
    return this.scenarios.create(body, request.user);
  }

  @Post(':id/runs')
  createRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreatePilotRunDto,
    @Request() request: AdminRequest,
  ) {
    return this.scenarios.createRun(id, body, request.user);
  }

  @Patch(':id/runs/:runId/checks/:checkKey')
  updateCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Param('checkKey') checkKey: string,
    @Body() body: UpdatePilotCheckDto,
    @Request() request: AdminRequest,
  ) {
    return this.scenarios.updateCheck(id, runId, checkKey, body, request.user);
  }

  @Post(':id/runs/:runId/complete')
  completeRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() body: CompletePilotRunDto,
    @Request() request: AdminRequest,
  ) {
    return this.scenarios.completeRun(id, runId, body, request.user);
  }
}
