import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import {
  CalculateMeteringDto,
  CorrectMeteringDto,
  ListMeteringDto,
} from './metering.dto';
import { MeteringService } from './metering.service';

type AdminRequest = { user: { userId: string; role: string } };

@Controller('admin/v1')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class MeteringController {
  constructor(private readonly metering: MeteringService) {}

  @Get('metering/metrics') metrics() {
    return this.metering.metrics();
  }

  @Get('organizations/:organizationId/metering')
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListMeteringDto,
  ) {
    return this.metering.list(organizationId, query);
  }

  @Get('organizations/:organizationId/metering/:metricCode')
  history(
    @Param('organizationId') organizationId: string,
    @Param('metricCode') metricCode: string,
    @Query() query: ListMeteringDto,
  ) {
    return this.metering.history(organizationId, metricCode, query);
  }

  @Post('organizations/:organizationId/metering/calculate')
  calculate(
    @Param('organizationId') organizationId: string,
    @Body() dto: CalculateMeteringDto,
    @Request() request: AdminRequest,
  ) {
    return this.metering.calculate(organizationId, dto, request.user);
  }

  @Post('organizations/:organizationId/metering/:resultId/correct')
  correct(
    @Param('organizationId') organizationId: string,
    @Param('resultId') resultId: string,
    @Body() dto: CorrectMeteringDto,
    @Request() request: AdminRequest,
  ) {
    return this.metering.correct(
      organizationId,
      resultId,
      dto.reason,
      request.user,
    );
  }
}
