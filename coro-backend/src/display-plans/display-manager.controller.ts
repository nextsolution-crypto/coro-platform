import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import type { SpatialActor } from '../spatial/spatial-authorization.service';
import { DisplayManagerService } from './display-manager.service';
import { DisplayObservationWorkflowService } from './display-observation-workflow.service';
import { DeviceAdministrationService } from '../display-device/device-administration.service';
import {
  AssignDisplayDeviceDto,
  CreateDisplayDeviceDto,
  DisplayDeviceHistoryQueryDto,
  InviteDisplayDeviceDto,
  TransitionDisplayDeviceDto,
} from '../display-device/dto/device-administration.dto';
import {
  AssignDisplayObservationDto,
  DisplayObservationListQueryDto,
  MessageDisplayObservationDto,
  QualifyDisplayObservationDto,
  TransitionDisplayObservationDto,
} from './dto/display-observation-workflow.dto';

@Controller('organizations/:organizationId/display-manager')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class DisplayManagerController {
  constructor(
    private readonly manager: DisplayManagerService,
    private readonly observations: DisplayObservationWorkflowService,
    private readonly devices: DeviceAdministrationService,
  ) {}

  @Post('devices')
  createDevice(
    @Param('organizationId') organizationId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: CreateDisplayDeviceDto,
  ) {
    return this.devices.create(organizationId, req.user, dto);
  }

  @Post('devices/:deviceId/invitations')
  inviteDevice(
    @Param('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: InviteDisplayDeviceDto,
  ) {
    return this.devices.invite(organizationId, deviceId, req.user, dto);
  }

  @Post('devices/:deviceId/assignments')
  assignDevice(
    @Param('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: AssignDisplayDeviceDto,
  ) {
    return this.devices.assign(organizationId, deviceId, req.user, dto);
  }

  @Post('devices/:deviceId/transition')
  transitionDevice(
    @Param('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: TransitionDisplayDeviceDto,
  ) {
    return this.devices.transition(organizationId, deviceId, req.user, dto);
  }

  @Get('devices/:deviceId/history')
  deviceHistory(
    @Param('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Request() req: { user: SpatialActor },
    @Query() query: DisplayDeviceHistoryQueryDto,
  ) {
    return this.devices.history(
      organizationId,
      deviceId,
      req.user,
      query.page,
      query.limit,
    );
  }

  @Get()
  get(
    @Param('organizationId') organizationId: string,
    @Request() req: { user: SpatialActor },
  ) {
    return this.manager.getWorkspace(organizationId, req.user);
  }

  @Get('observations')
  listObservations(
    @Param('organizationId') organizationId: string,
    @Request() req: { user: SpatialActor },
    @Query() query: DisplayObservationListQueryDto,
  ) {
    return this.observations.list(organizationId, req.user, query);
  }

  @Get('observations/:observationId')
  observation(
    @Param('organizationId') organizationId: string,
    @Param('observationId') observationId: string,
    @Request() req: { user: SpatialActor },
  ) {
    return this.observations.detail(organizationId, observationId, req.user);
  }

  @Post('observations/:observationId/qualify')
  qualify(
    @Param('organizationId') organizationId: string,
    @Param('observationId') observationId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: QualifyDisplayObservationDto,
  ) {
    return this.observations.qualify(
      organizationId,
      observationId,
      req.user,
      dto,
    );
  }

  @Post('observations/:observationId/assign')
  assign(
    @Param('organizationId') organizationId: string,
    @Param('observationId') observationId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: AssignDisplayObservationDto,
  ) {
    return this.observations.assign(
      organizationId,
      observationId,
      req.user,
      dto,
    );
  }

  @Post('observations/:observationId/messages')
  message(
    @Param('organizationId') organizationId: string,
    @Param('observationId') observationId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: MessageDisplayObservationDto,
  ) {
    return this.observations.message(
      organizationId,
      observationId,
      req.user,
      dto,
    );
  }

  @Post('observations/:observationId/transition')
  transition(
    @Param('organizationId') organizationId: string,
    @Param('observationId') observationId: string,
    @Request() req: { user: SpatialActor },
    @Body() dto: TransitionDisplayObservationDto,
  ) {
    return this.observations.transition(
      organizationId,
      observationId,
      req.user,
      dto,
    );
  }
}
