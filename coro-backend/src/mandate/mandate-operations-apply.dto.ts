import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';

export enum MandateOperationDecisionAction {
  CREATE_ACTIVITY = 'CREATE_ACTIVITY',
  ADOPT_LEGACY_ACTIVITY = 'ADOPT_LEGACY_ACTIVITY',
  CREATE_REPLACEMENT = 'CREATE_REPLACEMENT',
}

export class MandateOperationDecisionDto {
  @IsUUID() mandateServiceId!: string;
  @IsEnum(MandateOperationDecisionAction)
  action!: MandateOperationDecisionAction;
  @IsOptional() @IsUUID() activityId?: string;
}

export class ApplyMandateOperationsDto {
  @IsUUID() idempotencyKey!: string;
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedRevision!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => MandateOperationDecisionDto)
  decisions!: MandateOperationDecisionDto[];
}
