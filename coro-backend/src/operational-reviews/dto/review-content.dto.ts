import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewFindingCategory, ReviewFindingSeverity, ReviewFindingStatus, ReviewRecommendationPriority, ReviewRecommendationStatus } from '@prisma/client';

export class CreateReviewFindingDto {
  @IsEnum(ReviewFindingCategory) category!: ReviewFindingCategory;
  @IsString() @MaxLength(500) title!: string;
  @IsString() @MaxLength(10000) description!: string;
  @IsEnum(ReviewFindingSeverity) severity!: ReviewFindingSeverity;
  @IsOptional() @IsString() @MaxLength(5000) impact?: string;
}
export class UpdateReviewFindingDto {
  @IsOptional() @IsEnum(ReviewFindingCategory) category?: ReviewFindingCategory;
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsEnum(ReviewFindingSeverity) severity?: ReviewFindingSeverity;
  @IsOptional() @IsString() @MaxLength(5000) impact?: string;
}
export class ChangeReviewFindingStatusDto { @IsEnum(ReviewFindingStatus) status!: ReviewFindingStatus; }

export class CreateReviewRecommendationDto {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsString() @MaxLength(10000) description!: string;
  @IsOptional() @IsEnum(ReviewRecommendationPriority) priority?: ReviewRecommendationPriority;
  @IsOptional() @IsString() @MaxLength(5000) rationale?: string;
}
export class UpdateReviewRecommendationDto {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsEnum(ReviewRecommendationPriority) priority?: ReviewRecommendationPriority;
  @IsOptional() @IsString() @MaxLength(5000) rationale?: string;
}
export class DecideReviewRecommendationDto {
  @IsEnum(ReviewRecommendationStatus) status!: ReviewRecommendationStatus;
  @IsOptional() @IsString() @MaxLength(5000) decisionComment?: string;
}
