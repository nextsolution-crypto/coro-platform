import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class IncidentReportImportMappingRuleDto {
  @IsString() @MaxLength(128) sourceHeader!: string;
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z][a-z0-9_.-]*$/)
  canonicalField!: string;
  @IsIn(['NONE', 'TRIM', 'UPPERCASE', 'DATE_ISO', 'NUMBER'])
  transform!: 'NONE' | 'TRIM' | 'UPPERCASE' | 'DATE_ISO' | 'NUMBER';
  @IsBoolean() required!: boolean;
}

export class ConfigureIncidentReportImportMappingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => IncidentReportImportMappingRuleDto)
  rules!: IncidentReportImportMappingRuleDto[];
  @IsUUID() idempotencyKey!: string;
}

export class PreviewIncidentReportImportDto {
  @IsUUID() fileId!: string;
  @IsUUID() mappingId!: string;
  @IsInt() @Min(1) @Max(100) maximumPreviewRows = 50;
  @IsUUID() idempotencyKey!: string;
}
