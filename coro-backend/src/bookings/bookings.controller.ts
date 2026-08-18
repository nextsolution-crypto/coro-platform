import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get('organization')
  getForOrganization(@Request() req: any) {
    return this.bookingsService.getBookingsForOrganization(req.user.organizationId);
  }

  @Get('project/:projectId')
  getForProject(@Param('projectId') projectId: string) {
    return this.bookingsService.getBookingsForProject(projectId);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; refuseReason?: string; reportedDate?: string; newUserId?: string },
  ) {
    return this.bookingsService.updateBookingStatus(id, {
      status: body.status,
      refuseReason: body.refuseReason,
      reportedDate: body.reportedDate ? new Date(body.reportedDate) : undefined,
      newUserId: body.newUserId,
    });
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: { cancelledBy: 'client' | 'conseiller' }) {
    return this.bookingsService.cancelBooking(id, body.cancelledBy);
  }
}