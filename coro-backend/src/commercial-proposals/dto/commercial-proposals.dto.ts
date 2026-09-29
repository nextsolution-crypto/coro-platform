import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO31661Alpha2,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BillingPeriod,
  CommercialRelationship,
  ContractCommitmentPeriod,
  ContractCommitmentType,
  ContractTerritoryType,
  PriceChargeType,
  PriceMetric,
  PricingModel,
  ProposalAdjustmentScope,
  ProposalAdjustmentType,
  ProposalCalculationStatus,
  ProposalInputCategory,
  ProposalInputSource,
  ProposalInputValueType,
  ProposalLanguage,
  ProposalLineSource,
  TierCalculationMode,
} from '@prisma/client';

export class CreateProspectDto {
  @IsString() reference!: string;
  @IsString() legalName!: string;
  @IsString() displayName!: string;
  @IsEnum(ProposalLanguage) preferredLanguage!: ProposalLanguage;
  @IsISO31661Alpha2() country!: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactTitle?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() subdivision?: string;
  @IsOptional() @IsString() postalCode?: string;
}
export class ConvertProspectDto {
  @IsString() reason!: string;
  @IsOptional() @IsString() organizationName?: string;
}
export class CreateProposalDto {
  @IsString() reference!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() prospectId?: string;
}
export class CreateRevisionDto {
  @IsOptional() @IsString() basedOnRevisionId?: string;
  @IsOptional() @IsString() sourcePriceBookVersionId?: string;
  @IsEnum(CommercialRelationship) relationship!: CommercialRelationship;
  @IsEnum(ProposalLanguage) preferredLanguage!: ProposalLanguage;
  @IsString() recipientLegalName!: string;
  @IsString() recipientDisplayName!: string;
  @IsISO31661Alpha2() recipientCountry!: string;
  @IsOptional() @IsString() recipientContactName?: string;
  @IsOptional() @IsEmail() recipientEmail?: string;
  @IsOptional() @IsISO8601() validUntil?: string;
}
export class ProposalInputDto {
  @IsString() code!: string;
  @IsEnum(ProposalInputCategory) category!: ProposalInputCategory;
  @IsEnum(ProposalInputValueType) valueType!: ProposalInputValueType;
  @IsEnum(ProposalInputSource) source!: ProposalInputSource;
  @IsOptional() @Matches(/^\d+(\.\d{1,6})?$/) decimalValue?: string;
  @IsOptional() @Matches(/^\d+$/) integerValue?: string;
  @IsOptional() @Matches(/^\d+$/) moneyMinor?: string;
  @IsOptional() @IsBoolean() booleanValue?: boolean;
  @IsOptional() @IsString() textValue?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() unit?: string;
  @IsString() labelFR!: string;
  @IsOptional() @IsString() labelEN?: string;
  @IsOptional() @IsString() justification?: string;
  @IsOptional() @IsString() capabilityId?: string;
  @IsOptional() @IsString() proposalLineId?: string;
  @IsInt() @Min(0) displayOrder!: number;
}
export class ProposalAdjustmentDto {
  @IsEnum(ProposalAdjustmentScope) scope!: ProposalAdjustmentScope;
  @IsEnum(ProposalAdjustmentType) adjustmentType!: ProposalAdjustmentType;
  @IsOptional() @IsInt() @Min(0) @Max(10000) discountBasisPoints?: number;
  @IsOptional() @Matches(/^\d+$/) overrideAmountMinor?: string;
  @IsString() justification!: string;
  @IsInt() @Min(0) displayOrder!: number;
}
export class ProposalTierDto {
  @Matches(/^\d+$/) minimumQuantity!: string;
  @IsOptional() @Matches(/^\d+$/) maximumQuantity?: string;
  @Matches(/^\d+$/) amountMinor!: string;
  @IsInt() @Min(0) displayOrder!: number;
}
export class ProposalLineDto {
  @IsEnum(ProposalLineSource) source!: ProposalLineSource;
  @IsOptional() @IsString() sourcePriceComponentId?: string;
  @IsOptional() @IsString() capabilityId?: string;
  @IsString() componentCode!: string;
  @IsString() componentNameFR!: string;
  @IsOptional() @IsString() componentNameEN?: string;
  @IsEnum(PricingModel) pricingModel!: PricingModel;
  @IsEnum(PriceChargeType) chargeType!: PriceChargeType;
  @IsOptional() @IsEnum(BillingPeriod) billingPeriod?: BillingPeriod;
  @IsOptional() @IsEnum(PriceMetric) metric?: PriceMetric;
  @IsOptional() @IsEnum(TierCalculationMode) tierMode?: TierCalculationMode;
  @IsOptional() @Matches(/^\d+$/) quantity?: string;
  @IsOptional() @IsString() quantityUnit?: string;
  @IsOptional() @Matches(/^\d+$/) amountMinor?: string;
  @IsEnum(ProposalCalculationStatus)
  requestedStatus!: ProposalCalculationStatus;
  @IsBoolean() internalUse!: boolean;
  @IsBoolean() distributable!: boolean;
  @IsOptional() @Matches(/^\d+$/) distributionLimit?: string;
  @IsOptional() @IsEnum(PriceMetric) distributionMetric?: PriceMetric;
  @IsOptional() @IsString() justification?: string;
  @IsInt() @Min(0) displayOrder!: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalTierDto)
  tiers!: ProposalTierDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalAdjustmentDto)
  adjustments!: ProposalAdjustmentDto[];
}
export class ProposalCommitmentDto {
  @IsEnum(ContractCommitmentType) type!: ContractCommitmentType;
  @IsEnum(ContractCommitmentPeriod) period!: ContractCommitmentPeriod;
  @IsOptional() @Matches(/^\d+$/) amountMinor?: string;
  @IsOptional() @Matches(/^\d+(\.\d{1,6})?$/) quantity?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() description?: string;
}
export class ProposalExclusivitySectorDto {
  @IsString() sectorCode!: string;
  @IsString() sectorLabel!: string;
}
export class ProposalExclusivityDto {
  @IsEnum(ContractTerritoryType) territoryType!: ContractTerritoryType;
  @IsOptional() @IsString() territoryCode?: string;
  @IsString() territoryLabel!: string;
  @IsISO8601() startsAt!: string;
  @IsOptional() @IsISO8601() endsAt?: string;
  @IsBoolean() hasEconomicImpact!: boolean;
  @IsOptional() @IsString() economicComponentCode?: string;
  @IsOptional() @IsString() conditions?: string;
  @IsOptional() @IsString() renewalTerms?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalExclusivitySectorDto)
  sectors!: ProposalExclusivitySectorDto[];
  @IsArray() @IsString({ each: true }) capabilityIds!: string[];
}
export class ConfigureRevisionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalInputDto)
  inputs!: ProposalInputDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalLineDto)
  lines!: ProposalLineDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalAdjustmentDto)
  globalAdjustments!: ProposalAdjustmentDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalExclusivityDto)
  exclusivities!: ProposalExclusivityDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalCommitmentDto)
  commitments!: ProposalCommitmentDto[];
  @IsBoolean() includeEstimatedUsageInFirstYear!: boolean;
  @IsOptional() @IsString() contextFR?: string;
  @IsOptional() @IsString() contextEN?: string;
  @IsOptional() @IsString() termsFR?: string;
  @IsOptional() @IsString() termsEN?: string;
}
export class ValueAnalysisDto {
  @Matches(/^\d+(\.\d{1,6})?$/) mandatesPerYear!: string;
  @Matches(/^\d+(\.\d{1,6})?$/) averageHoursPerMandate!: string;
  @Matches(/^\d+$/) billableRateMinorPerHour!: string;
  @IsInt() @Min(0) @Max(10000) productivityGainBasisPoints!: number;
  @IsString() disclaimerFR!: string;
  @IsOptional() @IsString() disclaimerEN?: string;
}
export class TransitionProposalDto {
  @IsString() reason!: string;
  @IsInt() @Min(0) lockVersion!: number;
  @IsOptional() @IsString() acceptedByName?: string;
  @IsOptional() @IsString() acceptanceReference?: string;
  @IsOptional() @IsString() sentDocumentId?: string;
}
export class GenerateProposalPdfDto {
  @IsEnum(ProposalLanguage) language!: ProposalLanguage;
  @IsString() idempotencyKey!: string;
}
export class SnapshotPopulationDto {
  @IsString()
  facilityProfileId!: string;
}
export class CreateContractFromProposalDto {
  @IsString() reason!: string;
  @IsString() reference!: string;
  @IsString() title!: string;
}
