import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  CapabilityEntitlementsController,
  ClientEntitlementsController,
  ContractEntitlementProvisioningController,
  SiteEntitlementsController,
} from './capability-entitlements.controller';
import { CapabilityEntitlementsService } from './capability-entitlements.service';
import { EntitlementResolver } from './entitlement-resolver.service';
import { EntitlementCommandService } from './entitlement-command.service';
import { CapabilityObservationModule } from '../control-center/capability-observation.module';
import { ClientFeatureEntitlementService } from './client-feature-entitlement.service';
import { FamilyEntitlementService } from './family-entitlement.service';
@Module({
  imports: [PrismaModule, AdminAuditModule, CapabilityObservationModule],
  controllers: [
    CapabilityEntitlementsController,
    ClientEntitlementsController,
    SiteEntitlementsController,
    ContractEntitlementProvisioningController,
  ],
  providers: [
    CapabilityEntitlementsService,
    EntitlementResolver,
    EntitlementCommandService,
    ClientFeatureEntitlementService,
    FamilyEntitlementService,
  ],
  exports: [
    CapabilityEntitlementsService,
    EntitlementResolver,
    EntitlementCommandService,
    ClientFeatureEntitlementService,
    FamilyEntitlementService,
  ],
})
export class CapabilityEntitlementsModule {}
