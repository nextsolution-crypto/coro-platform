import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  private assertSuperAdmin(req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
  }

  @Get()
  findAll(@Request() req: any) {
    this.assertSuperAdmin(req);
    return this.organizationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    this.assertSuperAdmin(req);
    return this.organizationsService.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    this.assertSuperAdmin(req);
    return this.organizationsService.createWithAdmin(body);
  }

  @Put(':id/license')
  updateLicense(@Param('id') id: string, @Body() body: { licenseType: string }, @Request() req: any) {
    this.assertSuperAdmin(req);
    return this.organizationsService.updateLicense(id, body.licenseType);
  }

  @Put(':id/active')
  toggleActive(@Param('id') id: string, @Body() body: { isActive: boolean }, @Request() req: any) {
    this.assertSuperAdmin(req);
    return this.organizationsService.toggleActive(id, body.isActive);
  }
}