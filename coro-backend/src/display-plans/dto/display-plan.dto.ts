import {
  DisplayPlanLanguage,
  DisplayPlanOrientation,
  DisplayPlanPublicationStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export class CreateDisplayPlanPublicationDto {
  @IsUUID()
  floorId!: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsUUID()
  locationId!: string;

  @IsUUID()
  projectFileId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sourceVersion!: number;

  @IsEnum(DisplayPlanOrientation)
  orientation!: DisplayPlanOrientation;

  @IsEnum(DisplayPlanLanguage)
  language!: DisplayPlanLanguage;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  requestId!: string;
}

export class DisplayPlanListQueryDto {
  @IsOptional()
  @IsEnum(DisplayPlanPublicationStatus)
  status?: DisplayPlanPublicationStatus;

  @IsOptional()
  @IsUUID()
  floorId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  offset = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class DisplayPlanMutationDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedLockVersion!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  requestId!: string;
}

export const DISPLAY_PLAN_VISUAL_PROFILES = [
  'SOURCE_NATIVE',
  'ORIGINAL_17X11',
  'SCREEN_16X9',
  'SCREEN_16X10',
] as const;

export class ApproveDisplayPlanDto extends DisplayPlanMutationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sourceVersion!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-f0-9]{64}$/i)
  sourceSha256!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantVersion!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-f0-9]{64}$/i)
  variantSha256!: string;

  @IsIn(DISPLAY_PLAN_VISUAL_PROFILES)
  profile!: (typeof DISPLAY_PLAN_VISUAL_PROFILES)[number];

  @IsUUID()
  locationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  observations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reservations?: string;
}

export class PublishDisplayPlanDto extends DisplayPlanMutationDto {
  @IsOptional()
  @IsString()
  validFrom?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;
}

export class EnqueueDisplayPdfRenderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  requestId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageNumber = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(72)
  @Max(300)
  targetDpi = 300;
}
