import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PopulationPreferredLanguage } from '@prisma/client';

export class RegisterPopulationSubscriberDto {
  @ValidateIf(
    (dto: RegisterPopulationSubscriberDto) =>
      dto.phone !== undefined || !dto.email,
  )
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ValidateIf(
    (dto: RegisterPopulationSubscriberDto) =>
      dto.email !== undefined || !dto.phone,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsEnum(PopulationPreferredLanguage)
  preferredLanguage: PopulationPreferredLanguage;

  @IsString()
  @MaxLength(100)
  consentVersion: string;
}