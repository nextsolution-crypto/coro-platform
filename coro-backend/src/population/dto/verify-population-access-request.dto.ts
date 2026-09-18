import { IsString, Length, MinLength } from 'class-validator';

export class VerifyPopulationAccessRequestDto {
  @IsString()
  @MinLength(20)
  accessRequestToken: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
