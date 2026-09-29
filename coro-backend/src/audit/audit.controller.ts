import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { EvidenceReadAccess } from '../auth/organization-access.decorator';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@EvidenceReadAccess()
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string, @Request() req: any) {
    return this.auditService.findByProject(projectId, req.user.organizationId);
  }

  @Get('organization')
  findByOrganization(@Request() req: any) {
    return this.auditService.findByOrganization(req.user.organizationId);
  }
}
