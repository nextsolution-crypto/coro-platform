import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CommercialScope } from '@prisma/client';

export class CalculateMeteringDto {
  @IsString() metricCode!: string;
  @IsEnum(CommercialScope) scope!: CommercialScope;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsUUID() buildingId?: string;
  @Type(() => Date) @IsDate() periodStart!: Date;
  @Type(() => Date) @IsDate() periodEnd!: Date;
  @IsString() timezone!: string;
}

export class CorrectMeteringDto {
  @IsString() reason!: string;
}

export class ListMeteringDto {
  @IsOptional() @IsString() metricCode?: string;
  @IsOptional() @IsEnum(CommercialScope) scope?: CommercialScope;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @Type(() => Date) @IsDate() periodStart?: Date;
  @IsOptional() @Type(() => Date) @IsDate() periodEnd?: Date;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}
