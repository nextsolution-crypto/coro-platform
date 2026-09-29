import { Global, Module } from '@nestjs/common';
import { PlatformRolesGuard } from './platform-roles.guard';
import { OrganizationStatusGuard } from './organization-status.guard';

@Global()
@Module({
  providers: [PlatformRolesGuard, OrganizationStatusGuard],
  exports: [PlatformRolesGuard, OrganizationStatusGuard],
})
export class PlatformAuthorizationModule {}
