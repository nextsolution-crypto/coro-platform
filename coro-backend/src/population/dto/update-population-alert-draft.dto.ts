import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PopulationAlertType } from '@prisma/client';

export class UpdatePopulationAlertDraftDto {
  @IsOptional()
  @IsEnum(PopulationAlertType)
  type?: PopulationAlertType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleFR?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEN?: string;

  @IsOptional()
  @IsString()
  messageFR?: string;

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