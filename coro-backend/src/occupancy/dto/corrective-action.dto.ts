import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsUUID() incidentId?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_CATEGORIES) category?: string;
  @IsString() @MaxLength(500) title!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_STATUSES) status?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_PRIORITIES) priority?: string;
  @IsOptional() @IsString() @MaxLength(300) assignedTo?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateCorrectiveActionDto {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_STATUSES) status?: string;
  @IsOptional() @IsIn(CORRECTIVE_ACTION_PRIORITIES) priority?: string;
  @IsOptional() @IsString() @MaxLength(300) assignedTo?: string;
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  dueDate?: string | null;
}
