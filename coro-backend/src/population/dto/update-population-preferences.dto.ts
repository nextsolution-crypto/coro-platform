import { IsEnum, IsString, MinLength } from 'class-validator';
import { PopulationPreferredLanguage } from '@prisma/client';

export class UpdatePopulationPreferencesDto {
  @IsString()
  @MinLength(20)
  accessToken: string;

  @IsEnum(PopulationPreferredLanguage)
  preferredLanguage: PopulationPreferredLanguage;
}