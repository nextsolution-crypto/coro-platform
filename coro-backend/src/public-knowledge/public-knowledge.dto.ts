import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class PublicKnowledgeQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2_000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  question!: string;

  @IsIn(['fr-CA', 'en-CA'])
  language!: 'fr-CA' | 'en-CA';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  limit = 5;
}
