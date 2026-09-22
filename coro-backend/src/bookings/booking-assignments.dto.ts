import { BookingAssignmentRole, BookingAssignmentStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBookingAssignmentDto {
  @IsUUID() userId!: string;
  @IsEnum(BookingAssignmentRole) role!: BookingAssignmentRole;
  @IsOptional() @IsBoolean() allowConflict?: boolean;
}

export class RespondBookingAssignmentDto {
  @IsEnum(BookingAssignmentStatus) status!: BookingAssignmentStatus;
  @IsOptional() @IsString() @MaxLength(2000) declineReason?: string;
}

export class ReplaceBookingAssignmentDto {
  @IsUUID() newUserId!: string;
  @IsOptional() @IsBoolean() allowConflict?: boolean;
}
