import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MaxLength(150) companyName?: string;
  @IsOptional() @IsString() @MaxLength(50) companyPhone?: string;
  @IsOptional() @IsString() @MaxLength(200) companyEmail?: string;
  @IsOptional() @IsString() @MaxLength(300) companyAddress?: string;
  @IsOptional() @IsString() @MaxLength(300) companyWebsite?: string;
  @IsOptional() @IsString() @MaxLength(300) companyTagline?: string;
  @IsOptional() @IsString() @MaxLength(100) companyLicense?: string;
  @IsOptional() @IsString() @MaxLength(100) title?: string;
  @IsOptional() @IsString() @MaxLength(50) phoneDirect?: string;
  @IsOptional() @IsString() @MaxLength(50) phoneMobile?: string;
  @IsOptional() @IsString() @MaxLength(150) certification?: string;
  @IsOptional() @IsString() @MaxLength(100) province?: string;
}
