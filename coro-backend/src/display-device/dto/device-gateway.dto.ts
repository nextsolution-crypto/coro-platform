import {
  IsArray,
  IsIn,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EnrollDisplayDeviceDto {
  @IsString() @Length(32, 64) invitationId!: string;
  @IsString() @Length(32, 128) token!: string;
  @IsString() @Length(1, 128) deviceId!: string;
  @IsString() @Length(1, 128) keyId!: string;
  @IsString() @MaxLength(4096) publicKeyPem!: string;
  @IsString() @MaxLength(512) signature!: string;
  @IsString() @MaxLength(100) softwareVersion!: string;
  @IsString() @Length(16, 128) requestId!: string;
}

export class DeviceChallengeDto {
  @IsString() @Length(1, 128) deviceId!: string;
  @IsString() @Length(1, 64) operation!: string;
  @IsString() @Matches(/^[A-Z]{3,10}$/) method!: string;
  @IsString() @Matches(/^\/[A-Za-z0-9/_-]{1,512}$/) path!: string;
  @Matches(/^[a-f0-9]{64}$/) bodySha256!: string;
}

export class DeviceRequestProofDto {
  @IsString() @Length(1, 128) deviceId!: string;
  @IsISO8601() timestamp!: string;
  @IsString() @Length(16, 128) nonce!: string;
  @IsString() @Matches(/^[A-Z]{3,10}$/) method!: string;
  @IsString() @Matches(/^\/[A-Za-z0-9/_-]{1,512}$/) path!: string;
  @Matches(/^[a-f0-9]{64}$/) bodySha256!: string;
  @IsString() @MaxLength(512) signature!: string;
}

export class AuthenticatedDeviceRequestDto {
  @IsObject()
  @ValidateNested()
  @Type(() => DeviceRequestProofDto)
  proof!: DeviceRequestProofDto;
  @IsString() @Length(16, 128) requestId!: string;
}

export class DeviceTelemetryDto extends AuthenticatedDeviceRequestDto {
  @IsString() @MaxLength(100) softwareVersion!: string;
  @IsOptional() @IsString() @MaxLength(128) publicationId?: string;
  @IsOptional() @IsInt() @Min(1) publicationVersion?: number;
  @IsIn(['NORMAL', 'EMERGENCY', 'DEGRADED']) mode!: string;
  @IsArray() @IsString({ each: true }) errors!: string[];
  @IsInt() @Min(0) restartCount!: number;
  @IsIn(['HEALTHY', 'DEGRADED', 'CORRUPT']) cacheHealth!: string;
}

export class ConfirmDisplaySyncDto extends AuthenticatedDeviceRequestDto {
  @IsString() @Length(1, 128) syncId!: string;
  @IsInt() @Min(1) manifestSequence!: number;
  @IsString() @Length(1, 128) publicationId!: string;
  @IsInt() @Min(1) publicationVersion!: number;
}
