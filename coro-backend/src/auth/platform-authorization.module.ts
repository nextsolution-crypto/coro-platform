import { Global, Module } from '@nestjs/common';
import { PlatformRolesGuard } from './platform-roles.guard';
import { OrganizationStatusGuard } from './organization-status.guard';
import { PlatformAuthorityService } from './platform-authority.service';
import { PlatformAuthorityController } from './platform-authority.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';

@Global()
@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [PlatformAuthorityController],
  providers: [
    PlatformRolesGuard,
    OrganizationStatusGuard,
    PlatformAuthorityService,
  ],
  exports: [
    PlatformRolesGuard,
    OrganizationStatusGuard,
    PlatformAuthorityService,
  ],
})
export class PlatformAuthorizationModule {}
