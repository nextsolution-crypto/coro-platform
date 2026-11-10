import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  DisplayCorrectionCategory,
  DisplayCorrectionPriority,
} from '@prisma/client';

export class ClientDisplayListQueryDto {
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset = 0;
}

export class ClientDisplayObservationListQueryDto {
  @IsOptional() @IsUUID() buildingId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset = 0;
}

export class SubmitDisplayCorrectionDto {
  @IsUUID() requestId!: string;
  @IsUUID() buildingId!: string;
  @IsUUID() publicationId!: string;
  @IsUUID() locationId!: string;
  @IsEnum(DisplayCorrectionCategory) category!: DisplayCorrectionCategory;
  @IsString() @Length(10, 4000) description!: string;
  @IsEnum(DisplayCorrectionPriority)
  suggestedPriority!: DisplayCorrectionPriority;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  normalizedX?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  normalizedY?: number;
}
