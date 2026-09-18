import { IsString, MinLength } from 'class-validator';

export class ConfirmPopulationLocationDto {
  @IsString()
  @MinLength(20)
  accessToken: string;

  @IsString()
  @MinLength(20)
  resolutionToken: string;
}
