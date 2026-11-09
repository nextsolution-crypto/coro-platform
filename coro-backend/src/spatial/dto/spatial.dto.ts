import { SpatialResourceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,39}$/;

export class SpatialListQueryDto {
  @IsOptional()
  @IsEnum(SpatialResourceStatus)
  status?: SpatialResourceStatus;
}

export class CreateFloorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-20)
  @Max(300)
  levelNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-10000)
  @Max(10000)
  sortOrder?: number;
}

export class UpdateFloorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-20)
  @Max(300)
  levelNumber?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-10000)
  @Max(10000)
  sortOrder?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedLockVersion!: number;
}

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsObject()
  geometry?: Record<string, unknown>;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsObject()
  geometry?: Record<string, unknown> | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedLockVersion!: number;
}

export class CreateDisplayLocationDto {
  @IsString()
  @IsNotEmpty()
  floorId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  zoneId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  positionX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  positionY?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  orientationDegrees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  youAreHereX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  youAreHereY?: number;
}

export class UpdateDisplayLocationDto extends CreateDisplayLocationDto {
  @IsOptional()
  declare floorId: string;

  @IsOptional()
  declare code: string;

  @IsOptional()
  declare label: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedLockVersion!: number;
}

export class ArchiveSpatialResourceDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedLockVersion!: number;
}

export function normalizeSpatialCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    throw new Error('INVALID_SPATIAL_CODE');
  }
  return code;
}
