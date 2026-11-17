import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum DirectiveType {
  PERMANENT = 'PERMANENT', TEMPORARY = 'TEMPORARY', SHIFT_DIRECTIVE = 'SHIFT_DIRECTIVE',
  SPECIAL_INSTRUCTION = 'SPECIAL_INSTRUCTION', OPERATIONAL_NOTICE = 'OPERATIONAL_NOTICE',
}
export enum DirectivePriority { NORMAL = 'NORMAL', IMPORTANT = 'IMPORTANT', CRITICAL = 'CRITICAL' }

export class CreateDirectiveDto {
  @IsUUID() buildingId!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsString() @IsNotEmpty() @MaxLength(20000) description!: string;
  @IsEnum(DirectiveType) type!: DirectiveType;
  @IsEnum(DirectivePriority) priority!: DirectivePriority;
  @IsOptional() @IsString() @MaxLength(120) zoneLabel?: string;
  @IsOptional() @IsString() @MaxLength(120) securityPost?: string;
  @IsOptional() @IsISO8601() effectiveAt?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
  @IsObject() targetCriteria!: Record<string, unknown>;
  @IsOptional() @IsObject() attachments?: Record<string, unknown>;
  @IsOptional() @IsObject() knowledgeReference?: Record<string, unknown>;
  @IsBoolean() acknowledgementRequired!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(160) idempotencyKey!: string;
}

export class DirectiveTransitionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @IsNotEmpty() @MaxLength(160) idempotencyKey!: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

export class AcknowledgeDirectiveDto {
  @IsUUID() versionId!: string;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsOptional() @IsString() @MaxLength(2000) reservation?: string;
  @IsString() @IsNotEmpty() @MaxLength(160) idempotencyKey!: string;
}

export enum FollowUpSource {
  OPERATIONAL_LOG = 'OPERATIONAL_LOG', INCIDENT_REPORT = 'INCIDENT_REPORT', INCIDENT_EVENT = 'INCIDENT_EVENT',
  HANDOVER = 'HANDOVER', DIRECTIVE = 'DIRECTIVE', OBSERVATION = 'OBSERVATION', TECHNICAL_ANOMALY = 'TECHNICAL_ANOMALY',
}
export class CreateFollowUpDto {
  @IsUUID() buildingId!: string;
  @IsEnum(FollowUpSource) sourceType!: FollowUpSource;
  @IsString() @IsNotEmpty() @MaxLength(200) sourceId!: string;
  @IsString() @IsNotEmpty() @MaxLength(10000) description!: string;
  @IsEnum(DirectivePriority) priority!: DirectivePriority;
  @IsOptional() @IsUUID() responsibleUserId?: string;
  @IsOptional() @IsISO8601() dueAt?: string;
  @IsString() @IsNotEmpty() @MaxLength(160) idempotencyKey!: string;
}
export class FollowUpTransitionDto extends DirectiveTransitionDto {
  @IsOptional() @IsUUID() responsibleUserId?: string;
  @IsOptional() @IsObject() evidence?: Record<string, unknown>;
}
export class OperationalListQueryDto {
  @IsUUID() buildingId!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) limit = 50;
}
