import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const VISUAL_TOKENS = ['BLUE', 'CYAN', 'VIOLET', 'SLATE', 'INDIGO', 'NAVY', 'ORANGE', 'GREEN', 'AMBER', 'ROSE', 'NEUTRAL'] as const;
export const ICON_KEYS = ['EXERCISE', 'INSPECTION', 'TRAINING', 'MEETING', 'AUDIT', 'DOCUMENT', 'FIELD', 'OTHER'] as const;

export class ActivityTypeInputDto {
  @IsString() @MinLength(1) @MaxLength(120) nameFR!: string;
  @IsOptional() @IsString() @MaxLength(120) nameEN?: string;
  @IsOptional() @IsString() @MaxLength(500) descriptionFR?: string;
  @IsOptional() @IsString() @MaxLength(500) descriptionEN?: string;
  @IsIn(VISUAL_TOKENS) visualToken!: (typeof VISUAL_TOKENS)[number];
  @IsOptional() @IsIn(ICON_KEYS) iconKey?: (typeof ICON_KEYS)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1440) defaultDurationMinutes?: number;
  @IsBoolean() clientBookableDefault!: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100000) displayOrder?: number;
}

export class ActivityTypeOrderDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(100000) displayOrder!: number;
}
