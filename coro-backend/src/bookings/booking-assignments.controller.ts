import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingAssignmentsService } from './booking-assignments.service';
import { CreateBookingAssignmentDto, ReplaceBookingAssignmentDto, RespondBookingAssignmentDto } from './booking-assignments.dto';

@Controller('bookings/:id/assignments')
@UseGuards(AuthGuard('jwt'))
export class BookingAssignmentsController {
  constructor(private readonly assignments: BookingAssignmentsService) {}

  @Get()
  list(@Param('id') id: string, @Query('includeHistory') includeHistory: string | undefined, @Request() req: any) {
    return this.assignments.list(id, req.user, includeHistory === 'true');
  }

  @Post()
  add(@Param('id') id: string, @Body() dto: CreateBookingAssignmentDto, @Request() req: any) {
    return this.assignments.add(id, dto.userId, dto.role, req.user);
  }

  @Post(':assignmentId/respond')
  respond(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() dto: RespondBookingAssignmentDto, @Request() req: any) {
    return this.assignments.respond(id, assignmentId, dto.status, dto.declineReason, req.user);
  }

  @Post(':assignmentId/replace')
  replace(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() dto: ReplaceBookingAssignmentDto, @Request() req: any) {
    return this.assignments.replace(id, assignmentId, dto.newUserId, req.user);
  }

  @Delete(':assignmentId')
  remove(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Request() req: any) {
    return this.assignments.remove(id, assignmentId, req.user);
  }
}
