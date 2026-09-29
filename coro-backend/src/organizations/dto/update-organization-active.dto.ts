import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrganizationActiveDto {
  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
