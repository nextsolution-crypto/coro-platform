import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEmpty,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class CreateBuildingDto {
  @IsEmpty() organizationId?: never;
  @IsEmpty() isActive?: never;
  @IsEmpty() role?: never;
  @IsEmpty() id?: never;
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsString() @MinLength(1) @MaxLength(300) address!: string;
  @IsString() @MinLength(1) @MaxLength(120) city!: string;
  @IsString() @MinLength(1) @MaxLength(80) province!: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(500) floors?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) units?: number;
  @IsOptional() @IsString() @MaxLength(100) buildingType?: string;
  @IsUUID() clientId!: string;
  @IsOptional() @IsString() @MaxLength(100) timeZone?: string;
  @IsOptional() @IsString() @MaxLength(120) responsableFirstName?: string;
  @IsOptional() @IsString() @MaxLength(120) responsableLastName?: string;
  @IsOptional() @IsString() @MaxLength(120) responsableTitre?: string;
  @IsOptional() @IsEmail() @MaxLength(254) responsableEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) responsablePhone?: string;
  @IsOptional() @IsString() @MaxLength(14_000_000) photoBase64?: string;
}

export class UpdateBuildingDto {
  @IsEmpty() organizationId?: never;
  @IsEmpty() isActive?: never;
  @IsEmpty() role?: never;
  @IsEmpty() id?: never;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) province?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(500) floors?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) units?: number;
  @IsOptional() @IsString() @MaxLength(100) buildingType?: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsString() @MaxLength(100) timeZone?: string;
  @IsOptional() @IsString() @MaxLength(120) responsableFirstName?: string;
  @IsOptional() @IsString() @MaxLength(120) responsableLastName?: string;
  @IsOptional() @IsString() @MaxLength(120) responsableTitre?: string;
  @Transform(emptyToNull)
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsEmail()
  @MaxLength(254)
  responsableEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(40) responsablePhone?: string;
  @IsOptional() @IsString() @MaxLength(14_000_000) photoBase64?: string;
}
