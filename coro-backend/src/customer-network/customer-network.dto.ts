import {
  CustomerNetworkPermission,
  CustomerPortfolioAssignmentScope,
  CustomerPortfolioAssignmentSubjectType,
} from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateNetworkAuthorityDraftDto {
  @IsUUID() responsibleUserId!: string;
  @IsString() @MinLength(6) mandateReference!: string;
  @IsString() @MinLength(10) reason!: string;
}

export class NetworkAuthorityTransitionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @MinLength(10) reason!: string;
}

export class ReplaceNetworkResponsibleDto extends NetworkAuthorityTransitionDto {
  @IsUUID() responsibleUserId!: string;
}

export class CreatePortfolioDto {
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{1,31}$/) code!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() @MinLength(10) reason!: string;
}

export class BootstrapNetworkPortfolioDto extends CreatePortfolioDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(CustomerNetworkPermission, { each: true })
  permissions!: CustomerNetworkPermission[];
}

export class CreateRegionDto extends CreatePortfolioDto {}

export class LinkRegionDto {
  @IsUUID() regionId!: string;
  @IsString() @MinLength(10) reason!: string;
}

export class AddBuildingMembershipDto {
  @IsUUID() regionId!: string;
  @IsUUID() buildingId!: string;
  @IsString() @MinLength(10) reason!: string;
}

export class CreatePortfolioAssignmentDto {
  @IsEnum(CustomerPortfolioAssignmentSubjectType)
  subjectType!: CustomerPortfolioAssignmentSubjectType;
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsUUID() clientUserId?: string;
  @IsOptional() @IsUUID() operatorUserId?: string;
  @IsEnum(CustomerPortfolioAssignmentScope)
  scope!: CustomerPortfolioAssignmentScope;
  @IsOptional() @IsUUID() portfolioId?: string;
  @IsOptional() @IsUUID() regionId?: string;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(CustomerNetworkPermission, { each: true })
  permissions!: CustomerNetworkPermission[];
  @IsOptional() @IsDateString() effectiveFrom?: string;
  @IsOptional() @IsDateString() effectiveUntil?: string;
  @IsString() @MinLength(10) reason!: string;
}

export class SucceedPortfolioAssignmentDto {
  @IsUUID() successorClientUserId!: string;
  @IsDateString() effectiveFrom!: string;
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @MinLength(10) reason!: string;
}

export class PortfolioQueryDto {
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 25;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() portfolioId?: string;
  @IsOptional() @IsUUID() regionId?: string;
}

export class PortfolioAnalyticsQueryDto {
  @IsOptional() @IsUUID() portfolioId?: string;
  @IsOptional() @IsUUID() regionId?: string;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
