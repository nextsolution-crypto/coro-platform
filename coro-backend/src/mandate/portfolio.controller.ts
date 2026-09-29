import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MandateService } from './mandate.service';
import { requireTenantAdmin } from '../auth/work-management-access';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';

@Controller('admin/portfolio')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class PortfolioController {
  constructor(private readonly service: MandateService) {}

  @Get()
  getPortfolio(@Request() req: any) {
    requireTenantAdmin(req.user);
    return this.service.getPortfolio(req.user.organizationId);
  }
}
