import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { requireInternal } from '../auth/work-management-access';
import type { WorkManagementActor } from '../auth/work-management-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { RendementFinancialService } from './rendement-financial.service';
import {
  FinancialRendementQueryDto,
  RendementPeriodQueryDto,
  ValidateMandateSaleDto,
} from './rendement.dto';

@Controller('rendement')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class RendementController {
  constructor(private readonly financial: RendementFinancialService) {}

  @Get()
  getRendement(
    @Query('userId') userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: { user: WorkManagementActor },
  ) {
    requireInternal(req.user);
    const effectiveUserId = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)
      ? userId || undefined
      : req.user.userId;
    return this.financial.operational(req.user, {
      userId: effectiveUserId,
      from,
      to,
    });
  }

  @Get('operational')
  getOperational(
    @Query() query: RendementPeriodQueryDto,
    @Request() req: { user: WorkManagementActor },
  ) {
    requireInternal(req.user);
    return this.financial.operational(req.user, query);
  }

  @Get('financial')
  getFinancial(
    @Query() query: FinancialRendementQueryDto,
    @Request() req: { user: WorkManagementActor },
  ) {
    return this.financial.financial(req.user, query);
  }

  @Put('financial/mandates/:mandateId/sale')
  validateSale(
    @Param('mandateId') mandateId: string,
    @Body() dto: ValidateMandateSaleDto,
    @Request() req: { user: WorkManagementActor },
  ) {
    return this.financial.validateSale(mandateId, dto, req.user);
  }
}
