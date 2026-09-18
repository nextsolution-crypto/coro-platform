import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CANADIAN_PROVINCE_CODES } from '../../geocoding/geocoding.types';
import type { CanadianProvinceCode } from '../../geocoding/geocoding.types';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ResolvePopulationLocationDto {
  @IsString()
  @MinLength(20)
  accessToken: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressLine: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(CANADIAN_PROVINCE_CODES)
  province: CanadianProvinceCode;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(
    /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
  )
  postalCode?: string;
}
