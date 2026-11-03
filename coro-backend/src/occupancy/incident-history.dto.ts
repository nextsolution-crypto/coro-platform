import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const INCIDENT_HISTORY_PAGE_SIZE_MAX = 100;

export enum IncidentHistoryExerciseFilter {
  ALL = 'ALL',
  REAL = 'REAL',
  EXERCISE = 'EXERCISE',
}

export enum IncidentHistoryStatusFilter {
  ALL = 'ALL',
  OPEN = 'OPEN',
  PRE_ALERT = 'PRE_ALERT',
  ACTIVE = 'ACTIVE',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export class IncidentHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INCIDENT_HISTORY_PAGE_SIZE_MAX)
  pageSize = 25;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  search = '';

  @IsOptional()
  @IsEnum(IncidentHistoryStatusFilter)
  status = IncidentHistoryStatusFilter.ALL;

  @IsOptional()
  @IsEnum(IncidentHistoryExerciseFilter)
  exercise = IncidentHistoryExerciseFilter.ALL;

  @IsOptional()
  @IsIn(['triggeredAt', 'status', 'type'])
  sortBy: 'triggeredAt' | 'status' | 'type' = 'triggeredAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
