import {
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class CreateQrCodeDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Length(2, 64)
  slug!: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  destinationUrl!: string;

  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class UpdateQrCodeDto {
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  destinationUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsString()
  @Length(3, 500)
  reason!: string;
}
