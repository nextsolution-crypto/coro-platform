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
import { CapabilityCode, EntitlementLifecycle } from '@prisma/client';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CapabilityEntitlementsService } from './capability-entitlements.service';
import {
  CreateEntitlementDto,
  EntitlementTransitionDto,
} from './capability-entitlements.dto';
type Req = { user: { userId: string } };

@Controller('admin/v1/organizations/:organizationId/entitlements')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CapabilityEntitlementsController {
  constructor(private readonly service: CapabilityEntitlementsService) {}
  @Get() list(@Param('organizationId') o: string) {
    return this.service.list(o);
  }
  @Get('resolve') resolve(
    @Param('organizationId') o: string,
    @Query('capabilityCode') c: CapabilityCode,
    @Query('clientId') client?: string,
    @Query('buildingId') building?: string,
    @Query('atTime') at?: string,
    @Query('asKnownAt') known?: string,
    @Query('observed') observed?: string,
  ) {
    return this.service.resolve(o, c, client, building, at, known, observed);
  }
  @Get(':id') detail(
    @Param('organizationId') o: string,
    @Param('id') id: string,
  ) {
    return this.service.detail(o, id);
  }
  @Get(':id/history') history(
    @Param('organizationId') o: string,
    @Param('id') id: string,
  ) {
    return this.service.history(o, id);
  }
  @Post() create(
    @Param('organizationId') o: string,
    @Body() d: CreateEntitlementDto,
    @Request() r: Req,
  ) {
    return this.service.create(o, d, r.user);
  }
  @Post(':id/enable') enable(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EntitlementTransitionDto,
    @Request() r: Req,
  ) {
    return this.change(o, id, 'GRANTED', d, r, 'ENTITLEMENT_ENABLED', {
      enabled: true,
    });
  }
  @Post(':id/disable') disable(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EntitlementTransitionDto,
    @Request() r: Req,
  ) {
    return this.change(o, id, 'GRANTED', d, r, 'ENTITLEMENT_DISABLED', {
      enabled: false,
    });
  }
  @Post(':id/suspend') suspend(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EntitlementTransitionDto,
    @Request() r: Req,
  ) {
    return this.change(o, id, 'SUSPENDED', d, r, 'ENTITLEMENT_SUSPENDED');
  }
  @Post(':id/resume') resume(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EntitlementTransitionDto,
    @Request() r: Req,
  ) {
    return this.change(o, id, 'GRANTED', d, r, 'ENTITLEMENT_UPDATED');
  }
  @Post(':id/revoke') revoke(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EntitlementTransitionDto,
    @Request() r: Req,
  ) {
    return this.change(o, id, 'REVOKED', d, r, 'ENTITLEMENT_REVOKED');
  }
  private change(
    o: string,
    id: string,
    lifecycle: EntitlementLifecycle,
    d: EntitlementTransitionDto,
    r: Req,
    action: string,
    patch?: Partial<EntitlementTransitionDto>,
  ) {
    return this.service.transition(
      o,
      id,
      lifecycle,
      { ...d, ...patch },
      r.user,
      action,
    );
  }
}

@Controller(
  'admin/v1/organizations/:organizationId/clients/:clientId/entitlements',
)
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class ClientEntitlementsController {
  constructor(private readonly service: CapabilityEntitlementsService) {}
  @Get() list(
    @Param('organizationId') o: string,
    @Param('clientId') c: string,
  ) {
    return this.service.list(o, c);
  }
  @Post() create(
    @Param('organizationId') o: string,
    @Param('clientId') c: string,
    @Body() d: CreateEntitlementDto,
    @Request() r: Req,
  ) {
    return this.service.create(
      o,
      { ...d, scope: 'CLIENT', clientId: c },
      r.user,
    );
  }
}

@Controller(
  'admin/v1/organizations/:organizationId/sites/:buildingId/entitlements',
)
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class SiteEntitlementsController {
  constructor(private readonly service: CapabilityEntitlementsService) {}
  @Get() list(
    @Param('organizationId') o: string,
    @Param('buildingId') b: string,
    @Query('clientId') c: string,
  ) {
    return this.service.list(o, c, b);
  }
  @Post() create(
    @Param('organizationId') o: string,
    @Param('buildingId') b: string,
    @Body() d: CreateEntitlementDto,
    @Request() r: Req,
  ) {
    return this.service.create(
      o,
      { ...d, scope: 'SITE', buildingId: b },
      r.user,
    );
  }
}

@Controller(
  'admin/v1/organizations/:organizationId/contracts/:contractId/revisions/:revisionId/provision-entitlements',
)
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class ContractEntitlementProvisioningController {
  constructor(private readonly service: CapabilityEntitlementsService) {}
  @Post()
  create(
    @Param('organizationId') o: string,
    @Param('contractId') contractId: string,
    @Param('revisionId') revisionId: string,
    @Body() d: CreateEntitlementDto,
    @Request() r: Req,
  ) {
    return this.service.create(
      o,
      {
        ...d,
        source: 'CONTRACT',
        sourceContractId: contractId,
        sourceContractRevisionId: revisionId,
      },
      r.user,
    );
  }
}
