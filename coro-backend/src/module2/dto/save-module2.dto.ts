// ============================================================
// CORO — Module 2 DTO
// ============================================================

import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PhoneEntryDto {
  @IsString() @IsOptional() id?: string;
  @IsString() @IsOptional() role?: string;
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() phone?: string;
  @IsBoolean() @IsOptional() isBold?: boolean;
  @IsBoolean() @IsOptional() isFixed?: boolean;
}

export class ExternalEntryDto {
  @IsString() @IsOptional() id?: string;
  @IsString() @IsOptional() role?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() url?: string;
  @IsBoolean() @IsOptional() isBold?: boolean;
  @IsBoolean() @IsOptional() isFixed?: boolean;
}

export class SaveModule2Dto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => PhoneEntryDto) @IsOptional()
  section2_1?: PhoneEntryDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => PhoneEntryDto) @IsOptional()
  section2_2?: PhoneEntryDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => PhoneEntryDto) @IsOptional()
  section2_3?: PhoneEntryDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => ExternalEntryDto) @IsOptional()
  section2_4?: ExternalEntryDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => ExternalEntryDto) @IsOptional()
  section2_5?: ExternalEntryDto[];

  @IsBoolean() @IsOptional()
  section2_5Enabled?: boolean;

  @IsString() @IsOptional()
  internalEmergencyNumber?: string;
}