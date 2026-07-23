import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AuthGuard('jwt'))
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