import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Min, ValidateNested } from 'class-validator';
import { ProjectMandateServiceRecurrenceMode } from '@prisma/client';

export class MandateServiceLineDto {
  @IsOptional() @IsUUID() id?: string;
  @IsUUID() activityTypeId!: string;
  @IsEnum(ProjectMandateServiceRecurrenceMode) recurrenceMode!: ProjectMandateServiceRecurrenceMode;
  @IsInt() @Min(1) quantity!: number;
  @IsInt() @Min(0) displayOrder!: number;
}

export class SaveMandateServicesDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedRevision!: string;
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => MandateServiceLineDto)
  services!: MandateServiceLineDto[];
}
