import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PopulationVerificationChannel } from '@prisma/client';

export class RequestPopulationAccessByDestinationDto {
  @IsEnum(PopulationVerificationChannel)
  channel: PopulationVerificationChannel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  destination: string;
}
