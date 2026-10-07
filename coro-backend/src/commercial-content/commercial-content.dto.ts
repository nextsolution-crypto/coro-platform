import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CommercialContentDeliveryMaturity,
  CommercialContentIntent,
  CommercialContentTargetType,
} from '@prisma/client';

export class CommercialContentBindingDto {
  @IsEnum(CommercialContentTargetType) targetType!: CommercialContentTargetType;
  @IsString() @Length(1, 120) targetCode!: string;
  @IsString() @Length(1, 300) labelFR!: string;
  @IsOptional() @IsString() @MaxLength(300) labelEN?: string;
  @IsEnum(CommercialContentIntent) commercialIntent!: CommercialContentIntent;
  @IsEnum(CommercialContentDeliveryMaturity)
  deliveryMaturity!: CommercialContentDeliveryMaturity;
  @IsOptional() @IsString() @MaxLength(1000) evidence?: string;
  @IsInt() @Min(0) displayOrder!: number;
}

export class UpdateCommercialContentVersionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @Length(1, 300) titleFR!: string;
  @IsOptional() @IsString() @MaxLength(300) titleEN?: string;
  @IsString() @Length(1, 10000) descriptionFR!: string;
  @IsOptional() @IsString() @MaxLength(10000) descriptionEN?: string;
  @IsString() @Length(1, 100) provenance!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CommercialContentBindingDto)
  bindings!: CommercialContentBindingDto[];
}

export class CommercialContentReasonDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @Length(1, 1000) reason!: string;
}
