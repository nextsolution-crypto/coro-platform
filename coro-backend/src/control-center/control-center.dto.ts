import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CapabilityCode, CommercialRelationship } from '@prisma/client';

export class ControlCenterOverviewQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) attentionLimit =
    10;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiringWithinDays = 30;
  @IsOptional() @Type(() => Date) @IsDate() asOf?: Date;
}

export class ControlCenterOrganizationsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
  @IsOptional()
  @IsEnum(CommercialRelationship)
  relationship?: CommercialRelationship;
}

export class OrganizationReadQueryDto {
  @IsOptional() @Type(() => Date) @IsDate() asOf?: Date;
}

export class ScopeTreeQueryDto extends OrganizationReadQueryDto {
  @IsOptional() @IsEnum(CapabilityCode) capabilityCode?: CapabilityCode;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientPage = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) clientPageSize =
    25;
}
