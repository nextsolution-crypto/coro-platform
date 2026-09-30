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
import { CapabilityCode } from '@prisma/client';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CapabilityEntitlementsService } from './capability-entitlements.service';
import {
  ChangeEntitlementDatesDto,
  ChangeEntitlementLimitsDto,
  CreateContractEntitlementDto,
  CreateDistributionEntitlementDto,
  CreateInternalEntitlementDto,
  CreateTemporaryEntitlementDto,
  EffectiveMutationDto,
  EntitlementImpactPreviewDto,
  PreviewStateDto,
  RevokeEntitlementDto,
  SetDistributableDto,
} from './capability-entitlements.dto';
import { EntitlementCommandService } from './entitlement-command.service';
import {
  EntitlementCommand,
  EntitlementOperation,
} from './entitlement-command.types';
type Req = { user: { userId: string } };
type CommandDto = PreviewStateDto & {
  entitlementId?: string;
  capabilityCode?: string;
  scope?: import('@prisma/client').CommercialScope;
  clientId?: string;
  buildingId?: string;
  source?: import('@prisma/client').EntitlementSource;
  parentEntitlementId?: string;
  sourceContractId?: string;
  sourceContractRevisionId?: string;
  sourceSnapshotLineId?: string;
  enabled?: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
  distributable?: boolean;
  removeAllLimits?: boolean;
  limits?: import('./capability-entitlements.dto').EntitlementLimitDto[];
};

@Controller('admin/v1/organizations/:organizationId/entitlements')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CapabilityEntitlementsController {
  constructor(
    private readonly service: CapabilityEntitlementsService,
    private readonly commands: EntitlementCommandService,
  ) {}
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
  @Post('preview') preview(
    @Param('organizationId') o: string,
    @Body() d: EntitlementImpactPreviewDto,
  ) {
    const operation = d.operation as EntitlementOperation;
    const command = this.transitionCommand(o, operation, d);
    if (!d.entitlementId) {
      command.source =
        d.source ??
        (operation === 'PROVISION_CONTRACT'
          ? 'CONTRACT'
          : operation === 'DISTRIBUTE'
            ? 'DISTRIBUTION'
            : operation === 'CREATE_TRIAL'
              ? 'TRIAL'
              : operation === 'CREATE_MANUAL_OVERRIDE'
                ? 'MANUAL_OVERRIDE'
                : 'INTERNAL');
      command.provenanceReason = d.reason;
    }
    return this.commands.preview(command);
  }
  @Post('trials') trial(
    @Param('organizationId') o: string,
    @Body() d: CreateTemporaryEntitlementDto,
    @Request() r: Req,
  ) {
    return this.commands.execute(
      this.creationCommand(o, 'CREATE_TRIAL', 'TRIAL', d),
      r.user,
    );
  }
  @Post('manual-overrides') override(
    @Param('organizationId') o: string,
    @Body() d: CreateTemporaryEntitlementDto,
    @Request() r: Req,
  ) {
    return this.commands.execute(
      this.creationCommand(o, 'CREATE_MANUAL_OVERRIDE', 'MANUAL_OVERRIDE', d),
      r.user,
    );
  }
  @Post('internal') internal(
    @Param('organizationId') o: string,
    @Body() d: CreateInternalEntitlementDto,
    @Request() r: Req,
  ) {
    return this.commands.execute(
      this.creationCommand(o, 'CREATE_INTERNAL', 'INTERNAL', d),
      r.user,
    );
  }
  @Post(':id/enable') enable(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EffectiveMutationDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'ENABLE', d, r);
  }
  @Post(':id/disable') disable(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EffectiveMutationDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'DISABLE', d, r);
  }
  @Post(':id/suspend') suspend(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EffectiveMutationDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'SUSPEND', d, r);
  }
  @Post(':id/resume') resume(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: EffectiveMutationDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'RESUME', d, r);
  }
  @Post(':id/revoke') revoke(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: RevokeEntitlementDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'REVOKE', d, r);
  }
  @Post(':id/set-distributable')
  setDistributable(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: SetDistributableDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'SET_DISTRIBUTABLE', d, r);
  }
  @Post(':id/change-limits')
  changeLimits(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: ChangeEntitlementLimitsDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'CHANGE_LIMITS', d, r);
  }
  @Post(':id/change-dates')
  changeDates(
    @Param('organizationId') o: string,
    @Param('id') id: string,
    @Body() d: ChangeEntitlementDatesDto,
    @Request() r: Req,
  ) {
    return this.executeTransition(o, id, 'CHANGE_DATES', d, r);
  }
  private executeTransition(
    o: string,
    id: string,
    operation: EntitlementOperation,
    d:
      | EffectiveMutationDto
      | RevokeEntitlementDto
      | SetDistributableDto
      | ChangeEntitlementLimitsDto
      | ChangeEntitlementDatesDto,
    r: Req,
  ) {
    return this.commands.execute(
      this.transitionCommand(o, operation, { ...d, entitlementId: id }),
      r.user,
    );
  }
  private transitionCommand(
    o: string,
    operation: EntitlementOperation,
    d: CommandDto,
  ): EntitlementCommand {
    return {
      operation,
      organizationId: o,
      entitlementId: d.entitlementId,
      capabilityCode: d.capabilityCode,
      scope: d.scope,
      clientId: d.clientId,
      buildingId: d.buildingId,
      source: d.source,
      parentEntitlementId: d.parentEntitlementId,
      sourceContractId: d.sourceContractId,
      sourceContractRevisionId: d.sourceContractRevisionId,
      sourceSnapshotLineId: d.sourceSnapshotLineId,
      enabled:
        operation === 'ENABLE'
          ? true
          : operation === 'DISABLE'
            ? false
            : d.enabled,
      distributable: d.distributable,
      effectiveFrom: d.effectiveFrom ? new Date(d.effectiveFrom) : undefined,
      effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
      limits: d.limits ? this.commands.normalizeLimits(d.limits) : undefined,
      removeAllLimits: d.removeAllLimits,
      reason: d.reason,
      expectedLockVersion: d.expectedLockVersion,
      expectedRevisionId: d.expectedRevisionId,
      acknowledgedWarningCodes: d.acknowledgedWarningCodes ?? [],
    };
  }
  private creationCommand(
    o: string,
    operation: EntitlementOperation,
    source: 'TRIAL' | 'MANUAL_OVERRIDE' | 'INTERNAL',
    d: CreateTemporaryEntitlementDto | CreateInternalEntitlementDto,
  ): EntitlementCommand {
    return {
      operation,
      organizationId: o,
      capabilityCode: d.capabilityCode,
      scope: d.scope,
      clientId: d.clientId,
      buildingId: d.buildingId,
      source,
      provenanceReason: d.reason,
      enabled: d.enabled,
      distributable: 'distributable' in d ? d.distributable : false,
      effectiveFrom: new Date(d.effectiveFrom),
      effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
      limits: this.commands.normalizeLimits(d.limits),
      reason: d.reason,
      acknowledgedWarningCodes: d.acknowledgedWarningCodes ?? [],
    };
  }
}

