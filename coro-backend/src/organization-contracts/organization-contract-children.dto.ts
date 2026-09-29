import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ContractAdjustmentScope,
  ContractAdjustmentType,
  ContractCommitmentPeriod,
  ContractCommitmentType,
  ContractDocumentType,
  ContractTerritoryType,
} from '@prisma/client';
export class AdjustmentDto {
  @IsEnum(ContractAdjustmentScope) scope!: ContractAdjustmentScope;
  @IsEnum(ContractAdjustmentType) adjustmentType!: ContractAdjustmentType;
  @IsOptional() @IsString() sourcePriceComponentId?: string;
  @IsOptional() @IsString() capabilityId?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,63}$/) code?: string;
  @IsOptional() @IsString() @MaxLength(200) label?: string;
  @IsOptional() @IsInt() @Min(0) discountBasisPoints?: number;
  @IsOptional() @IsString() @Matches(/^\d+$/) overrideAmountMinor?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) justification!: string;
  @IsInt() @Min(0) displayOrder!: number;
}
export class SectorDto {
  @IsString() @IsNotEmpty() @MaxLength(100) sectorCode!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) sectorLabel!: string;
}
export class ExclusivityDto {
  @IsEnum(ContractTerritoryType) territoryType!: ContractTerritoryType;
  @IsOptional() @IsString() territoryCode?: string;
  @IsString() @IsNotEmpty() @MaxLength(200) territoryLabel!: string;
  @IsISO8601() startsAt!: string;
  @IsOptional() @IsISO8601() endsAt?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectorDto)
  sectors!: SectorDto[];
  @IsArray() @ArrayUnique() @IsString({ each: true }) capabilityIds!: string[];
  @IsOptional() @IsString() @MaxLength(5000) conditions?: string;
  @IsOptional() @IsString() @MaxLength(2000) renewalTerms?: string;
  @IsOptional() @IsString() @Matches(/^\d+$/) economicAmountMinor?: string;
}
export class CommitmentDto {
  @IsEnum(ContractCommitmentType) type!: ContractCommitmentType;
  @IsEnum(ContractCommitmentPeriod) period!: ContractCommitmentPeriod;
  @IsOptional() @IsString() @Matches(/^\d+$/) amountMinor?: string;
  @IsOptional() @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity?: string;
  @IsOptional() @IsString() @Matches(/^CAD$/) currency?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}
export class ContractDocumentDto {
  @IsEnum(ContractDocumentType) type!: ContractDocumentType;
  @IsOptional() @IsString() revisionId?: string;
}
