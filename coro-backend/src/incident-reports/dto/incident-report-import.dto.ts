import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateIncidentReportImportBatchDto {
  @IsUUID() buildingId!: string;
  @IsString() @MaxLength(64) sourceSystem!: string;
  @IsOptional() @IsString() @MaxLength(32) sourceSchemaVersion?: string;
  @IsUUID() idempotencyKey!: string;
}

export class StageIncidentReportImportFileDto {
  @IsString() @MaxLength(255) originalFileName!: string;
  @IsIn(['text/csv', 'application/json']) mediaType!:
    | 'text/csv'
    | 'application/json';
  @IsString() @MaxLength(28_000_000) fileBase64!: string;
  @IsUUID() idempotencyKey!: string;
}

export class AnalyzeIncidentReportImportFileDto {
  @IsInt() @Min(0) @Max(100_000) expectedMaximumRecords = 100_000;
  @IsUUID() idempotencyKey!: string;
}

export class IncidentReportImportListQueryDto {
  @IsUUID() buildingId!: string;
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 25;
}
