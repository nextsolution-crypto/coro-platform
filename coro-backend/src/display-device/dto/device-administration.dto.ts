import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDisplayDeviceDto {
  @IsString() @Length(1, 128) buildingId!: string;
  @IsString() @Length(1, 128) locationId!: string;
  @IsIn(['LANDSCAPE_17X11', 'WIDESCREEN_16X9', 'WIDESCREEN_16X10'])
  profile!: string;
  @IsString() @Length(1, 128) keyId!: string;
  @IsString() @MaxLength(4096) publicKeyPem!: string;
  @IsString() @Length(16, 128) requestId!: string;
}

export class InviteDisplayDeviceDto {
  @IsISO8601() expiresAt!: string;
  @IsString() @Length(16, 128) requestId!: string;
}

export class AssignDisplayDeviceDto {
  @IsString() @Length(1, 128) publicationId!: string;
  @IsString() @Length(16, 128) requestId!: string;
}

export class TransitionDisplayDeviceDto {
  @IsIn(['ACTIVE', 'SUSPENDED', 'REVOKED', 'RETIRED']) status!: string;
  @IsString() @Length(1, 1000) reason!: string;
  @IsInt() @Min(0) expectedLockVersion!: number;
  @IsString() @Length(16, 128) requestId!: string;
}

export class DisplayDeviceHistoryQueryDto {
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) limit = 50;
}
