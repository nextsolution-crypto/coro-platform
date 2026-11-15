import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { DisplayPermission } from '@prisma/client';

export class UpdateDisplayAuthorityDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(DisplayPermission, { each: true })
  displayPermissions!: DisplayPermission[];

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  displayBuildingIds!: string[];

  @IsString()
  @MinLength(10)
  reason!: string;
}
