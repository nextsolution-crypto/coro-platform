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
@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [
    CapabilityEntitlementsController,
    ClientEntitlementsController,
    SiteEntitlementsController,
    ContractEntitlementProvisioningController,
  ],
  providers: [CapabilityEntitlementsService, EntitlementResolver],
  exports: [CapabilityEntitlementsService, EntitlementResolver],
})
export class CapabilityEntitlementsModule {}
