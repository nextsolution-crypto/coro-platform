import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class AdditionalOrganizationMemberDto {
  @IsString() @MaxLength(100) firstName: string;
  @IsString() @MaxLength(100) lastName: string;
  @IsEmail() email: string;
  @IsString() @MaxLength(40) role: string;
}

export class CreateOrganizationDto {
  @IsString() @MaxLength(200) organizationName: string;
  @IsIn(['ESSAI_GRATUIT', 'STANDARD', 'ENTREPRISE']) licenseType: string;
  @IsOptional() @IsString() @MaxLength(100) province?: string;
  @IsEmail() adminEmail: string;
  @IsString() @MinLength(8) adminPassword: string;
  @IsString() @MaxLength(100) adminFirstName: string;
  @IsString() @MaxLength(100) adminLastName: string;
  @IsOptional() @IsString() @MaxLength(160) adminTitle?: string;
  @IsOptional() @IsString() @MaxLength(30) referralCode?: string;
  @IsOptional()
  @IsIn(['LINK', 'CODE', 'EMAIL', 'MANUAL', 'ADMIN'])
  referralSource?: 'LINK' | 'CODE' | 'EMAIL' | 'MANUAL' | 'ADMIN';
  @IsOptional() @IsISO8601() referralFirstTouchAt?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalOrganizationMemberDto)
  additionalMembers?: AdditionalOrganizationMemberDto[];
}
