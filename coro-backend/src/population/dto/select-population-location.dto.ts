import { IsString, MinLength } from 'class-validator';

export class SelectPopulationLocationDto {
  @IsString()
  @MinLength(20)
  accessToken: string;

  @IsString()
  @MinLength(20)
  selectionToken: string;
}
