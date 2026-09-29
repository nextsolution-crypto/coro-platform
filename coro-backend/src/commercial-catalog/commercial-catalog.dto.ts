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
  BillingPeriod,
  CapabilityLifecycle,
  CapabilityScopeStatus,
  CommercialRelationship,
  CommercialScope,
  PriceBookAudience,
  PriceChargeType,
  PriceMetric,
  PricingModel,
  TierCalculationMode,
} from '@prisma/client';

export class ReasonDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
export class UpdateCommercialIdentityDto extends ReasonDto {
  @IsOptional()
  @IsEnum(CommercialRelationship)
  commercialRelationship!: CommercialRelationship | null;
}
export class UpdateCapabilityDto {
  @IsOptional() @IsString() @MaxLength(200) nameFr?: string;
  @IsOptional() @IsString() @MaxLength(200) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionFr?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @IsOptional() @IsEnum(CapabilityLifecycle) lifecycle?: CapabilityLifecycle;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
export class UpdateScopeDto extends ReasonDto {
  @IsEnum(CommercialScope) scope!: CommercialScope;
  @IsEnum(CapabilityScopeStatus) status!: CapabilityScopeStatus;
}
export class CreatePriceBookDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{2,63}$/) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsEnum(PriceBookAudience) audience!: PriceBookAudience;
  @IsString() @Matches(/^CAD$/) currency!: string;
}
export class UpdatePriceBookDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
}
export class CreateVersionDto {
  @IsOptional() @IsISO8601() effectiveFrom?: string;
  @IsOptional() @IsISO8601() effectiveUntil?: string;
}
export class UpdateVersionDto {
  @IsOptional() @IsISO8601() effectiveFrom?: string;
  @IsOptional() @IsISO8601() effectiveUntil?: string;
}
export class PublishVersionDto extends ReasonDto {
  @IsISO8601() effectiveFrom!: string;
  @IsOptional() @IsISO8601() effectiveUntil?: string;
}
export class CreateComponentDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,63}$/) code!: string;
  @IsString() capabilityCode!: string;
  @IsString() @IsNotEmpty() nameFr!: string;
  @IsString() @IsNotEmpty() nameEn!: string;
  @IsOptional() @IsString() descriptionFr?: string;
  @IsOptional() @IsString() descriptionEn?: string;
  @IsEnum(PricingModel) pricingModel!: PricingModel;
  @IsEnum(PriceChargeType) chargeType!: PriceChargeType;
  @IsOptional() @IsEnum(BillingPeriod) billingPeriod?: BillingPeriod;
  @IsOptional() @IsEnum(PriceMetric) metric?: PriceMetric;
  @IsOptional() @IsEnum(TierCalculationMode) tierMode?: TierCalculationMode;
  @IsOptional() @IsString() @Matches(/^\d+$/) amountMinor?: string;
  @IsInt() @Min(0) displayOrder!: number;
}
export class UpdateComponentDto extends CreateComponentDto {}
export class CreateTierDto {
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) minimumQuantity!: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/)
  maximumQuantity?: string;
  @IsString() @Matches(/^\d+$/) amountMinor!: string;
  @IsInt() @Min(0) displayOrder!: number;
}
export class UpdateTierDto extends CreateTierDto {}
