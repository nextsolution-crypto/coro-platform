import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PlanningWindowDto {
  @IsString() start!: string;
  @IsString() end!: string;
  @IsOptional() @IsString() userIds?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() activityTypeId?: string;
  @IsOptional() @IsIn(['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE']) bookingStatus?: string;
  @IsOptional() @IsIn(['true', 'false']) needsAction?: string;
  @IsOptional() @IsString() displayTimeZone?: string;
}

export class PlanningContextDto {
  @IsOptional() @IsString() @MaxLength(100) clientId?: string;
  @IsOptional() @IsString() @MaxLength(100) buildingId?: string;
}

export class CreatePlanningActivityDto {
  @IsString() @MaxLength(100) projectId!: string;
  @IsString() @MaxLength(100) activityTypeId!: string;
  @IsOptional() @IsString() @MaxLength(160) customLabel?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsIn(['presentiel', 'teams', 'hybride']) mode?: string;
  @IsOptional() @IsBoolean() clientVisible?: boolean;
  @IsOptional() @IsBoolean() clientBookable?: boolean;
}

export class PlanningActionsDto extends PlanningWindowDto {
  @IsOptional() @IsIn(['BOOKING_REQUESTED', 'NO_ACCEPTED_LEAD', 'PENDING_ASSIGNMENT',
    'SCHEDULING_BLOCKED', 'SCHEDULING_UNKNOWN', 'UNPLANNED_ACTIVITY']) type?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
