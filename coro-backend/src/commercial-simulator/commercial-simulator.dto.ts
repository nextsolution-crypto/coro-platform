import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
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

export class CreateScenarioDto {
  @IsString() @Length(1, 255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
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
    | 'TIERED'
    | 'USAGE'
    | 'COMPLEXITY'
    | 'CUSTOM';
  @IsIn(['RECURRING', 'ONE_TIME']) chargeType!: 'RECURRING' | 'ONE_TIME';
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
