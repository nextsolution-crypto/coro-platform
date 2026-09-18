import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PopulationAlertType } from '@prisma/client';

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