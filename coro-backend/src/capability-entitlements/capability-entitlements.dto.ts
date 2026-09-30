import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  CommercialScope,
  EntitlementLimitType,
  EntitlementSource,
} from '@prisma/client';

export class EntitlementLimitDto {
  @IsEnum(EntitlementLimitType) type!: EntitlementLimitType;
  @IsOptional() @IsString() metricCode?: string;
  @IsBoolean() unlimited!: boolean;
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
}

export class CreateEntitlementDto {
  @IsString() @IsNotEmpty() capabilityCode!: string;
  @IsEnum(CommercialScope) scope!: CommercialScope;
  @IsEnum(EntitlementSource) source!: EntitlementSource;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsOptional() @IsString() parentEntitlementId?: string;
  @IsOptional() @IsString() sourceContractId?: string;
  @IsOptional() @IsString() sourceContractRevisionId?: string;
  @IsOptional() @IsString() sourceSnapshotLineId?: string;
  @IsOptional() @IsString() provenanceReason?: string;
  @IsBoolean() enabled!: boolean;
  @IsBoolean() distributable!: boolean;
  @IsDateString() decisionAt!: string;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsString() @IsNotEmpty() reason!: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
}

export class EntitlementTransitionDto {
  @IsInt() lockVersion!: number;
  @IsDateString() decisionAt!: string;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsString() @IsNotEmpty() reason!: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() distributable?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
}

export class PreviewStateDto {
  @IsOptional() @IsInt() expectedLockVersion?: number;
  @IsOptional() @IsString() expectedRevisionId?: string;
  @IsString() @IsNotEmpty() reason!: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acknowledgedWarningCodes?: string[];
}

export class EffectiveMutationDto extends PreviewStateDto {
  @IsDateString() effectiveFrom!: string;
}

export class CreateContractEntitlementDto extends PreviewStateDto {
  @IsString() @IsNotEmpty() sourceSnapshotLineId!: string;
  @IsEnum(CommercialScope) scope!: CommercialScope;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() distributable?: boolean;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
}

export class CreateDistributionEntitlementDto extends PreviewStateDto {
  @IsString() @IsNotEmpty() parentEntitlementId!: string;
  @IsString() @IsNotEmpty() capabilityCode!: string;
  @IsOptional() @IsString() clientId?: string;
  @IsBoolean() enabled!: boolean;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
}

export class CreateTemporaryEntitlementDto extends PreviewStateDto {
  @IsString() @IsNotEmpty() capabilityCode!: string;
  @IsEnum(CommercialScope) scope!: CommercialScope;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsBoolean() enabled!: boolean;
  @IsBoolean() distributable!: boolean;
  @IsDateString() effectiveFrom!: string;
  @IsDateString() effectiveUntil!: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
}

export class CreateInternalEntitlementDto extends PreviewStateDto {
  @IsString() @IsNotEmpty() capabilityCode!: string;
  @IsEnum(CommercialScope) scope!: CommercialScope;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsBoolean() enabled!: boolean;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
}

export class SetDistributableDto extends EffectiveMutationDto {
  @IsBoolean() distributable!: boolean;
}

export class ChangeEntitlementLimitsDto extends EffectiveMutationDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
  @IsOptional() @IsBoolean() removeAllLimits?: boolean;
}

export class ChangeEntitlementDatesDto extends PreviewStateDto {
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
}

export class RevokeEntitlementDto extends PreviewStateDto {}

export class EntitlementImpactPreviewDto extends PreviewStateDto {
  @IsOptional() @IsString() entitlementId?: string;
  @IsOptional() @IsString() capabilityCode?: string;
  @IsOptional() @IsEnum(CommercialScope) scope?: CommercialScope;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsOptional() @IsEnum(EntitlementSource) source?: EntitlementSource;
  @IsOptional() @IsString() parentEntitlementId?: string;
  @IsOptional() @IsString() sourceContractId?: string;
  @IsOptional() @IsString() sourceContractRevisionId?: string;
  @IsOptional() @IsString() sourceSnapshotLineId?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(PROVISION_CONTRACT|DISTRIBUTE|CREATE_TRIAL|CREATE_MANUAL_OVERRIDE|CREATE_INTERNAL|ENABLE|DISABLE|SUSPEND|RESUME|REVOKE|SET_DISTRIBUTABLE|CHANGE_LIMITS|CHANGE_DATES)$/,
  )
  operation!: string;
  @IsOptional() @IsDateString() effectiveFrom?: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsOptional() @IsBoolean() distributable?: boolean;
  @IsOptional() @IsBoolean() removeAllLimits?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementLimitDto)
  limits?: EntitlementLimitDto[];
}
