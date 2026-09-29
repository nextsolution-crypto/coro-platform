import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationsService } from './organizations.service';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { UpdateOrganizationLicenseDto } from './dto/update-organization-license.dto';
import { UpdateOrganizationActiveDto } from './dto/update-organization-active.dto';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('organizations')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard, PlatformRolesGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get()
  @SuperAdminOnly()
  findAll() {
    return this.organizationsService.findAll();
  }

  @Post()
  @SuperAdminOnly()
  create(@Body() body: CreateOrganizationDto, @Request() req: any) {
    return this.organizationsService.createWithAdmin(body, req.user);
  }

  @Put(':id/license')
  @SuperAdminOnly()
  updateLicense(@Param('id') id: string, @Body() body: UpdateOrganizationLicenseDto, @Request() req: any) {
    return this.organizationsService.updateLicense(id, body.licenseType, req.user, body.reason);
  }

  @Get('map/overview')
  @SuperAdminOnly()
  async getMapOverview() {
    return this.organizationsService.getMapOverview();
  }

  @Put(':id/active')
  @SuperAdminOnly()
  toggleActive(@Param('id') id: string, @Body() body: UpdateOrganizationActiveDto, @Request() req: any) {
    return this.organizationsService.toggleActive(id, body.isActive, req.user, body.reason);
  }

  // Accessible à tout utilisateur connecté — uniquement sa propre organisation
  @Get('me/info')
  getMyOrganization(@Request() req: any) {
    return this.organizationsService.findOne(req.user.organizationId);
  }

  @Get('admin/all-projects')
  @SuperAdminOnly()
  getAllProjectsGlobal() {
    return this.organizationsService.findAllProjectsGlobal();
  }

  @Get('admin/health-scores')
  @SuperAdminOnly()
  getHealthScores() {
    return this.organizationsService.getHealthScores();
  }

  // Garder la route paramétrée après toutes les routes statiques.
  @Get(':id')
  @SuperAdminOnly()
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }
}
