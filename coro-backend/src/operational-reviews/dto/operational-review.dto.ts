import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { OperationalReviewConfidentiality } from '@prisma/client';

export class CreateOperationalReviewDto {
  @IsString() @MaxLength(500) title!: string;
  @IsOptional() @IsString() @MaxLength(10000) summary?: string;
  @IsOptional() @IsEnum(OperationalReviewConfidentiality) confidentiality?: OperationalReviewConfidentiality;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsUUID() populationOperationalEventId?: string;
  @IsOptional() @IsUUID() incidentEventId?: string;
  @IsOptional() @IsUUID() exerciseReportId?: string;
}

export class UpdateOperationalReviewDto {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) summary?: string;
  @IsOptional() @IsEnum(OperationalReviewConfidentiality) confidentiality?: OperationalReviewConfidentiality;
}
