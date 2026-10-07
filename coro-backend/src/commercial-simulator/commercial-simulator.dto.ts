import { Type } from 'class-transformer';
import { CommercialRevenueCategory } from '@prisma/client';
import {
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateWorkspaceDto {
  @IsString() @Length(1, 255) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsUUID() prospectId?: string;
  @IsUUID() priceBookVersionId!: string;
}

export class ConfiguratorTargetQueryDto {
  @IsOptional() @IsString() @Length(1, 100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(25) pageSize = 10;
}

export class ConfiguratorPriceBookQueryDto {
  @IsIn(['ORGANIZATION', 'PROSPECT']) targetType!: 'ORGANIZATION' | 'PROSPECT';
  @IsUUID() targetId!: string;
  @IsOptional() @IsIn(['DIRECT', 'PARTNER']) audience?: 'DIRECT' | 'PARTNER';
  @IsOptional() @IsIn(['CAD']) currency = 'CAD';
  @IsOptional() @IsISO8601() asOf?: string;
}

export class CreateGuidedWorkspaceDto extends CreateWorkspaceDto {
  @IsOptional() @IsIn(['DIRECT', 'PARTNER']) audience?: 'DIRECT' | 'PARTNER';
}

export class CreateScenarioDto {
  @IsString() @Length(1, 255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class UpdateScenarioMetadataDto {
  @IsString() @Length(1, 255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(0) lockVersion!: number;
}

export class ScenarioMutationDto {
  @IsInt() @Min(0) lockVersion!: number;
}

export class GuidedDriverValueDto {
  @IsString() driverCode!: string;
  @IsString() value!: string;
  @IsOptional() @IsString() justification?: string;
}

export class GuidedCostEffortDto {
  @IsIn(['DELIVERY_PROFESSIONAL', 'SENIOR_REVIEWER'])
  role!: 'DELIVERY_PROFESSIONAL' | 'SENIOR_REVIEWER';
  @Matches(/^(?=.*[1-9])\d+(?:\.\d{1,6})?$/) hours!: string;
  @IsOptional() @IsString() justification?: string;
}

export class GuidedCatalogLineDto {
  @IsUUID() priceComponentId!: string;
  @IsOptional()
  @Matches(/^(?=.*[1-9])\d+(?:\.\d{1,6})?$/)
  quantity?: string;
  @IsOptional() @Matches(/^\d+(?:\.\d{1,2})?$/) proposedUnitAmountCad?: string;
  @IsOptional() @IsString() justification?: string;
  @IsOptional() @IsIn(['DECLARED']) commercialQuantityBasis?: 'DECLARED';
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedCostEffortDto)
  costEfforts?: GuidedCostEffortDto[];
}

export class GuidedCustomLineDto {
  @IsOptional() @IsUUID() lineId?: string;
  @IsString() @Length(1, 255) name!: string;
  @IsIn(['CUSTOM_COMPONENT', 'PROFESSIONAL_SERVICE'])
  source!: 'CUSTOM_COMPONENT' | 'PROFESSIONAL_SERVICE';
  @IsIn(['FLAT', 'PER_UNIT']) pricingModel!: 'FLAT' | 'PER_UNIT';
  @IsIn(['RECURRING', 'ONE_TIME']) chargeType!: 'RECURRING' | 'ONE_TIME';
  @IsIn(Object.values(CommercialRevenueCategory))
  revenueCategory!: CommercialRevenueCategory;
  @IsOptional() @IsIn(['MONTH', 'YEAR']) billingPeriod?: 'MONTH' | 'YEAR';
  @IsOptional() @IsIn(['FIXED', 'HOUR']) metric?: 'FIXED' | 'HOUR';
  @IsOptional()
  @Matches(/^(?=.*[1-9])\d+(?:\.\d{1,6})?$/)
  quantity?: string;
  @IsOptional() @IsIn(['DECLARED']) commercialQuantityBasis?: 'DECLARED';
  @Matches(/^\d+(?:\.\d{1,2})?$/) unitAmountCad!: string;
  @IsString() @Length(1, 1000) justification!: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedCostEffortDto)
  costEfforts?: GuidedCostEffortDto[];
}

export class GuidedConfigureScenarioDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) familyCodes!: string[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedCatalogLineDto)
  catalogLines!: GuidedCatalogLineDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedCustomLineDto)
  customLines!: GuidedCustomLineDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedDriverValueDto)
  driverValues!: GuidedDriverValueDto[];
}

