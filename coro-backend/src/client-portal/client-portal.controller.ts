import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';
import { ClientJwtGuard } from './client-jwt.guard';

@Controller('client-portal')
@UseGuards(ClientJwtGuard)
export class ClientPortalController {
  constructor(private clientPortalService: ClientPortalService) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.clientPortalService.getDashboard(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  @Get('projects')
  async getProjects(@Request() req: any) {
    return this.clientPortalService.getProjects(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string, @Request() req: any) {
    return this.clientPortalService.getProject(
      id,
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
    );
  }

  @Get('activities')
  async getActivities(@Request() req: any) {
    return this.clientPortalService.getActivities(
      req.clientUser.clientId,
      req.clientUser.organizationId,
      req.clientUser.role,
      req.clientUser.buildingIds,
    );
  }

  @Post('projects/:id/sign')
  async signDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { fullName: string; comment?: string },
  ) {
    return this.clientPortalService.signDocument(id, req.clientUser, {
      fullName: body.fullName,
      comment: body.comment,
      ipAddress: req.ip,
    });
  }

  @Post('projects/:id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { contenu: string },
  ) {
    return this.clientPortalService.addComment(
      id,
      req.clientUser,
      req.clientUser.organizationId,
      body.contenu,
    );
  }

  @Get('projects/:id/comments')
  async getComments(@Param('id') id: string) {
    return this.clientPortalService.getComments(id);
  }
}