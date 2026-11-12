import {
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateWebActivationDto {
  @IsInt()
  @Min(60)
  @Max(900)
  ttlSeconds = 600;
}

export class ActivateWebDisplayDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  keyId!: string;

  @IsObject()
  publicKeyJwk!: Record<string, unknown>;
}

export class ConfirmWebDisplayDto {
  @IsUUID()
  publicationId!: string;

  @IsInt()
  @Min(1)
  version!: number;
}

export class RevokeWebSessionDto {
  @IsString()
  @Length(3, 500)
  reason!: string;
}
