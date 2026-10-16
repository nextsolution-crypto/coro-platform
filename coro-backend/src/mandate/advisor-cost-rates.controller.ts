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
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import type { WorkManagementActor } from '../auth/work-management-access';
import { AdvisorCostRatesService } from './advisor-cost-rates.service';
import {
  CostRateTransitionDto,
  CreateAdvisorCostRateDto,
} from './rendement.dto';

@Controller('advisor-cost-rates')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class AdvisorCostRatesController {
  constructor(private readonly service: AdvisorCostRatesService) {}

  @Get()
  list(
    @Query('userId') userId: string | undefined,
    @Query('organizationId') organizationId: string | undefined,
    @Request() req: { user: WorkManagementActor },
  ) {
    return this.service.list(req.user, userId, organizationId);
  }

  @Post()
  create(
    @Body() dto: CreateAdvisorCostRateDto,
    @Request() req: { user: WorkManagementActor },
  ) {
    return this.service.createDraft(dto, req.user);
  }

  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: CostRateTransitionDto,
    @Request() req: { user: WorkManagementActor },
  ) {
    return this.service.submit(id, dto, req.user);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: CostRateTransitionDto,
    @Request() req: { user: WorkManagementActor },
  ) {
    return this.service.approve(id, dto, req.user);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: CostRateTransitionDto,
    @Request() req: { user: WorkManagementActor },
  ) {
    return this.service.reject(id, dto, req.user);
  }
}
