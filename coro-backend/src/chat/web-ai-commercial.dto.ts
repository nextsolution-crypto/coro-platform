import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class WebAICommercialRequestDto {
  @IsUUID('4') idempotencyKey!: string;
  @IsIn(['DEMO', 'QUOTE', 'CONTACT', 'PARTNERSHIP']) requestType!: 'DEMO' | 'QUOTE' | 'CONTACT' | 'PARTNERSHIP';
  @IsString() @MinLength(2) @MaxLength(160) @Transform(trim) contactName!: string;
  @IsString() @MinLength(2) @MaxLength(200) @Transform(trim) organizationName!: string;
  @IsOptional() @IsString() @MaxLength(160) @Transform(trim) contactTitle?: string;
  @IsEmail() @MaxLength(254) @Transform(trim) email!: string;
  @IsOptional() @IsString() @MaxLength(80) @Transform(trim) sector?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100_000) buildingCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) estimatedUsers?: number;
  @IsOptional() @IsString() @MaxLength(500) @Transform(trim) primaryNeed?: string;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(80, { each: true }) interestedModules: string[] = [];
  @IsOptional() @IsString() @MaxLength(80) @Transform(trim) timeline?: string;
  @IsIn(['fr-CA', 'en-CA']) preferredLanguage!: 'fr-CA' | 'en-CA';
  @IsBoolean() consentToProcess!: boolean;
  @Equals('web-ai-commercial-v1') consentTextVersion!: 'web-ai-commercial-v1';
  @Equals('CHECKBOX_AND_SUBMIT') consentAction!: 'CHECKBOX_AND_SUBMIT';
  @IsBoolean() marketingConsent = false;
}
