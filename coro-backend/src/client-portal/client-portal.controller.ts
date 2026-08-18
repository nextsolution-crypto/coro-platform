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

  @Post('projects/:id/refuse')
  async refuseDocument(
    @Param('id') id: string,
    @Body() body: { comment: string },
    @Request() req: any,
  ) {
    return this.clientPortalService.refuseDocument(id, req.clientUser, body.comment);
  }

  @Get('projects/:id/comments')
  async getComments(@Param('id') id: string) {
    return this.clientPortalService.getComments(id);
  }

  @Post('projects/:id/engagement')
  async trackEngagement(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { event: string; device?: string; duration?: number },
  ) {
    return this.clientPortalService.trackEngagement({
      projectId: id,
      clientUserId: req.clientUser.sub,
      event: body.event,
      device: body.device,
      duration: body.duration,
    });
  }

  @Get('projects/:id/engagement')
  async getEngagement(@Param('id') id: string) {
    return this.clientPortalService.getEngagement(id);
  }

  @Post('projects/:id/bookings')
  async createBooking(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { activityType: string; requestedDate: string; duration: number; participants?: number; comment?: string },
  ) {
    return this.clientPortalService.createBookingFromClient({
      projectId: id,
      clientUserId: req.clientUser.sub,
      activityType: body.activityType,
      requestedDate: new Date(body.requestedDate),
      duration: body.duration,
      participants: body.participants,
      comment: body.comment,
    });
  }

  @Get('bookings')
  async getMyBookings(@Request() req: any) {
    return this.clientPortalService.getBookingsForClient(req.clientUser.sub);
  }
}