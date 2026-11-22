import { Module } from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { EmailService } from './email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ExportModule } from '../export/export.module';
import { StorageModule } from '../storage/storage.module';
import { BookingsModule } from '../bookings/bookings.module';
import { OccupancyModule } from '../occupancy/occupancy.module';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';
import { CorrectiveActionEvidenceService } from '../occupancy/corrective-action-evidence.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PopulationModule } from '../population/population.module';
import { requireJwtSecret } from '../auth/auth-security.config';
import { AuthModule } from '../auth/auth.module';
import { ClientPilotPolicyService } from './client-pilot-policy.service';
import { ClientDisplayController } from './client-display.controller';
import { ClientDisplayService } from './client-display.service';
import { ClientJwtGuard } from './client-jwt.guard';
import {
  ClientIncidentReportsController,
  ClientOperationalDirectivesController,
  ClientOperationalCapabilitiesController,
  ClientOperationalLogController,
  ClientOperationalShiftsController,
} from './client-operations.controller';
import { IncidentReportsModule } from '../incident-reports/incident-reports.module';
import { OperationalLogModule } from '../operational-log/operational-log.module';
import { OperationalShiftsModule } from '../operational-shifts/operational-shifts.module';
import { OperationalDirectivesModule } from '../operational-directives/operational-directives.module';
import { CapabilityEntitlementsModule } from '../capability-entitlements/capability-entitlements.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CapabilityEnforcementInterceptor } from './capability-enforcement.interceptor';

@Module({
  imports: [
    PrismaModule,
    ExportModule,
    StorageModule,
    BookingsModule,
    OccupancyModule,
    NotificationsModule,
    PopulationModule,
    AuthModule,
    IncidentReportsModule,
    OperationalLogModule,
    OperationalShiftsModule,
    OperationalDirectivesModule,
    CapabilityEntitlementsModule,
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    ClientPortalController,
    ClientAuthController,
    ClientDisplayController,
    ClientIncidentReportsController,
    ClientOperationalLogController,
    ClientOperationalShiftsController,
    ClientOperationalDirectivesController,
    ClientOperationalCapabilitiesController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: CapabilityEnforcementInterceptor },
    ClientPortalService,
    ClientAuthService,
    ClientPilotPolicyService,
    EmailService,
    CorrectiveActionsService,
    CorrectiveActionEvidenceService,
    ClientDisplayService,
    ClientJwtGuard,
  ],
  exports: [ClientPortalService, EmailService, ClientPilotPolicyService],
})
export class ClientPortalModule {}
