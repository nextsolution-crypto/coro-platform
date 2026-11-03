import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IncidentPermission } from '@prisma/client';

export const ADMINISTRABLE_INCIDENT_PERMISSIONS = [
  IncidentPermission.INCIDENT_READ,
  IncidentPermission.INCIDENT_SUPERVISE,
  IncidentPermission.INCIDENT_COMMAND,
] as const;

export class SetClientUserIncidentPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(IncidentPermission, { each: true })
  permissions!: IncidentPermission[];

  @IsArray()
  @ArrayUnique()
  @IsEnum(IncidentPermission, { each: true })
  expectedPermissions!: IncidentPermission[];

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class GrantClientUserIncidentAuthorityDto {
  @IsString()
  buildingId!: string;

  @IsOptional()
  @IsString()
  incidentEventId?: string;

  @IsString()
  @MaxLength(120)
  operationalRole!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(IncidentPermission, { each: true })
  permissions!: IncidentPermission[];

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class RevokeClientUserIncidentAuthorityDto {
  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsInt()
  @Min(0)
  lockVersion!: number;
}
