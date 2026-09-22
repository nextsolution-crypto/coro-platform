import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { BOOKING_STATUSES } from './booking-status';

export class CreateBookingDto {
  @IsIn(['exercice', 'formation', 'visite', 'revision', 'autre']) activityType!: string;
  @IsOptional() @IsDateString() @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i) requestedDate?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/) requestedLocalDateTime?: string;
  @IsInt() @Min(1) @Max(1440) duration!: number;
  @IsOptional() @IsInt() @Min(1) participants?: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class CreateActivityBookingDto {
  @IsOptional() @IsDateString() @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i) requestedDate?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/) requestedLocalDateTime?: string;
  @IsInt() @Min(1) @Max(1440) duration!: number;
  @IsOptional() @IsInt() @Min(1) participants?: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class UpdateBookingStatusDto {
  @IsIn(BOOKING_STATUSES) status!: string;
  @ValidateIf(o => o.status === 'REFUSEE' || o.refuseReason !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(2000) refuseReason?: string;
  @IsOptional() @IsDateString() @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i) reportedDate?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/) reportedLocalDateTime?: string;
  @IsOptional() @IsBoolean() allowConflict?: boolean;
  @ValidateIf(o => o.status === 'REASSIGNEE' || o.newUserId !== undefined)
  @IsUUID() newUserId?: string;
}
