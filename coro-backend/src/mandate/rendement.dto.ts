import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { GOVERNED_CURRENCY } from '../common/financial-currency';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class RendementPeriodQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
  @IsOptional() @IsString() userId?: string;
}

export class FinancialRendementQueryDto extends RendementPeriodQueryDto {
  @IsOptional() @IsString() @IsNotEmpty() organizationId?: string;
  @IsOptional()
  @IsIn(['cumulative', 'work-period', 'sold-portfolio'])
  view: 'cumulative' | 'work-period' | 'sold-portfolio' = 'cumulative';

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) asOf?: string;
  @IsOptional() @Transform(upper) @Matches(/^[A-Z]{3}$/) currency?: string;
}

export class CreateAdvisorCostRateDto {
  @IsOptional() @IsString() @IsNotEmpty() organizationId?: string;
  @IsString() @IsNotEmpty() userId!: string;
  @IsIn([GOVERNED_CURRENCY]) currency: string = GOVERNED_CURRENCY;
  @Transform(trim) @Matches(/^\d+(\.\d{1,6})?$/) hourlyCost!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom!: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveUntil?: string | null;
  @IsOptional() @IsString() supersedesRateId?: string | null;
}

export class CostRateTransitionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(1000) reason!: string;
}

export class ValidateMandateSaleDto {
  @Transform(trim) @Matches(/^\d+(\.\d{1,2})?$/) soldAmount!: string;
  @IsIn([GOVERNED_CURRENCY]) soldCurrency: string = GOVERNED_CURRENCY;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) soldAt!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(1000) reason!: string;
  @IsInt() @Min(0) lockVersion!: number;
}
