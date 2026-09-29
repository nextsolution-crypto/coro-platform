import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ContractBillingCadence,
  ContractRenewalMode,
  ContractRevisionType,
} from '@prisma/client';

export class ContractReasonDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsInt() @Min(0) lockVersion!: number;
}
export class CreateContractDto {
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{2,63}$/) reference!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsBoolean() isPrimary!: boolean;
  @IsString() priceBookVersionId!: string;
  @IsISO8601() effectiveFrom!: string;
  @IsOptional() @IsISO8601() effectiveUntil?: string;
  @IsISO8601() termStartAt!: string;
  @IsOptional() @IsISO8601() termEndAt?: string;
  @IsEnum(ContractRenewalMode) renewalMode!: ContractRenewalMode;
  @IsOptional() @IsInt() @Min(1) renewalTermMonths?: number;
  @IsOptional() @IsInt() @Min(0) renewalNoticeDays?: number;
  @IsOptional() @IsString() @MaxLength(2000) renewalTerms?: string;
  @IsOptional()
  @IsEnum(ContractBillingCadence)
  billingCadence?: ContractBillingCadence;
}
export class UpdateContractDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsString() @MaxLength(5000) internalNotes?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsInt() @Min(0) lockVersion!: number;
}
export class SignRevisionDto extends ContractReasonDto {
  @IsString() @IsNotEmpty() @MaxLength(200) signedByName!: string;
  @IsOptional() @IsString() @MaxLength(200) signatureReference?: string;
}
export class CreateRevisionDto {
  @IsEnum(ContractRevisionType) revisionType!: ContractRevisionType;
  @IsString() basedOnRevisionId!: string;
  @IsOptional() @IsString() priceBookVersionId?: string;
  @IsISO8601() effectiveFrom!: string;
  @IsOptional() @IsISO8601() effectiveUntil?: string;
  @IsISO8601() termStartAt!: string;
  @IsOptional() @IsISO8601() termEndAt?: string;
  @IsEnum(ContractRenewalMode) renewalMode!: ContractRenewalMode;
  @IsOptional() @IsInt() @Min(1) renewalTermMonths?: number;
  @IsOptional() @IsInt() @Min(0) renewalNoticeDays?: number;
  @IsOptional() @IsString() renewalTerms?: string;
  @IsOptional()
  @IsEnum(ContractBillingCadence)
  billingCadence?: ContractBillingCadence;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
