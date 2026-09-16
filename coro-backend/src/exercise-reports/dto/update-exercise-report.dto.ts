import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ExerciseFindingType, ExerciseTimelineEntryType } from '@prisma/client';

const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

class ProvenanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceRef?: string | null;
}

class KeyedDto extends ProvenanceDto {
  @IsString()
  @Matches(KEY_PATTERN)
  key!: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  order!: number;
}

export class ExerciseParticipantDto extends KeyedDto {
  @IsString() @MaxLength(300) name!: string;
  @IsOptional() @IsString() @MaxLength(100) status?: string | null;
  @IsOptional() @IsString() @MaxLength(200) simulatedRole?: string | null;
  @IsOptional() @IsString() @MaxLength(200) teamFunction?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) observations?: string | null;
}

export class ExerciseTimelineEntryDto extends KeyedDto {
  @IsOptional() @IsDateString() occurredAt?: string | null;
  @IsEnum(ExerciseTimelineEntryType) type!: ExerciseTimelineEntryType;
  @IsString() @MaxLength(500) event!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string | null;
}

export class ExerciseFindingDto extends KeyedDto {
  @IsEnum(ExerciseFindingType) type!: ExerciseFindingType;
  @IsOptional() @IsString() @MaxLength(500) title?: string | null;
  @IsString() @MaxLength(10000) description!: string;
  @IsOptional() @IsString() @MaxLength(50) priority?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) impact?: string | null;
}

export class ExerciseRecommendationDto extends KeyedDto {
  @IsString() @Matches(KEY_PATTERN) findingKey!: string;
  @IsString() @MaxLength(10000) text!: string;
  @IsOptional() @IsString() @MaxLength(50) priority?: string | null;
}

export class ExerciseActionItemDto extends KeyedDto {
  @IsOptional() @IsString() @Matches(KEY_PATTERN) findingKey?: string | null;
  @IsOptional() @IsString() @Matches(KEY_PATTERN) recommendationKey?:
    | string
    | null;
  @IsString() @MaxLength(500) title!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(300) assignedTo?: string | null;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @MaxLength(50) priority?: string | null;
}

export class UpdateExerciseReportDto {
  @IsOptional() @IsDateString() scheduledAt?: string | null;
  @IsOptional() @IsDateString() occurredAt?: string | null;
  @IsOptional() @IsDateString() startedAt?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(10080) durationMinutes?: number | null;
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  zones?: string[];
  @IsOptional() @IsString() @MaxLength(100) level?: string | null;
  @IsOptional() @IsString() @MaxLength(100) difficulty?: string | null;
  @IsOptional() @IsString() @MaxLength(20000) scenario?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) positiveIntro?: string | null;
  @IsOptional() @IsString() @MaxLength(100) globalRating?: string | null;
  @IsOptional() @IsString() @MaxLength(500) summaryTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(20000) conclusion?: string | null;
  @IsOptional() @IsString() @MaxLength(300) preparedBy?: string | null;
  @IsOptional() @IsString() @MaxLength(500) recipient?: string | null;
  @IsOptional() @IsDateString() conclusionDate?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExerciseParticipantDto)
  participants?: ExerciseParticipantDto[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ExerciseTimelineEntryDto)
  timelineEntries?: ExerciseTimelineEntryDto[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => ExerciseFindingDto)
  findings?: ExerciseFindingDto[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExerciseRecommendationDto)
  recommendations?: ExerciseRecommendationDto[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExerciseActionItemDto)
  actionItems?: ExerciseActionItemDto[];
}
