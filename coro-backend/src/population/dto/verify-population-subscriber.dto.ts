import {
  IsEnum,
  IsString,
  Length,
} from 'class-validator';
import { PopulationVerificationChannel } from '@prisma/client';

export class VerifyPopulationSubscriberDto {
  @IsEnum(PopulationVerificationChannel)
  channel: PopulationVerificationChannel;

  @IsString()
  @Length(6, 6)
  code: string;
}