import { Body, Controller, Get, Param, Patch, Post, Query, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CreateSupportTicketDto, SupportAgentUpdateDto, SupportMessageDto } from './dto/support.dto';
import { SupportActor, SupportService } from './support.service';

const UPLOAD = FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } });

/** Centre d'aide de l'app conseiller : mes demandes et console de support. */
@Controller('support')
@UseGuards(AuthGuard('jwt'))
export class SupportController {
  constructor(private readonly support: SupportService) {}

  private actor(req: any): SupportActor {
    return { kind: 'USER', userId: req.user.userId, organizationId: req.user.organizationId, role: req.user.role };
  }

  @Post('tickets')
  create(@Body() body: CreateSupportTicketDto, @Request() req: any) {
    return this.support.createTicket(this.actor(req), body);
  }

  @Get('tickets')
  mine(@Request() req: any) {
    return this.support.listMine(this.actor(req));
  }

  // Routes de la console déclarées avant les routes génériques « :id ».
  @Get('console/tickets')
  console(@Request() req: any, @Query('status') status?: string, @Query('type') type?: string, @Query('scope') scope?: string) {
    return this.support.listConsole(this.actor(req), { status, type, scope });
  }

  @Get('console/agents')
  agents(@Request() req: any) {
    return this.support.listAgents(this.actor(req));
  }

  @Get('tickets/:id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.support.getTicket(this.actor(req), id);
  }

  @Post('tickets/:id/messages')
  message(@Param('id') id: string, @Body() body: SupportMessageDto, @Request() req: any) {
    return this.support.addMessage(this.actor(req), id, body);
  }

  @Post('tickets/:id/close')
  close(@Param('id') id: string, @Request() req: any) {
    return this.support.setRequesterState(this.actor(req), id, 'close');
  }

  @Post('tickets/:id/reopen')
  reopen(@Param('id') id: string, @Request() req: any) {
    return this.support.setRequesterState(this.actor(req), id, 'reopen');
  }

  @Patch('tickets/:id')
  update(@Param('id') id: string, @Body() body: SupportAgentUpdateDto, @Request() req: any) {
    return this.support.updateAsAgent(this.actor(req), id, body);
  }

  @Post('tickets/:id/attachments')
  @UseInterceptors(UPLOAD)
  attach(@Param('id') id: string, @UploadedFile() file: any, @Query('messageId') messageId: string | undefined, @Request() req: any) {
    return this.support.addAttachment(this.actor(req), id, file, messageId);
  }

  @Get('tickets/:id/attachments/:attachmentId')
  async download(@Param('id') id: string, @Param('attachmentId') attachmentId: string, @Request() req: any, @Res() res: Response) {
    const file = await this.support.downloadAttachment(this.actor(req), id, attachmentId);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.buffer.length),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(file.buffer);
  }
}
