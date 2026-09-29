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
