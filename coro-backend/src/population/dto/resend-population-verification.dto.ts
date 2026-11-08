import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PopulationVerificationChannel } from '@prisma/client';

export class ResendPopulationVerificationDto {
  @IsEnum(PopulationVerificationChannel)
  channel: PopulationVerificationChannel;

  @IsOptional()
  @IsString()
  accessToken?: string;
}
