import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import type { SpatialActor } from '../spatial/spatial-authorization.service';
import {
  AcknowledgeDisplayCommandDto,
  DisplayCommandPollDto,
  IssueDisplayOperationalCommandDto,
} from './dto/display-orchestration.dto';
import { DisplayOrchestrationService } from './display-orchestration.service';

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller()
export class DisplayOrchestrationController {
  constructor(private readonly service: DisplayOrchestrationService) {}

  @Post(
    'organizations/:organizationId/buildings/:buildingId/display-operations/commands',
  )
  @UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
  issue(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: IssueDisplayOperationalCommandDto,
  ) {
    return this.service.issue(organizationId, buildingId, req.user, dto);
  }

  @Get(
    'organizations/:organizationId/buildings/:buildingId/display-operations/supervision',
  )
  @UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
  supervision(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Request() req: { user: SpatialActor },
  ) {
    return this.service.supervision(organizationId, buildingId, req.user);
  }

  @Post('device-gateway/commands')
  poll(@Body() dto: DisplayCommandPollDto) {
    return this.service.poll(dto);
  }

  @Post('device-gateway/commands/ack')
  acknowledge(@Body() dto: AcknowledgeDisplayCommandDto) {
    return this.service.acknowledge(dto);
  }
}
