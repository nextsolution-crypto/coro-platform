import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdviserActor } from '../auth/project-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import {
  CreateOperationalShiftDto,
  HandoverDecisionDto,
  OpenShiftDto,
  PrepareHandoverDto,
  ShiftListQueryDto,
  ShiftTransitionDto,
} from './dto/operational-shifts.dto';
import { OperationalShiftsService } from './operational-shifts.service';

interface AuthenticatedRequest {
  user: AdviserActor;
}

@Controller('organizations/:organizationId/operational-shifts')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class OperationalShiftsController {
  constructor(private readonly service: OperationalShiftsService) {}

  @Post()
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateOperationalShiftDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(organizationId, dto, req.user);
  }

  @Get()
  list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: ShiftListQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.list(organizationId, query, req.user);
  }

  @Get(':id')
  get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.get(organizationId, id, req.user);
  }

  @Post(':id/open')
  open(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OpenShiftDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.open(organizationId, id, dto, req.user);
  }

  @Post(':id/handover')
  handover(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrepareHandoverDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.prepareHandover(organizationId, id, dto, req.user);
  }

  @Post('handovers/:handoverId/decision')
  decide(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('handoverId', ParseUUIDPipe) handoverId: string,
    @Body() dto: HandoverDecisionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.decideHandover(
      organizationId,
      handoverId,
      dto,
      req.user,
    );
  }

  @Post(':id/close')
  close(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShiftTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.close(organizationId, id, dto, req.user);
  }

  @Post(':id/cancel')
  cancel(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShiftTransitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.cancel(organizationId, id, dto, req.user);
  }
}
