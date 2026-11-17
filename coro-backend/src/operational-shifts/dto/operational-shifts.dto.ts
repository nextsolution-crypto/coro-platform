import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShiftParticipantDto {
  @IsUUID() userId!: string;
  @IsIn(['PARTICIPANT', 'REPLACEMENT', 'SUPERVISOR'])
  role!: 'PARTICIPANT' | 'REPLACEMENT' | 'SUPERVISOR';
}

export class CreateOperationalShiftDto {
  @IsUUID() buildingId!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) securityPost!: string;
  @IsOptional() @IsString() @MaxLength(120) teamName?: string;
  @IsUUID() responsibleUserId!: string;
  @IsISO8601() plannedStartAt!: string;
  @IsISO8601() plannedEndAt!: string;
  @IsOptional() @IsObject() instructionsSnapshot?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ShiftParticipantDto)
  participants: ShiftParticipantDto[] = [];
  @IsString() @IsNotEmpty() @MaxLength(160) idempotencyKey!: string;
}

export class ShiftTransitionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsString() @IsNotEmpty() @MaxLength(160) idempotencyKey!: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

export class OpenShiftDto extends ShiftTransitionDto {
  @IsOptional() @IsObject() openingSnapshot?: Record<string, unknown>;
}

export class PrepareHandoverDto extends ShiftTransitionDto {
  @IsOptional() @IsUUID() incomingShiftId?: string;
  @IsOptional() @IsUUID() incomingUserId?: string;
  @IsObject() snapshot!: Record<string, unknown>;
}

export enum HandoverDecision {
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESERVED = 'RESERVED',
  REFUSED = 'REFUSED',
  CLARIFICATION_REQUESTED = 'CLARIFICATION_REQUESTED',
}

export class HandoverDecisionDto extends ShiftTransitionDto {
  @IsEnum(HandoverDecision) decision!: HandoverDecision;
}

export class ShiftListQueryDto {
  @IsUUID() buildingId!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
