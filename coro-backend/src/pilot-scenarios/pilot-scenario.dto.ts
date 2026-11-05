import { PilotCheckStatus, PilotRunEnvironment } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePilotScenarioDto {
  @IsString()
  @Matches(/^[A-Z0-9_]{3,80}$/)
  scenarioKey!: string;

  @IsString()
  @Length(3, 160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  organizationId!: string;

  @IsUUID()
  buildingId!: string;

  @IsUUID()
  projectId!: string;

  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class CreatePilotRunDto {
  @IsEnum(PilotRunEnvironment)
  environment!: PilotRunEnvironment;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{40}$/)
  sourceCommit?: string;

  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class UpdatePilotCheckDto {
  @IsEnum(PilotCheckStatus)
  status!: PilotCheckStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  evidence?: Record<string, string | number | boolean | null>;

  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class CompletePilotRunDto {
  @IsString()
  @Length(3, 500)
  reason!: string;
}
