import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(80) province?: string;
  @IsOptional() @IsString() @MaxLength(3_000_000) logoBase64?: string;
  @IsOptional() @IsString() @MaxLength(120) contactFirstName?: string;
  @IsOptional() @IsString() @MaxLength(120) contactLastName?: string;
  @IsOptional() @IsEmail() @MaxLength(254) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(80) province?: string;
  @IsOptional() @IsString() @MaxLength(120) contactFirstName?: string;
  @IsOptional() @IsString() @MaxLength(120) contactLastName?: string;
  @IsOptional() @IsEmail() @MaxLength(254) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
}

export class UpdateClientLogoDto {
  @IsOptional() @IsString() @MaxLength(3_000_000) logoBase64?: string | null;
}
