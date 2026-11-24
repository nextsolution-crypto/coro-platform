import { Body, Controller, Get, Param, Post, Query, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { CreateSupportTicketDto, SupportMessageDto } from './dto/support.dto';
import { SupportActor, SupportService } from './support.service';

/** Centre d'aide du portail client : le client voit et suit seulement ses propres demandes. */
@Controller('client-portal/support')
@UseGuards(ClientJwtGuard)
export class SupportClientController {
  constructor(private readonly support: SupportService) {}

  private actor(req: any): SupportActor {
    return {
      kind: 'CLIENT',
      clientUserId: req.clientUser.sub,
      clientId: req.clientUser.clientId,
      organizationId: req.clientUser.organizationId,
      buildingIds: req.clientUser.buildingIds,
    };
  }

  @Post('tickets')
  create(@Body() body: CreateSupportTicketDto, @Request() req: any) {
    return this.support.createTicket(this.actor(req), body);
  }

  @Get('tickets')
  mine(@Request() req: any) {
    return this.support.listMine(this.actor(req));
  }

  @Get('tickets/:id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.support.getTicket(this.actor(req), id);
  }

  @Post('tickets/:id/messages')
  message(@Param('id') id: string, @Body() body: SupportMessageDto, @Request() req: any) {
    return this.support.addMessage(this.actor(req), id, { body: body.body });
  }

  @Post('tickets/:id/close')
  close(@Param('id') id: string, @Request() req: any) {
    return this.support.setRequesterState(this.actor(req), id, 'close');
  }

  @Post('tickets/:id/reopen')
  reopen(@Param('id') id: string, @Request() req: any) {
    return this.support.setRequesterState(this.actor(req), id, 'reopen');
  }

  @Post('tickets/:id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
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
