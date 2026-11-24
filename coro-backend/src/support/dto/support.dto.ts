import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateIf } from 'class-validator';
import { SUPPORT_IMPACTS, SUPPORT_TYPES } from '../support-sla';

export class CreateSupportTicketDto {
  @IsIn(SUPPORT_TYPES as unknown as string[]) type!: string;
  @IsIn(SUPPORT_IMPACTS as unknown as string[]) impact!: string;
  @IsString() @Length(3, 140) subject!: string;
  @IsString() @Length(10, 8000) message!: string;
  @IsOptional() @IsUUID() buildingId?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class SupportMessageDto {
  @IsString() @Length(1, 8000) body!: string;
  @IsOptional() @IsBoolean() internal?: boolean;
}

export class SupportAgentUpdateDto {
  @IsOptional() @IsIn(['NEW', 'IN_PROGRESS', 'WAITING_REQUESTER', 'RESOLVED', 'CLOSED']) status?: string;
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsUUID() assignedUserId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3) priority?: number;
  @IsOptional() @IsIn(['CORO', 'ADVISOR']) queue?: string;
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsString() @Length(1, 80) duplicateOfId?: string | null;
}
