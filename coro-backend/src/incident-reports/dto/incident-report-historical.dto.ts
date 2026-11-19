import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class IncidentReportHistoricalListQueryDto {
  @IsUUID() buildingId!: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() @MaxLength(64) sourceSystem?: string;
  @IsOptional() @IsDateString({ strict: true }) importedFrom?: string;
  @IsOptional() @IsDateString({ strict: true }) importedTo?: string;
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 25;
}
