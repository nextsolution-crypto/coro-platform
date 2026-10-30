import { Type } from 'class-transformer';
import {
  IsInt,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class TimelogRangeDto {
  @IsDateString({ strict: true })
  @Matches(CIVIL_DATE)
  from!: string;

  @IsDateString({ strict: true })
  @Matches(CIVIL_DATE)
  to!: string;
}

export class CreateTimelogEntryDto {
  @IsDateString({ strict: true })
  @Matches(CIVIL_DATE)
  date!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(Number.MIN_VALUE)
  heures!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsUUID()
  clientRequestId!: string;
}

export class UpdateTimelogEntryDto {
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(Number.MIN_VALUE)
  heures!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  lockVersion!: number;
}

export class DeleteTimelogEntryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lockVersion!: number;
}

export class CreateTimelogCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(120) key!: string;
  @IsString() @IsNotEmpty() @MaxLength(300) label!: string;
}

export class UpdateTimelogCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(300) label!: string;
}
