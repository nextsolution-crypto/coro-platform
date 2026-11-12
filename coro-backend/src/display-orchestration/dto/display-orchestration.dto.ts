import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DisplayCommandDeliveryStatus,
  DisplayOperationalCommandType,
  DisplayOperationalEventSeverity,
  DisplayOperationalEventSource,
} from '@prisma/client';
import { AuthenticatedDeviceRequestDto } from '../../display-device/dto/device-gateway.dto';

export class IssueDisplayOperationalCommandDto {
  @IsString() @Length(16, 128) idempotencyKey!: string;
  @IsString() @Length(16, 128) correlationId!: string;
  @IsOptional() @IsString() @Length(1, 128) causationId?: string;
  @IsOptional() @IsString() @Length(1, 128) incidentEventId?: string;
  @IsOptional() @IsString() @Length(1, 128) protocolId?: string;
  @IsEnum(DisplayOperationalEventSource) source!: DisplayOperationalEventSource;
  @IsEnum(DisplayOperationalEventSeverity)
  severity!: DisplayOperationalEventSeverity;
  @IsEnum(DisplayOperationalCommandType)
  commandType!: DisplayOperationalCommandType;
  @IsString() @MaxLength(100) eventType!: string;
  @IsBoolean() exercise!: boolean;
  @IsISO8601() occurredAt!: string;
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) zoneIds!: string[];
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) deviceIds!: string[];
  @IsObject() payload!: Record<string, unknown>;
  @IsString() @Length(8, 500) reason!: string;
  @IsOptional() @IsString() @Length(1, 128) requestedClearCommandId?: string;
}

export class DisplayCommandPollDto extends AuthenticatedDeviceRequestDto {
  @IsOptional() @IsInt() @Min(0) afterSequence?: number;
}

export class AcknowledgeDisplayCommandDto extends AuthenticatedDeviceRequestDto {
  @IsString() @Length(1, 128) commandId!: string;
  @IsIn(['RECEIVED', 'APPLIED', 'REJECTED', 'FAILED', 'STALE'])
  status!: DisplayCommandDeliveryStatus;
  @IsISO8601() observedAt!: string;
  @IsOptional() @IsString() @MaxLength(100) errorCode?: string;
  @IsObject() declaredState!: Record<string, unknown>;
}
