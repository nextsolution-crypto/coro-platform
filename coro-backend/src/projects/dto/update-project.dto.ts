import { DocumentType, ProjectStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2200)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsObject()
  configData?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  buildingId?: string;

  // Déclarés pour que le pipe global ne puisse pas les supprimer avant le
  // contrôle strict de cette route. Toute présence doit être refusée.
  @IsEmpty() organizationId?: never;
  @IsEmpty() isActive?: never;
  @IsEmpty() userId?: never;
  @IsEmpty() lastEditedById?: never;
  @IsEmpty() submittedById?: never;
  @IsEmpty() submittedAt?: never;
  @IsEmpty() approvedById?: never;
  @IsEmpty() approvedAt?: never;
  @IsEmpty() client?: never;
  @IsEmpty() building?: never;
  @IsEmpty() user?: never;
}
