import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { UpdateBookingStatusDto } from './booking.dto';
import { BookingAssignmentsService } from './booking-assignments.service';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private bookingsService: BookingsService, private assignments: BookingAssignmentsService) {}

  @Get('organization')
  getForOrganization(@Request() req: any) {
    return this.bookingsService.getBookingsForOrganization(req.user.organizationId);
  }

  @Get('project/:projectId')
  getForProject(@Param('projectId') projectId: string, @Request() req: any) {
    return this.bookingsService.getBookingsForProject(projectId, req.user.organizationId);
  }

  @Get(':id/available-users')
  availableUsers(@Param('id') id: string, @Request() req: any) {
    return this.assignments.availableUsers(id, req.user);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateBookingStatusDto,
    @Request() req: any,
  ) {
    return this.bookingsService.updateBookingStatus(id, {
      status: body.status,
      refuseReason: body.refuseReason,
      reportedDate: body.reportedDate ? new Date(body.reportedDate) : undefined,
      reportedLocalDateTime: body.reportedLocalDateTime,
      newUserId: body.newUserId,
      allowConflict: body.allowConflict,
    }, req.user.organizationId, req.user);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.bookingsService.cancelBooking(id, 'conseiller', req.user.organizationId);
  }
}
