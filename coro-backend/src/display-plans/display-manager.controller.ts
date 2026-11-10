import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import type { SpatialActor } from '../spatial/spatial-authorization.service';
import { DisplayManagerService } from './display-manager.service';

@Controller('organizations/:organizationId/display-manager')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class DisplayManagerController {
  constructor(private readonly manager: DisplayManagerService) {}

  @Get()
  get(
    @Param('organizationId') organizationId: string,
    @Request() req: { user: SpatialActor },
  ) {
    return this.manager.getWorkspace(organizationId, req.user);
  }
}
