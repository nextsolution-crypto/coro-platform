import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CommercialClauseApplicabilityScope } from '@prisma/client';
import { CLAUSE_PARAMETER_TYPES } from './commercial-clause.registry';
import type { ClauseParameterType } from './commercial-clause.registry';

export class ClauseParameterDefinitionDto {
  @IsString() @Length(1, 100) key!: string;
  @IsEnum(CLAUSE_PARAMETER_TYPES) type!: ClauseParameterType;
  @IsBoolean() required!: boolean;
}

export class UpdateCommercialClauseDraftDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @Length(1, 300) titleFR!: string;
  @IsString() @Length(1, 300) titleEN!: string;
  @IsString() @Length(1, 20000) textFR!: string;
  @IsString() @Length(1, 20000) textEN!: string;
  @IsOptional() @IsString() @MaxLength(300) businessOwner?: string;
  @IsOptional() @IsString() @MaxLength(300) legalOwner?: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsDateString() effectiveAt?: string;
  @IsString() @Length(1, 200) provenance!: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CommercialClauseApplicabilityScope, { each: true })
  applicabilities!: CommercialClauseApplicabilityScope[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClauseParameterDefinitionDto)
  parameters!: ClauseParameterDefinitionDto[];
}

export class ClauseReasonDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @Length(1, 1000) reason!: string;
}

export class ClauseLegalReviewDto extends ClauseReasonDto {
  @IsString() @Length(1, 2000) evidence!: string;
}
