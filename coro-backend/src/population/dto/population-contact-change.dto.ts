import {
  IsBoolean,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class InitiatePopulationPhoneChangeDto {
  @IsString() @MinLength(20) accessToken: string;
  @IsString() @MaxLength(50) phone: string;
  @IsBoolean() smsConsent: boolean;
  @IsString() @MaxLength(100) consentVersion: string;
}

export class InitiatePopulationEmailChangeDto {
  @IsString() @MinLength(20) accessToken: string;
  @IsEmail() @MaxLength(254) email: string;
}

export class VerifyPopulationContactChangeDto {
  @IsString() @MinLength(20) accessToken: string;
  @IsString() @MinLength(20) challengeToken: string;
  @IsString() @MinLength(6) @MaxLength(6) code: string;
}

export class PopulationContactChangeActionDto {
  @IsString() @MinLength(20) accessToken: string;
  @IsString() @MinLength(20) challengeToken: string;
}
