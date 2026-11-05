import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PopulationAlertType } from '@prisma/client';
import {
  PopulationCompassDirection,
  PopulationTargetingMode,
} from './population-directional-targeting.dto';

export class CreatePopulationAlertDraftDto {
  @IsString()
  scenarioId: string;

  /**
   * Incident CORO auquel cette communication est rattachée.
   *
   * Optionnel afin de conserver les usages autonomes
   * comme les tests ou certains brouillons préparatoires.
   *
   * L'appartenance de l'incident au bâtiment est toujours
   * validée côté serveur avant création.
   */
  @IsOptional()
  @IsString()
  incidentEventId?: string;

  @IsEnum(PopulationAlertType)
  type: PopulationAlertType;

  @IsOptional()
  @IsEnum(PopulationTargetingMode)
  targetingMode?: PopulationTargetingMode;

  @IsOptional()
  @IsEnum(PopulationCompassDirection)
  propagationDirection?: PopulationCompassDirection;

  /** Confirmation humaine explicite du périmètre affiché. */
  @IsOptional()
  @IsBoolean()
  targetingConfirmed?: boolean;

  /** Établissements sensibles explicitement retenus après l'aperçu serveur. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  selectedSensitiveAssetIds?: string[];

  @IsString()
  @MaxLength(200)
  titleFR: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEN?: string;

  @IsString()
  messageFR: string;

  @IsOptional()
  @IsString()
  messageEN?: string;

  @IsOptional()
  @IsString()
  instructionFR?: string;

  @IsOptional()
  @IsString()
  instructionEN?: string;
}
