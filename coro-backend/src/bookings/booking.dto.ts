import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { BOOKING_STATUSES } from './booking-status';

export class CreateBookingDto {
  @IsIn(['exercice', 'formation', 'visite', 'revision', 'autre']) activityType!: string;
  @IsDateString() requestedDate!: string;
  @IsInt() @Min(1) @Max(1440) duration!: number;
  @IsOptional() @IsInt() @Min(1) participants?: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class UpdateBookingStatusDto {
  @IsIn(BOOKING_STATUSES) status!: string;
  @ValidateIf(o => o.status === 'REFUSEE' || o.refuseReason !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(2000) refuseReason?: string;
  @ValidateIf(o => o.status === 'REPORTEE' || o.reportedDate !== undefined)
  @IsDateString() reportedDate?: string;
  @ValidateIf(o => o.status === 'REASSIGNEE' || o.newUserId !== undefined)
  @IsUUID() newUserId?: string;
}
