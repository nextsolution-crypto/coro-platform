import { IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class StartIncidentReportImportRunDto {
  @IsUUID() fileId!: string;
  @IsUUID() mappingId!: string;
  @IsUUID() idempotencyKey!: string;
}

export class ProcessIncidentReportImportRunDto {
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsInt() @Min(1) @Max(100) batchSize = 50;
  @IsUUID() idempotencyKey!: string;
}

export class RollbackIncidentReportImportRunDto {
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsString() @MaxLength(500) reason!: string;
  @IsUUID() idempotencyKey!: string;
}
