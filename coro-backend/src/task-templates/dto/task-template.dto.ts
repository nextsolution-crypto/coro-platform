import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskTemplateDto {
  @IsString() @MaxLength(120) categoryName: string;
  @IsString() @MaxLength(300) taskTitle: string;
  @IsOptional() @IsArray() @IsString({ each: true }) documentTypes?: string[];
  @IsOptional() @IsInt() @Min(0) order?: number;
}

export class UpdateTaskTemplateDto {
  @IsOptional() @IsString() @MaxLength(120) categoryName?: string;
  @IsOptional() @IsString() @MaxLength(300) taskTitle?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) documentTypes?: string[];
  @IsOptional() @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
