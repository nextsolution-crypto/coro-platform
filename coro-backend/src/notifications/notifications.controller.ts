import { Controller, Get, Put, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('take') take?: string,
    @Query('before') before?: string,
    @Query('unread') unread?: string,
  ) {
    return this.service.findAll(req.user.userId, { take: Number(take) || undefined, before, unreadOnly: unread === 'true' });
  }

  @Get('unread-count')
  countUnread(@Request() req: any) {
    return this.service.countUnread(req.user.userId).then(count => ({ count }));
  }

  @Get('mandate-delays')
  checkDelays(@Request() req: any) {
    return this.service.checkMandateDelays(req.user);
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.service.markAsRead(id, req.user.userId);
  }

  @Put('read-all')
  markAllAsRead(@Request() req: any) {
    return this.service.markAllAsRead(req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user.userId);
  }
}
