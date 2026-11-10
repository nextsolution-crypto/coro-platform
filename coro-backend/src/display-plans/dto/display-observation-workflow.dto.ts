import {
  DisplayCorrectionCategory,
  DisplayCorrectionPriority,
  DisplayCorrectionStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DisplayObservationListQueryDto {
  @IsOptional()
  @IsEnum(DisplayCorrectionStatus)
  status?: DisplayCorrectionStatus;
  @IsOptional()
  @IsEnum(DisplayCorrectionPriority)
  priority?: DisplayCorrectionPriority;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsUUID() publicationId?: string;
  @IsOptional() @IsUUID() assignedUserId?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) offset = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}

export class DisplayObservationMutationDto {
  @Type(() => Number) @IsInt() @Min(0) expectedLockVersion!: number;
  @IsString() @IsNotEmpty() @MaxLength(100) requestId!: string;
  @IsString() @IsNotEmpty() @MaxLength(2_000) reason!: string;
}

export class QualifyDisplayObservationDto extends DisplayObservationMutationDto {
  @IsEnum(DisplayCorrectionPriority)
  professionalPriority!: DisplayCorrectionPriority;
  @IsEnum(DisplayCorrectionCategory)
  qualifiedCategory!: DisplayCorrectionCategory;
}

export class AssignDisplayObservationDto extends DisplayObservationMutationDto {
  @IsUUID() assignedUserId!: string;
}

export class MessageDisplayObservationDto extends DisplayObservationMutationDto {
  @IsIn(['INTERNAL', 'CLIENT']) visibility!: 'INTERNAL' | 'CLIENT';
  @IsString() @IsNotEmpty() @MaxLength(4_000) message!: string;
}

export class TransitionDisplayObservationDto extends DisplayObservationMutationDto {
  @IsEnum(DisplayCorrectionStatus) toStatus!: DisplayCorrectionStatus;
  @IsOptional() @IsString() @MaxLength(4_000) clientResponse?: string;
  @IsOptional() @IsString() @MaxLength(80) correctionReferenceType?: string;
  @IsOptional() @IsString() @MaxLength(200) correctionReferenceId?: string;
  @IsOptional() @IsString() @MaxLength(4_000) correctionEvidence?: string;
}
