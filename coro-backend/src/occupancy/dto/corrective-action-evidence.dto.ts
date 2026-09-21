import { IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CorrectiveActionEvidenceType, CorrectiveActionSystemReferenceType, CorrectiveActionVerificationVerdict } from '@prisma/client';

export class EvidenceBaseDto {
  @IsUUID() clientIntentId!: string;
  @IsString() @MinLength(1) @MaxLength(300) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
}

export class CreateNoteEvidenceDto extends EvidenceBaseDto {
  @IsString() @MinLength(1) @MaxLength(10000) noteText!: string;
}

export class CreateLinkEvidenceDto extends EvidenceBaseDto {
  @IsUrl({ protocols: ['https'], require_protocol: true, require_valid_protocol: true })
  @MaxLength(2000)
  externalUrl!: string;
}

export class CreateSystemReferenceEvidenceDto extends EvidenceBaseDto {
  @IsEnum(CorrectiveActionSystemReferenceType) systemReferenceType!: CorrectiveActionSystemReferenceType;
  @IsUUID() systemReferenceId!: string;
}

export class CreateFileEvidenceDto extends EvidenceBaseDto {
  @IsEnum(CorrectiveActionEvidenceType) type!: CorrectiveActionEvidenceType;
}

export class WithdrawEvidenceDto {
  @IsString() @MinLength(1) @MaxLength(2000) withdrawalReason!: string;
}

export class CompleteCorrectiveActionDto {
  @IsOptional() @IsString() @MaxLength(5000) completionComment?: string;
}

export class VerifyCorrectiveActionDto {
  @IsUUID() clientIntentId!: string;
  @IsEnum(CorrectiveActionVerificationVerdict) verdict!: CorrectiveActionVerificationVerdict;
  @IsOptional() @IsString() @MaxLength(5000) comment?: string;
}

export class CloseCorrectiveActionDto {
  @IsOptional() @IsString() @MaxLength(5000) closureComment?: string;
}
