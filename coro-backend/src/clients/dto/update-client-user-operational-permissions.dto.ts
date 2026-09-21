import { ArrayUnique, IsArray, IsEnum, IsOptional } from 'class-validator';
import {
  CorrectiveActionPermission,
  OperationalReviewPermission,
} from '@prisma/client';

export class UpdateClientUserOperationalPermissionsDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(OperationalReviewPermission, { each: true })
  operationalReviewPermissions?: OperationalReviewPermission[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(CorrectiveActionPermission, { each: true })
  correctiveActionPermissions?: CorrectiveActionPermission[];
}
