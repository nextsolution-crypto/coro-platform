import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ContractBillingCadence } from '@prisma/client';

export class SubscriptionItemDto {
  @IsString() @IsNotEmpty() contractSnapshotLineId!: string;
}

export class CreateSubscriptionDto {
  @IsString() @IsNotEmpty() reference!: string;
  @IsString() @IsNotEmpty() contractId!: string;
  @IsString() @IsNotEmpty() contractRevisionId!: string;
  @IsString() @IsNotEmpty() proposalRevisionId!: string;
  @IsString() @IsNotEmpty() priceBookVersionId!: string;
  @IsEnum(ContractBillingCadence) billingCadence!: ContractBillingCadence;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom!: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveUntil?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) renewalAt?: string;
  @IsString() @IsNotEmpty() @MaxLength(100) idempotencyKey!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SubscriptionItemDto)
  items!: SubscriptionItemDto[];
}

export class SubscriptionTransitionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class SubscriptionRenewDto extends SubscriptionTransitionDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) renewalAt!: string;
  @IsOptional() @IsInt() @Min(1) @Max(120) termMonths?: number;
}
