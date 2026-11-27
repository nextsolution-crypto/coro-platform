import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { ProjectMandateServiceRecurrenceMode } from '@prisma/client';

export class MandateServiceLineDto {
  @IsOptional() @IsUUID() id?: string;
  // Les types système du catalogue ont des identifiants lisibles (ex. coro-activity-type-formation-epi), pas des UUID.
  @IsString() @IsNotEmpty() @MaxLength(100) activityTypeId!: string;
  @IsEnum(ProjectMandateServiceRecurrenceMode) recurrenceMode!: ProjectMandateServiceRecurrenceMode;
  @IsInt() @Min(1) quantity!: number;
  @IsInt() @Min(0) displayOrder!: number;
}

export class SaveMandateServicesDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedRevision!: string;
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => MandateServiceLineDto)
  services!: MandateServiceLineDto[];
}
