import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ConfigurePopulationProgramDto {
  /**
   * Identifiant public stable utilisé par le futur portail citoyen.
   *
   * Exemple :
   * sobeys-boucherville
   */
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'publicSlug doit contenir uniquement des lettres minuscules, chiffres et tirets',
  })
  publicSlug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameFR: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEN?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionFR?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEN?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  publicPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  publicEmail?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  @MaxLength(500)
  websiteUrl?: string;

  /**
   * Autoriser ou non de nouvelles inscriptions citoyennes.
   *
   * Cette propriété ne rend PAS le programme opérationnel.
   */
  @IsBoolean()
  registrationEnabled: boolean;

  @IsBoolean()
  smsEnabled: boolean;

  @IsBoolean()
  emailEnabled: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  privacyTextFR?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  privacyTextEN?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  consentTextFR?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  consentTextEN?: string;

  /**
   * Obligatoire lorsqu'un texte de consentement est fourni.
   * La validation métier d'activation sera plus stricte.
   */
  @ValidateIf(
    (dto: ConfigurePopulationProgramDto) =>
      Boolean(dto.consentTextFR || dto.consentTextEN),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  consentVersion?: string;
}