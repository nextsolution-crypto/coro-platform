import { CommercialLegalFieldApplicability } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateLegalIssuerDraftDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @Length(1, 300) legalName!: string;
  @IsOptional() @IsString() @MaxLength(300) tradeName?: string;
  @IsOptional() @IsString() @MaxLength(200) legalForm?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) country?: string;
  @IsOptional() @IsString() @MaxLength(100) subdivision?: string;
  @IsOptional() @IsString() @MaxLength(300) addressLine1?: string;
  @IsOptional() @IsString() @MaxLength(300) addressLine2?: string;
  @IsOptional() @IsString() @MaxLength(150) city?: string;
  @IsOptional() @IsString() @MaxLength(30) postalCode?: string;
  @IsOptional() @IsEmail() officialEmail?: string;
  @IsOptional() @IsString() @MaxLength(50) officialPhone?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsString() @MaxLength(100) businessNumber?: string;
  @IsEnum(CommercialLegalFieldApplicability)
  businessNumberApplicability!: CommercialLegalFieldApplicability;
  @IsOptional() @IsString() @MaxLength(100) federalTaxNumber?: string;
  @IsEnum(CommercialLegalFieldApplicability)
  federalTaxApplicability!: CommercialLegalFieldApplicability;
  @IsOptional() @IsString() @MaxLength(100) provincialTaxNumber?: string;
  @IsEnum(CommercialLegalFieldApplicability)
  provincialTaxApplicability!: CommercialLegalFieldApplicability;
  @IsOptional() @Matches(/^[A-Z]{3}$/) referenceCurrency?: string;
  @IsOptional() @IsString() @MaxLength(300) representativeName?: string;
  @IsOptional() @IsString() @MaxLength(200) representativeTitle?: string;
  @IsOptional() @IsEmail() representativeEmail?: string;
  @IsOptional() @IsString() @MaxLength(300) authorizedSignatoryName?: string;
  @IsOptional() @IsString() @MaxLength(200) authorizedSignatoryTitle?: string;
  @IsOptional() @IsEmail() authorizedSignatoryEmail?: string;
  @IsString() @Length(1, 100) provenance!: string;
}

export class LegalIssuerReasonDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @Length(1, 1000) reason!: string;
}

export class CaptureLegalIssuerSnapshotDto {
  @IsString() @Length(1, 100) issuerCode!: string;
}
