import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trimmed = () => Transform(({ value }) => typeof value === 'string' ? value.trim() : value);

export class AddIncidentLogDto {
  @IsString()
  @trimmed()
  @MinLength(1)
  @MaxLength(160)
  action!: string;

  @IsOptional()
  @IsString()
  @trimmed()
  @MaxLength(4000)
  details?: string;
}

export class ResolveIncidentDto {
  @IsString()
  @trimmed()
  @MinLength(1)
  @MaxLength(4000)
  closingNotes!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lockVersion?: number;
}

export class ContainIncidentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  lockVersion?: number;
}

export class UpdateIncidentRexDto {
  @IsOptional() @IsString() @MaxLength(12000) rexWentWell?: string;
  @IsOptional() @IsString() @MaxLength(12000) rexToImprove?: string;
  @IsOptional() @IsString() @MaxLength(12000) rexRecommendations?: string;
  @IsOptional() @IsString() @MaxLength(12000) rexCorrectiveActions?: string;
}