export class DriverValueDto {
  @IsString() driverCode!: string;
  @IsString() driverVersion!: string;
  @IsOptional() @IsString() scopeKey?: string;
  @IsIn(['DECIMAL', 'INTEGER', 'MONEY', 'BOOLEAN', 'TEXT']) valueType!:
    | 'DECIMAL'
    | 'INTEGER'
    | 'MONEY'
    | 'BOOLEAN'
    | 'TEXT';
  @IsIn([
    'USER_INPUT',
    'CUSTOMER_INPUT',
    'SYSTEM_CONFIGURATION',
    'CONTRACT',
    'METERING',
    'EXTERNAL_PROVIDER',
    'CALCULATED',
    'INTERNAL_ASSUMPTION',
  ])
  source!:
    | 'USER_INPUT'
    | 'CUSTOMER_INPUT'
    | 'SYSTEM_CONFIGURATION'
    | 'CONTRACT'
    | 'METERING'
    | 'EXTERNAL_PROVIDER'
    | 'CALCULATED'
    | 'INTERNAL_ASSUMPTION';
  @IsOptional() @IsString() decimalValue?: string;
  @IsOptional() @IsString() integerValue?: string;
  @IsOptional() @IsString() moneyMinorValue?: string;
  @IsOptional() @IsBoolean() booleanValue?: boolean;
  @IsOptional() @IsString() textValue?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() justification?: string;
}

export class ConfigureScenarioDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsOptional() @IsArray() @IsString({ each: true }) familyCodes?: string[];
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  capabilityIds?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioLineDto)
  lines?: ScenarioLineDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriverValueDto)
  driverValues!: DriverValueDto[];
}

export class ScenarioLineCostEffortDto {
  @IsIn(['DELIVERY_PROFESSIONAL', 'SENIOR_REVIEWER'])
  roleCode!: 'DELIVERY_PROFESSIONAL' | 'SENIOR_REVIEWER';
  @Matches(/^(?=.*[1-9])\d+(?:\.\d{1,6})?$/)
  hours!: string;
  @IsIn(['USER_INPUT', 'INTERNAL_ASSUMPTION'])
  source!: 'USER_INPUT' | 'INTERNAL_ASSUMPTION';
  @IsOptional() @IsString() justification?: string;
}

export class ScenarioLineDto {
  @IsOptional() @IsUUID() capabilityId?: string;
  @IsOptional() @IsUUID() priceComponentId?: string;
  @IsIn(['CATALOG_COMPONENT', 'CUSTOM_COMPONENT', 'PROFESSIONAL_SERVICE'])
  source!: 'CATALOG_COMPONENT' | 'CUSTOM_COMPONENT' | 'PROFESSIONAL_SERVICE';
  @IsString() componentCode!: string;
  @IsString() componentNameFr!: string;
  @IsOptional() @IsString() componentNameEn?: string;
  @IsIn([
    'FLAT',
    'PER_UNIT',
    'PER_SEAT',
    'PER_SITE',
    'CAPACITY_BAND',
    'TIERED',
    'USAGE',
    'COMPLEXITY',
    'CUSTOM',
  ])
  pricingModel!:
    | 'FLAT'
    | 'PER_UNIT'
    | 'PER_SEAT'
    | 'PER_SITE'
    | 'CAPACITY_BAND'
    | 'TIERED'
    | 'USAGE'
    | 'COMPLEXITY'
    | 'CUSTOM';
  @IsIn(['RECURRING', 'ONE_TIME']) chargeType!: 'RECURRING' | 'ONE_TIME';
  @IsOptional()
  @IsIn(Object.values(CommercialRevenueCategory))
  revenueCategory?: CommercialRevenueCategory;
  @IsOptional() @IsIn(['MONTH', 'YEAR']) billingPeriod?: 'MONTH' | 'YEAR';
  @IsOptional()
  @IsIn(['FIXED', 'HOUR', 'SEAT', 'SITE', 'CLIENT', 'USAGE_UNIT', 'COMPLEXITY'])
  metric?:
    | 'FIXED'
    | 'HOUR'
    | 'SEAT'
    | 'SITE'
    | 'CLIENT'
    | 'USAGE_UNIT'
    | 'COMPLEXITY';
  @IsOptional()
  @IsIn(['VOLUME', 'GRADUATED'])
  tierMode?: 'VOLUME' | 'GRADUATED';
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsString() quantityUnit?: string;
  @IsOptional() @IsString() proposedUnitAmountMinor?: string;
  @IsOptional() @IsString() justification?: string;
  @IsOptional() @IsBoolean() internalUse?: boolean;
  @IsOptional() @IsBoolean() distributable?: boolean;
  @IsOptional() @IsString() distributionLimit?: string;
  @IsOptional()
  @IsIn(['FIXED', 'SEAT', 'SITE', 'CLIENT', 'USAGE_UNIT', 'COMPLEXITY'])
  distributionMetric?:
    | 'FIXED'
    | 'SEAT'
    | 'SITE'
    | 'CLIENT'
    | 'USAGE_UNIT'
    | 'COMPLEXITY';
  @IsOptional()
  @IsIn(['DECLARED', 'METERED'])
  commercialQuantityBasis?: 'DECLARED' | 'METERED';
  @IsOptional() @IsString() commercialRuleCode?: string;
  @IsOptional() @IsString() commercialRuleVersion?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioLineCostEffortDto)
  costEfforts?: ScenarioLineCostEffortDto[];
}

