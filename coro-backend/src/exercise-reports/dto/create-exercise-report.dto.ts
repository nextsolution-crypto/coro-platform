import { IsOptional, IsUUID } from 'class-validator';

export class CreateExerciseReportDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  incidentEventId?: string;

  @IsOptional()
  @IsUUID()
  evacuationEventId?: string;
}
