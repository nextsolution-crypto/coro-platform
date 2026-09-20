import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePopulationFollowUpDto {
  @IsUUID('4')
  clientIntentId: string;

  /**
   * Communication déjà diffusée servant de point
   * de référence au nouveau suivi.
   */
  @IsString()
  sourceAlertId: string;

  /**
   * Chaque UPDATE / ALL_CLEAR possède son propre contenu.
   *
   * Le texte de la communication source n'est jamais
   * réutilisé automatiquement.
   */
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
