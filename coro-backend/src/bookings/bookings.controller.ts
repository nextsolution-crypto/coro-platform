import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { CancelBookingDto, UpdateBookingStatusDto } from './booking.dto';
import { BookingAssignmentsService } from './booking-assignments.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { BookingEligibilityService } from './booking-eligibility.service';
import { GrantBookingEligibilityDto } from './booking-eligibility.dto';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class BookingsController {
  constructor(
    private bookingsService: BookingsService,
    private assignments: BookingAssignmentsService,
    private eligibility: BookingEligibilityService,
  ) {}

  @Post('projects/:projectId/advisor-eligibilities')
  grantEligibility(
    @Param('projectId') projectId: string,
    @Body() body: GrantBookingEligibilityDto,
    @Request()
    req: { user: { userId: string; organizationId: string; role: string } },
  ) {
    return this.eligibility.grant(projectId, body, req.user);
  }

  @Delete('advisor-eligibilities/:id')
  revokeEligibility(
    @Param('id') id: string,
    @Request()
    req: { user: { userId: string; organizationId: string; role: string } },
  ) {
    return this.eligibility.revoke(id, req.user);
  }

  @Get('organization')
  getForOrganization(@Request() req: any) {
    return this.bookingsService.getBookingsForOrganization(
      req.user.organizationId,
      req.user,
    );
  }

  @Get('project/:projectId')
  getForProject(@Param('projectId') projectId: string, @Request() req: any) {
    return this.bookingsService.getBookingsForProject(
      projectId,
      req.user.organizationId,
    );
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
    return this.bookingsService.updateBookingStatus(
      id,
      {
        status: body.status,
        refuseReason: body.refuseReason,
        reportedDate: body.reportedDate
          ? new Date(body.reportedDate)
          : undefined,
        reportedLocalDateTime: body.reportedLocalDateTime,
        newUserId: body.newUserId,
        allowConflict: body.allowConflict,
      },
      req.user.organizationId,
      req.user,
    );
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: CancelBookingDto,
    @Request()
    req: { user: { userId: string; organizationId: string; role: string } },
  ) {
    return this.bookingsService.cancelBooking(
      id,
      {
        type: 'USER',
        id: req.user.userId,
        role: req.user.role,
        organizationId: req.user.organizationId,
      },
      body.reason,
    );
  }
}
