import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CorrectiveActionAssigneeType, OperationalReviewConfidentiality } from '@prisma/client';

export const CORRECTIVE_ACTION_CATEGORIES = [
  'ROLES',
  'QUALIFICATIONS',
  'PLANS',
  'EXERCISES',
  'INCIDENTS',
  'GENERAL',
] as const;
export const CORRECTIVE_ACTION_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export const CORRECTIVE_ACTION_PRIORITIES = [
  'CRITICAL',
  'WARNING',
  'INFO',
] as const;

export class CreateCorrectiveActionDto {
  @IsOptional() @IsUUID() clientIntentId?: string;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsUUID() incidentId?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_CATEGORIES) category?: string;
  @IsString() @MaxLength(500) title!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_STATUSES) status?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_PRIORITIES) priority?: string;
  @IsOptional() @IsString() @MaxLength(300) assignedTo?: string;
  @IsOptional() @IsIn(Object.values(CorrectiveActionAssigneeType)) assigneeType?: CorrectiveActionAssigneeType;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsString() @MaxLength(300) externalAssigneeDisplayName?: string;
  @IsOptional() @IsIn(Object.values(OperationalReviewConfidentiality)) visibility?: OperationalReviewConfidentiality;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateCorrectiveActionDto {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_STATUSES) status?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_PRIORITIES) priority?: string;
  @IsOptional() @IsString() @MaxLength(300) assignedTo?: string;
  @IsOptional() @IsIn(Object.values(CorrectiveActionAssigneeType)) assigneeType?: CorrectiveActionAssigneeType;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsString() @MaxLength(300) externalAssigneeDisplayName?: string;
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  dueDate?: string | null;
}
