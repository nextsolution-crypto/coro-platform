import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class ExerciseReportTransitionDto {
  @IsInt() @Min(0) lockVersion!: number;
  @IsUUID() requestId!: string;
  @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
}

export class ExerciseReportPortfolioQueryDto {
  @IsOptional() @IsUUID() portfolioId?: string;
  @IsOptional() @IsUUID() regionId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) limit = 100;
}

export class PublishExerciseReportTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  code!: string;
  @IsString() @MinLength(3) @MaxLength(160) name!: string;
  @ArrayMinSize(1)
  @ArrayMaxSize(32)
  @IsString({ each: true })
  sections!: string[];
  @IsUUID() requestId!: string;
  @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
  @IsOptional() @IsUUID() organizationId?: string;
}
