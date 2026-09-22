import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingAssignmentsController } from './booking-assignments.controller';
import { BookingAssignmentsService } from './booking-assignments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController, BookingAssignmentsController],
  providers: [BookingsService, BookingAssignmentsService],
  exports: [BookingsService],
})
export class BookingsModule {}
