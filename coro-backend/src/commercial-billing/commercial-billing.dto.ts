import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class InvoiceLineDto {
  @IsString() @IsNotEmpty() @MaxLength(300) description!: string;
  @IsOptional() @IsString() sourceSnapshotLineId?: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity!: string;
  @IsString() @Matches(/^\d+$/) unitAmountMinor!: string;
  @IsOptional() @IsString() @Matches(/^-?\d+$/) adjustmentMinor?: string;
  @IsBoolean() taxable!: boolean;
  @IsInt() @Min(0) displayOrder!: number;
}

export class CreateTaxConfigurationDto {
  @IsString() @IsNotEmpty() @MaxLength(20) jurisdictionCode!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsInt() @Min(0) federalRatePartsPerMillion!: number;
  @IsInt() @Min(0) provincialRatePartsPerMillion!: number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom!: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveUntil?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class CreateInvoiceDto {
  @IsString() @IsNotEmpty() subscriptionId!: string;
  @IsString() @IsNotEmpty() taxConfigurationId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) periodStart!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) periodEnd!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) idempotencyKey!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}

export class BillingTransitionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class IssueInvoiceDto extends BillingTransitionDto {
  @IsString() @IsNotEmpty() @MaxLength(100) invoiceNumber!: string;
}

export class RecordPaymentDto {
  @IsString() @Matches(/^\d+$/) amountMinor!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}T/) paidAt!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) evidenceReference!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) idempotencyKey!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class CreateCreditNoteDto {
  @IsString() @Matches(/^\d+$/) amountMinor!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class ApproveCreditNoteDto extends BillingTransitionDto {
  @IsString() @IsNotEmpty() @MaxLength(500) approvalReference!: string;
}

export class IssueCreditNoteDto extends BillingTransitionDto {
  @IsString() @IsNotEmpty() @MaxLength(100) creditNoteNumber!: string;
}