@Controller(
  'admin/v1/organizations/:organizationId/clients/:clientId/entitlements',
)
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class ClientEntitlementsController {
  constructor(
    private readonly service: CapabilityEntitlementsService,
    private readonly commands: EntitlementCommandService,
  ) {}
  @Get() list(
    @Param('organizationId') o: string,
    @Param('clientId') c: string,
  ) {
    return this.service.list(o, c);
  }
  @Post('distribute') create(
    @Param('organizationId') o: string,
    @Param('clientId') c: string,
    @Body() d: CreateDistributionEntitlementDto,
    @Request() r: Req,
  ) {
    return this.commands.execute(
      {
        operation: 'DISTRIBUTE',
        organizationId: o,
        capabilityCode: d.capabilityCode,
        scope: 'CLIENT',
        clientId: c,
        source: 'DISTRIBUTION',
        parentEntitlementId: d.parentEntitlementId,
        enabled: d.enabled,
        distributable: false,
        effectiveFrom: new Date(d.effectiveFrom),
        effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
        limits: this.commands.normalizeLimits(d.limits),
        reason: d.reason,
        acknowledgedWarningCodes: d.acknowledgedWarningCodes ?? [],
      },
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
  constructor(
    private readonly service: CapabilityEntitlementsService,
    private readonly commands: EntitlementCommandService,
  ) {}
  @Get() list(
    @Param('organizationId') o: string,
    @Param('buildingId') b: string,
    @Query('clientId') c: string,
  ) {
    return this.service.list(o, c, b);
  }
  @Post('distribute') create(
    @Param('organizationId') o: string,
    @Param('buildingId') b: string,
    @Body() d: CreateDistributionEntitlementDto,
    @Request() r: Req,
  ) {
    return this.commands.execute(
      {
        operation: 'DISTRIBUTE',
        organizationId: o,
        capabilityCode: d.capabilityCode,
        scope: 'SITE',
        clientId: d.clientId,
        buildingId: b,
        source: 'DISTRIBUTION',
        parentEntitlementId: d.parentEntitlementId,
        enabled: d.enabled,
        distributable: false,
        effectiveFrom: new Date(d.effectiveFrom),
        effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
        limits: this.commands.normalizeLimits(d.limits),
        reason: d.reason,
        acknowledgedWarningCodes: d.acknowledgedWarningCodes ?? [],
      },
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
  constructor(private readonly commands: EntitlementCommandService) {}
  @Post()
  create(
    @Param('organizationId') o: string,
    @Param('contractId') contractId: string,
    @Param('revisionId') revisionId: string,
    @Body() d: CreateContractEntitlementDto,
    @Request() r: Req,
  ) {
    return this.commands.execute(
      {
        operation: 'PROVISION_CONTRACT',
        organizationId: o,
        scope: d.scope,
        clientId: d.clientId,
        buildingId: d.buildingId,
        source: 'CONTRACT',
        sourceContractId: contractId,
        sourceContractRevisionId: revisionId,
        sourceSnapshotLineId: d.sourceSnapshotLineId,
        enabled: d.enabled,
        distributable: d.distributable,
        effectiveFrom: new Date(d.effectiveFrom),
        effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
        limits: d.limits ? this.commands.normalizeLimits(d.limits) : undefined,
        reason: d.reason,
        acknowledgedWarningCodes: d.acknowledgedWarningCodes ?? [],
        capabilityCode: '',
      },
      r.user,
    );
  }
}
