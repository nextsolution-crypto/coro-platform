import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskListDto {
  @IsString() @MaxLength(160) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) documentTypes?: string[];
}

export class UpdateTaskListDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) documentTypes?: string[];
}

export class AddTaskListTemplateDto {
  @IsString() @MaxLength(120) categoryName: string;
  @IsString() @MaxLength(300) taskTitle: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
}