export class SelectScenarioDto {
  @IsUUID() scenarioId!: string;
  @IsInt() @Min(0) lockVersion!: number;
}

export class CalculateScenarioDto {
  @IsOptional() @IsUUID() costAssumptionVersionId?: string;
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  valuationAssumptionVersionIds?: string[];
}

/**
 * Complete, unsaved guided Scenario state evaluated in an existing workspace.
 * Catalog prices, tiers, methodologies, rates and calculated totals are
 * intentionally absent: those authorities are always resolved server-side.
 */
export class EvaluateGuidedDraftDto extends CalculateScenarioDto {
  @IsUUID() scenarioId!: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) familyCodes!: string[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedCatalogLineDto)
  catalogLines!: GuidedCatalogLineDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedCustomLineDto)
  customLines!: GuidedCustomLineDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuidedDriverValueDto)
  driverValues!: GuidedDriverValueDto[];
}

export class ConvertScenarioDto {
  @IsString() @Length(1, 255) title!: string;
  @IsIn(['DIRECT', 'PARTNER']) relationship!: 'DIRECT' | 'PARTNER';
  @IsIn(['FR', 'EN']) preferredLanguage!: 'FR' | 'EN';
  @IsString() recipientLegalName!: string;
  @IsString() recipientDisplayName!: string;
  @Matches(/^[A-Z]{2}$/) recipientCountry!: string;
  @IsOptional() @IsString() recipientContactName?: string;
  @IsOptional() @IsString() recipientEmail?: string;
  @IsOptional() @IsString() valueDisclaimerFr?: string;
  @IsOptional() @IsString() valueDisclaimerEn?: string;
}

export class AssumptionValueDto {
  @IsString() assumptionCode!: string;
  @IsString() assumptionVersion!: string;
  @IsOptional() @IsString() scopeKey?: string;
  @IsIn(['DECIMAL', 'INTEGER', 'MONEY', 'BOOLEAN', 'TEXT'])
  valueType!: 'DECIMAL' | 'INTEGER' | 'MONEY' | 'BOOLEAN' | 'TEXT';
  @IsOptional() @IsString() decimalValue?: string;
  @IsOptional() @IsString() integerValue?: string;
  @IsOptional() @IsString() moneyMinorValue?: string;
  @IsOptional() @IsBoolean() booleanValue?: boolean;
  @IsOptional() @IsString() textValue?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsString() unit?: string;
}

export class CreateCostAssumptionSetDto {
  @IsString() @Length(1, 100) code!: string;
  @IsString() @Length(1, 255) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateCostAssumptionVersionDto {
  @Matches(/^[A-Z]{3}$/) currency!: string;
  @IsString() methodologyCode!: string;
  @IsString() methodologyVersion!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssumptionValueDto)
  values!: AssumptionValueDto[];
}

export class CreateValuationAssumptionSetDto {
  @IsString() @Length(1, 100) code!: string;
  @IsString() @Length(1, 255) name!: string;
  @IsString() methodologyCode!: string;
}

export class CreateValuationAssumptionVersionDto {
  @IsString() methodologyVersion!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssumptionValueDto)
  values!: AssumptionValueDto[];
}

export class AssumptionTransitionDto {
  @IsString() @Length(1, 500) reason!: string;
}

export class UpdateAssumptionVersionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssumptionValueDto)
  values!: AssumptionValueDto[];

  @IsString() @Length(1, 500) reason!: string;
}
