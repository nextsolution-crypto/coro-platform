import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrganizationLicenseDto {
  @IsIn(['ESSAI_GRATUIT', 'STANDARD', 'ENTREPRISE'])
  licenseType: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
