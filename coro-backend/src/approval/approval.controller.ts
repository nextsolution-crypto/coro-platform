import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApprovalService } from './approval.service';

@Controller('approval')
@UseGuards(AuthGuard('jwt'))
export class ApprovalController {
  constructor(private service: ApprovalService) {}

  @Post(':projectId/submit')
  submit(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.submit(projectId, req.user.userId, req.user.organizationId);
  }

  @Post(':projectId/approve')
  approve(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.approve(projectId, req.user.userId, req.user.organizationId);
  }

  @Post(':projectId/request-revision')
  requestRevision(
    @Param('projectId') projectId: string,
    @Body() body: { commentaire?: string },
    @Request() req: any,
  ) {
    return this.service.requestRevision(
      projectId,
      req.user.userId,
      req.user.organizationId,
      body.commentaire,
    );
  }

  @Get(':projectId/can-edit')
  canEdit(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.canEdit(projectId, req.user.userId, req.user.organizationId)
      .then(canEdit => ({ canEdit }));
  }

  @Get(':projectId/can-approve')
  canApprove(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.canApprove(projectId, req.user.userId, req.user.organizationId)
      .then(canApprove => ({ canApprove }));
  }

  @Get(':projectId/observations')
  getObservations(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.getObservations(projectId, req.user.organizationId);
  }

  @Post(':projectId/observations')
  addObservation(
    @Param('projectId') projectId: string,
    @Body() body: { texte: string; module?: string },
    @Request() req: any,
  ) {
    return this.service.addObservation(
      projectId,
      req.user.userId,
      req.user.organizationId,
      body,
    );
  }

  @Put('observations/:id')
  updateObservation(
    @Param('id') id: string,
    @Body() body: { texte?: string; module?: string; statut?: string },
    @Request() req: any,
  ) {
    return this.service.updateObservation(id, req.user.userId, req.user.organizationId, body);
  }

  @Delete('observations/:id')
  deleteObservation(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteObservation(id, req.user.organizationId);
  }
}