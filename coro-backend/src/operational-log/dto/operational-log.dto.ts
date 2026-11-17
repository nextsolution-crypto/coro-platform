import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OperationalLogEntryStatus,
  OperationalLogPriority,
} from '@prisma/client';

export class CreateOperationalLogEntryDto {
  @IsUUID() buildingId!: string;
  @IsOptional() @IsUUID() floorId?: string;
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() incidentEventId?: string;
  @IsOptional() @IsUUID() shiftId?: string;
  @IsISO8601({ strict: true }) eventAt!: string;
  @IsOptional() @IsString() @MaxLength(120) shiftReference?: string;
  @IsOptional() @IsString() @MaxLength(240) locationLabel?: string;
  @IsString() @Length(1, 80) activityType!: string;
  @IsString() @Length(1, 80) category!: string;
  @IsOptional() @IsString() @MaxLength(80) subcategory?: string;
  @IsEnum(OperationalLogPriority) priority!: OperationalLogPriority;
  @IsString() @Length(1, 10_000) description!: string;
  @IsOptional() @IsArray() people?: Record<string, unknown>[];
  @IsOptional() @IsArray() vehicles?: Record<string, unknown>[];
  @IsOptional() @IsArray() equipment?: Record<string, unknown>[];
  @IsOptional() @IsArray() actionsTaken?: Record<string, unknown>[];
  @IsOptional() @IsBoolean() followUpRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) followUpSummary?: string;
  @IsUUID() idempotencyKey!: string;
}

export class UpdateOperationalLogEntryDto {
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsString() @Length(3, 500) correctionReason!: string;
  @IsOptional() @IsString() @MaxLength(240) locationLabel?: string;
  @IsOptional() @IsString() @Length(1, 80) activityType?: string;
  @IsOptional() @IsString() @Length(1, 80) category?: string;
  @IsOptional() @IsString() @MaxLength(80) subcategory?: string;
  @IsOptional()
  @IsEnum(OperationalLogPriority)
  priority?: OperationalLogPriority;
  @IsOptional() @IsString() @Length(1, 10_000) description?: string;
  @IsOptional() @IsArray() people?: Record<string, unknown>[];
  @IsOptional() @IsArray() vehicles?: Record<string, unknown>[];
  @IsOptional() @IsArray() equipment?: Record<string, unknown>[];
  @IsOptional() @IsArray() actionsTaken?: Record<string, unknown>[];
  @IsOptional()
  @IsEnum(OperationalLogEntryStatus)
  status?: OperationalLogEntryStatus;
  @IsOptional() @IsBoolean() followUpRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) followUpSummary?: string;
  @IsUUID() idempotencyKey!: string;
}

export class OperationalLogListQueryDto {
  @IsUUID() buildingId!: string;
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
  @IsOptional()
  @IsEnum(OperationalLogEntryStatus)
  status?: OperationalLogEntryStatus;
  @IsOptional()
  @IsEnum(OperationalLogPriority)
  priority?: OperationalLogPriority;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsISO8601({ strict: true }) from?: string;
  @IsOptional() @IsISO8601({ strict: true }) to?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class AssociateOperationalLogReportDto {
  @IsUUID() reportId!: string;
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsString() @Length(3, 500) reason!: string;
  @IsUUID() idempotencyKey!: string;
}
