import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePilotCheckDto } from './pilot-scenario.dto';
import { PilotScenariosService } from './pilot-scenarios.service';

type TenantRequest = {
  user: {
    userId: string;
    role: string;
    organizationId: string;
  };
};

@Controller('pilot-scenarios')
@UseGuards(AuthGuard('jwt'))
export class TenantPilotScenariosController {
  constructor(private readonly scenarios: PilotScenariosService) {}

  @Get()
  list(@Request() request: TenantRequest) {
    return this.scenarios.listForTenant(request.user);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() request: TenantRequest,
  ) {
    return this.scenarios.getForTenant(id, request.user);
  }

  @Patch(':id/runs/:runId/checks/:checkKey')
  updateCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Param('checkKey') checkKey: string,
    @Body() body: UpdatePilotCheckDto,
    @Request() request: TenantRequest,
  ) {
    return this.scenarios.updateCheckForTenant(
      id,
      runId,
      checkKey,
      body,
      request.user,
    );
  }
}
