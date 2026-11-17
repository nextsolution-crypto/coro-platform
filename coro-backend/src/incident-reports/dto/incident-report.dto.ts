import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  IsIn,
} from 'class-validator';
import { IncidentReportStatus } from '@prisma/client';

export class CreateIncidentReportDto {
  @IsUUID() buildingId!: string;
  @IsOptional() @IsUUID() incidentEventId?: string;
  @IsUUID() templateVersionId!: string;
  @IsUUID() retentionPolicyId!: string;
  @IsString() @Length(1, 120) reportType!: string;
  @IsString() @Length(1, 240) title!: string;
  @IsObject() content!: Record<string, unknown>;
  @IsUUID() idempotencyKey!: string;
}

export class UpdateIncidentReportDraftDto {
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsOptional() @IsString() @Length(1, 240) title?: string;
  @IsObject() content!: Record<string, unknown>;
  @IsUUID() idempotencyKey!: string;
}

export class CreateIncidentReportVersionDto {
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsObject() content!: Record<string, unknown>;
  @IsString() @Length(3, 500) reason!: string;
  @IsUUID() idempotencyKey!: string;
}

export class SubmitIncidentReportDto {
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsUUID() idempotencyKey!: string;
}

export class AssignIncidentReportReviewerDto {
  @IsUUID() reviewerUserId!: string;
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsUUID() idempotencyKey!: string;
}

export class IncidentReportDecisionDto {
  @IsIn(['REVIEWED', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'])
  decision!: 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED';
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsUUID() idempotencyKey!: string;
}

export class PublishIncidentReportDto {
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsUUID() idempotencyKey!: string;
}

export class CreateIncidentReportAttachmentDto {
  @IsUUID() reportVersionId!: string;
  @IsString() @Length(1, 240) originalFileName!: string;
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'application/pdf'])
  mediaType!: string;
  @IsString() @Length(1, 15_000_000) fileBase64!: string;
  @IsUUID() idempotencyKey!: string;
}

export class RevokeIncidentReportAttachmentDto {
  @IsString() @Length(3, 500) reason!: string;
  @IsUUID() idempotencyKey!: string;
}

export class PublishIncidentReportTemplateDto {
  @IsUUID() buildingId!: string;
  @IsString() @Length(2, 80) templateKey!: string;
  @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(2, 120) reportType!: string;
  @IsObject() formSchema!: Record<string, unknown>;
  @IsObject() fieldCatalog!: Record<string, unknown>;
  @IsOptional() @IsObject() mappingMetadata?: Record<string, unknown>;
  @IsUUID() idempotencyKey!: string;
}

export enum IncidentReportSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  REPORT_NUMBER = 'reportNumber',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class IncidentReportListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsEnum(IncidentReportStatus) status?: IncidentReportStatus;
  @IsOptional() @IsString() @MaxLength(120) reportType?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;
  @IsOptional() @IsEnum(IncidentReportSortField) sort =
    IncidentReportSortField.CREATED_AT;
  @IsOptional() @IsEnum(SortDirection) order = SortDirection.DESC;
}
