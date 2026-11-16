import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IncidentPermission } from '@prisma/client';

const trimmed = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export class ReassignIncidentTaskDto {
  @IsUUID() employeeId!: string;
  @IsInt() @Min(0) lockVersion!: number;
}

export class ConfigureIncidentEscalationDto {
  @IsIn(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']) severity!:
    | 'CRITICAL'
    | 'HIGH'
    | 'NORMAL'
    | 'LOW';
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  alternateEmployeeIds?: string[];
  @IsIn(['USER', 'CLIENT_USER']) acknowledgmentSubjectType!:
    | 'USER'
    | 'CLIENT_USER';
  @IsUUID() acknowledgmentSubjectId!: string;
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @trimmed() @MinLength(3) @MaxLength(500) reason!: string;
}

export class ActivateIncidentPcaDto {
  @IsUUID() buildingId!: string;
  @IsUUID() projectId!: string;
  @IsOptional() @IsUUID() incidentEventId?: string;
  @IsString() @trimmed() @MinLength(3) @MaxLength(500) reason!: string;
}

export class AssignIncidentAuthorityDto {
  @IsUUID() buildingId!: string;
  @IsOptional() @IsUUID() incidentEventId?: string;
  @IsIn(['USER', 'CLIENT_USER']) subjectType!: 'USER' | 'CLIENT_USER';
  @IsUUID() subjectId!: string;
  @IsString() @trimmed() @MinLength(1) @MaxLength(120) operationalRole!: string;
  @IsArray()
  @ArrayMaxSize(16)
  @ArrayUnique()
  @IsEnum(IncidentPermission, { each: true })
  permissions!: IncidentPermission[];
  @IsString() @trimmed() @MinLength(3) @MaxLength(500) reason!: string;
}

export class RevokeIncidentAuthorityDto {
  @IsString() @trimmed() @MinLength(3) @MaxLength(500) reason!: string;
  @IsInt() @Min(0) lockVersion!: number;
  @IsUUID() buildingId!: string;
  @IsOptional() @IsUUID() incidentEventId?: string;
}

export class SendIncidentAccessDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsEmail({}, { each: true })
  emails!: string[];
}

export class TriggerIncidentPanicDto {
  @IsString() @trimmed() @MinLength(1) @MaxLength(160) triggeredBy!: string;
  @IsString() @trimmed() @MinLength(1) @MaxLength(160) emergencyType!: string;
}
