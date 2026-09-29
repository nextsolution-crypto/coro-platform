import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { AuditQueryDto, PageQueryDto } from './organization-360.dto';
import { Organization360Service } from './organization-360.service';

@Controller('admin/v1/organizations/:organizationId')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class Organization360Controller {
  constructor(private readonly service: Organization360Service) {}

  @Get('overview') overview(@Param('organizationId') id: string) {
    return this.service.overview(id);
  }
  @Get('users') users(
    @Param('organizationId') id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.service.users(id, query);
  }
  @Get('clients') clients(
    @Param('organizationId') id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.service.clients(id, query);
  }
  @Get('sites') sites(
    @Param('organizationId') id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.service.sites(id, query);
  }
  @Get('capabilities') capabilities(@Param('organizationId') id: string) {
    return this.service.capabilities(id);
  }
  @Get('commercial') commercial(@Param('organizationId') id: string) {
    return this.service.commercial(id);
  }
  @Get('usage') usage(@Param('organizationId') id: string) {
    return this.service.usage(id);
  }
  @Get('security') security(@Param('organizationId') id: string) {
    return this.service.security(id);
  }
  @Get('audit-events') auditEvents(
    @Param('organizationId') id: string,
    @Query() query: AuditQueryDto,
  ) {
    return this.service.auditEvents(id, query);
  }
}
