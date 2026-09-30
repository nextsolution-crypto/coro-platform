import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { CommercialReconciliationService } from './commercial-reconciliation.service';
import {
  ControlCenterOrganizationsQueryDto,
  ControlCenterOverviewQueryDto,
  OrganizationReadQueryDto,
  ScopeTreeQueryDto,
} from './control-center.dto';
import { ControlCenterService } from './control-center.service';

@Controller('admin/v1')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class ControlCenterController {
  constructor(
    private readonly controlCenter: ControlCenterService,
    private readonly reconciliation: CommercialReconciliationService,
  ) {}

  @Get('control-center/overview')
  overview(@Query() query: ControlCenterOverviewQueryDto) {
    const asOf = query.asOf ?? new Date();
    return this.controlCenter.overview(
      asOf,
      query.attentionLimit,
      query.expiringWithinDays,
    );
  }

  @Get('control-center/organizations')
  organizations(@Query() query: ControlCenterOrganizationsQueryDto) {
    return this.controlCenter.organizations(query, new Date());
  }

  @Get('commercial/overview')
  commercial(@Query() query: ControlCenterOverviewQueryDto) {
    const asOf = query.asOf ?? new Date();
    return this.controlCenter.commercialOverview(
      asOf,
      query.expiringWithinDays,
    );
  }

  @Get('organizations/:organizationId/commercial-reconciliation')
  reconcile(
    @Param('organizationId') organizationId: string,
    @Query() query: OrganizationReadQueryDto,
  ) {
    return this.reconciliation.reconcile(
      organizationId,
      query.asOf ?? new Date(),
    );
  }

  @Get('organizations/:organizationId/capability-matrix')
  matrix(
    @Param('organizationId') organizationId: string,
    @Query() query: OrganizationReadQueryDto,
  ) {
    return this.reconciliation.matrix(organizationId, query.asOf ?? new Date());
  }

  @Get('organizations/:organizationId/scope-tree')
  tree(
    @Param('organizationId') organizationId: string,
    @Query() query: ScopeTreeQueryDto,
  ) {
    return this.reconciliation.scopeTree(
      organizationId,
      query.asOf ?? new Date(),
      query.capabilityCode,
      query.clientPage,
      query.clientPageSize,
    );
  }
}
