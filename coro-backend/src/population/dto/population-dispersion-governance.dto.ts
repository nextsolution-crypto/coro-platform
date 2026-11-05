import { CoroActorType, RueImpactZonePurpose } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePopulationDispersionBasisDto {
  @IsOptional()
  @IsString()
  sourceProjectFileId?: string;

  @IsString()
  @MaxLength(160)
  modelName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelVersion?: string;

  @IsString()
  @MaxLength(240)
  studyTitle!: string;

  @IsString()
  @MaxLength(240)
  studyReference!: string;

  @IsDateString()
  studyDate!: string;

  @IsString()
  @MaxLength(120)
  endpointName!: string;

  @IsNumber()
  @Min(0.000001)
  @Max(1_000_000)
  endpointConcentrationPpm!: number;

  @IsInt()
  @Min(1)
  @Max(604_800)
  endpointAveragingTimeSeconds!: number;

  @IsNumber()
  @Min(0)
  @Max(150)
  windSpeedMetersPerSecond!: number;

  @IsString()
  @MaxLength(40)
  atmosphericStabilityClass!: string;

  @IsInt()
  @Min(1)
  @Max(604_800)
  releaseDurationSeconds!: number;

  @IsNumber()
  @Min(0)
  @Max(500)
  receptorHeightMeters!: number;

  @IsString()
  @MaxLength(10_000)
  assumptions!: string;

  @IsString()
  @MaxLength(10_000)
  limitations!: string;
}

export class ReviewPopulationDispersionBasisDto {
  @IsBoolean()
  confirmed!: boolean;
}

export class UpdatePopulationImpactZoneGovernanceDto {
  @IsEnum(RueImpactZonePurpose)
  purpose!: RueImpactZonePurpose;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  determinationMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceReference?: string;
}

export class SetPopulationImpactZoneApprovalDto {
  @IsBoolean()
  approved!: boolean;
}

export type PopulationGovernanceActor = {
  type: CoroActorType;
  id: string;
};
