import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return value;
  return typeof value === 'string' ? new Date(value) : undefined;
};

export class AuditQueryDto extends PageQueryDto {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
  @IsOptional() @IsString() actorUserId?: string;
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => toDate(value as unknown))
  @IsDate()
  from?: Date;
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => toDate(value as unknown))
  @IsDate()
  to?: Date;
  @IsOptional() @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'desc';
}
