import { OperationalReviewReportSupersessionReason } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SupersedeReportDto {
  @IsEnum(OperationalReviewReportSupersessionReason)
  reason!: OperationalReviewReportSupersessionReason;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment!: string;
}
