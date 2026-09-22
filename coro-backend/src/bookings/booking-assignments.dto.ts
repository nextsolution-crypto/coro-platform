import { BookingAssignmentRole, BookingAssignmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBookingAssignmentDto {
  @IsUUID() userId!: string;
  @IsEnum(BookingAssignmentRole) role!: BookingAssignmentRole;
}

export class RespondBookingAssignmentDto {
  @IsEnum(BookingAssignmentStatus) status!: BookingAssignmentStatus;
  @IsOptional() @IsString() @MaxLength(2000) declineReason?: string;
}

export class ReplaceBookingAssignmentDto {
  @IsUUID() newUserId!: string;
}
